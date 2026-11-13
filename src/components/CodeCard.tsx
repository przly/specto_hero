import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from 'react'
import Button from './Button/Button'
import { tokenize } from './tsHighlight'
import gitBranch from '../assets/git-branch.svg'
import './CodeCard.css'

/* "Your project" card media (Figma 6857:153183, Code 3): a fake code editor
   the visitor can type into. A transparent <textarea> sits over a <pre> that
   renders the same text with TypeScript highlighting, so selection, undo,
   paste and IME stay native. The native caret is hidden and replaced by a
   drawn one that blinks on a steady loop, focused or not, even while
   typing. The gutter numbers only the lines that exist, the active line number turns
   white and the status bar tracks the caret. */

const INITIAL_CODE = '\n\n\n\n\n// This is a place for your project'
const LINE_HEIGHT_RATIO = 1.8 // line-height in CodeCard.css
const MAX_LINES = 17 // the font scales so exactly this many lines fit (CodeCard.css)

/* Current line height in px: the code font scales with the card. */
function lineHeightOf(el: HTMLElement) {
  return parseFloat(getComputedStyle(el).fontSize) * LINE_HEIGHT_RATIO
}
const TAB_SIZE = 2 // matches tab-size in CodeCard.css
const INDENT = '  ' // what Tab inserts; shown in the status bar

/* Replace the textarea's [start, end) with text through the browser's own
   editing path, so the change lands on the native undo stack (Cmd+Z works)
   and fires a normal input event (React's onChange). */
function insertText(ta: HTMLTextAreaElement, start: number, end: number, text: string) {
  ta.setSelectionRange(start, end)
  if (!document.execCommand('insertText', false, text)) {
    ta.setRangeText(text, start, end, 'end')
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

/* Tab / Shift+Tab like an editor: a caret (or a selection inside one line)
   gets INDENT inserted; a selection over several lines indents or outdents
   every line it touches and stays selected. */
function indent(ta: HTMLTextAreaElement, outdent: boolean) {
  const { value, selectionStart: start, selectionEnd: end } = ta
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const multiline = value.slice(start, end).includes('\n')

  if (!outdent && !multiline) return insertText(ta, start, end, INDENT)

  // Whole lines covered by the selection (a selection ending right at the
  // start of a line doesn't include that line).
  const lastEnd = end > start && value[end - 1] === '\n' ? end - 1 : end
  let blockEnd = value.indexOf('\n', lastEnd)
  if (blockEnd === -1) blockEnd = value.length
  const lines = value.slice(lineStart, blockEnd).split('\n')

  const removed: number[] = []
  const next = lines.map((line) => {
    if (!outdent) return INDENT + line
    const n = line.match(/^ */)![0].length
    removed.push(Math.min(n, INDENT.length))
    return line.slice(removed[removed.length - 1])
  })
  const block = next.join('\n')
  if (block === lines.join('\n')) return

  insertText(ta, lineStart, blockEnd, block)
  if (multiline) ta.setSelectionRange(lineStart, lineStart + block.length)
  else {
    // Single-line outdent: keep the caret where it was in the text.
    const caret = Math.max(lineStart, start - removed[0])
    ta.setSelectionRange(caret, caret)
  }
}

type Caret = { line: number; col: number }

/* Visual width of a run of text in columns: tabs advance to the next stop. */
function columns(text: string) {
  let col = 0
  for (const ch of text) col = ch === '\t' ? col + TAB_SIZE - (col % TAB_SIZE) : col + 1
  return col
}

function caretFrom(value: string, index: number): Caret {
  const before = value.slice(0, index)
  const line = before.split('\n').length - 1
  return { line, col: columns(before.slice(before.lastIndexOf('\n') + 1)) + 1 }
}

/* Selection as one full-line-height rect per line, in columns. A textarea's
   own selection is painted by the browser and can sit off-centre in a tall
   (1.8) line; drawing it ourselves keeps it centred on the line in every
   browser, like the caret and the current-line band. A line the selection
   runs past also covers its newline (one column), as editors show it. */
function selectionRects(value: string, start: number, end: number) {
  if (start === end) return []
  const lines = value.split('\n')
  const a = caretFrom(value, start)
  const b = caretFrom(value, end)
  const rects: { line: number; from: number; to: number }[] = []
  for (let line = a.line; line <= b.line; line++) {
    const from = line === a.line ? a.col - 1 : 0
    const to = line === b.line ? b.col - 1 : columns(lines[line]) + 1
    if (to > from) rects.push({ line, from, to })
  }
  return rects
}

export function CodeCard({ href, cta }: { href: string; cta: string }) {
  const [code, setCode] = useState(INITIAL_CODE)
  const [caret, setCaret] = useState<Caret>(() => caretFrom(INITIAL_CODE, INITIAL_CODE.length))
  const [charWidth, setCharWidth] = useState(0)
  const hintId = useId()
  // Drawn selection (the native one is hidden, see selectionRects).
  const [selection, setSelection] = useState({ start: 0, end: 0 })
  const [focused, setFocused] = useState(false)
  const [hoverLine, setHoverLine] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const charRef = useRef<HTMLSpanElement>(null)

  const tokens = useMemo(() => tokenize(code), [code])
  // Numbers only up to the last line of text, like a real editor.
  const lineCount = code.split('\n').length

  // Measure one monospace advance (incl. letter-spacing) for the drawn caret.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () => {
      setCharWidth((charRef.current?.getBoundingClientRect().width ?? 0) / 10)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    // Geist Mono may load after first layout.
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [])

  // The textarea is sized by the <pre>, so the scroll container (not the
  // textarea) has to follow the caret.
  const keepCaretVisible = useCallback(
    (next: Caret) => {
      const el = scrollRef.current
      if (!el) return
      const pad = parseFloat(getComputedStyle(el).paddingTop) || 0
      const lineHeight = lineHeightOf(el)
      const top = pad + next.line * lineHeight
      if (top < el.scrollTop) el.scrollTop = top - pad
      else if (top + lineHeight > el.scrollTop + el.clientHeight) el.scrollTop = top + lineHeight - el.clientHeight + pad

      const gutter = textareaRef.current?.parentElement?.offsetLeft ?? 0
      const x = gutter + (next.col - 1) * charWidth
      if (x < el.scrollLeft + gutter) el.scrollLeft = Math.max(0, x - gutter)
      else if (x + charWidth * 2 > el.scrollLeft + el.clientWidth) el.scrollLeft = x + charWidth * 2 - el.clientWidth
    },
    [charWidth],
  )

  const syncCaret = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    const { selectionStart: start, selectionEnd: end } = ta
    setSelection((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
    const next = caretFrom(ta.value, ta.selectionDirection === 'backward' ? ta.selectionStart : ta.selectionEnd)
    setCaret((prev) => (prev.line === next.line && prev.col === next.col ? prev : next))
    keepCaretVisible(next)
  }, [keepCaretVisible])

  // selectionchange covers clicks, arrow keys and drag-selecting.
  useEffect(() => {
    const onSelection = () => {
      if (document.activeElement === textareaRef.current) syncCaret()
    }
    document.addEventListener('selectionchange', onSelection)
    return () => document.removeEventListener('selectionchange', onSelection)
  }, [syncCaret])

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value
    // A paste that would overflow the card is dropped (React puts the old
    // value back); Enter is blocked earlier, in onKeyDown.
    const nextLines = next.split('\n').length
    if (nextLines > MAX_LINES && nextLines > lineCount) return
    setCode(next)
    requestAnimationFrame(syncCaret)
  }

  // Hovered line, from the pointer's y: the textarea sits on top of every
  // line, so the rows can't use :hover themselves. Only lines that exist,
  // not the CTA, and not on touch.
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el || e.pointerType === 'touch') return
    if ((e.target as Element).closest('.code-card-cta, .code-card-status')) return setHoverLine(null)
    const pad = parseFloat(getComputedStyle(el).paddingTop) || 0
    const y = e.clientY - el.getBoundingClientRect().top + el.scrollTop - pad
    const line = Math.floor(y / lineHeightOf(el))
    setHoverLine(y >= 0 && line < lineCount ? line : null)
  }

  return (
    <div
      className="code-card"
      onPointerMove={onPointerMove}
      onPointerLeave={() => setHoverLine(null)}
      onPointerDown={(e) => {
        // Clicks on empty editor space (below or right of the text) focus
        // the textarea with the caret at the end, like a real editor.
        const ta = textareaRef.current
        if (!ta || e.target === ta || (e.target as Element).closest('.code-card-cta')) return
        e.preventDefault()
        ta.focus()
        ta.setSelectionRange(ta.value.length, ta.value.length)
      }}
    >
      <div className="code-card-scroll" ref={scrollRef}>
        {/* Current-line highlight (like Cursor / VS Code), behind gutter and text. */}
        <div className="code-card-line" aria-hidden="true" style={{ marginTop: `${caret.line}lh` }} />
        {/* Hover rows: one per line, each fades its own brightening in/out. */}
        <div className="code-card-rows" aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className={i === hoverLine ? 'is-hover' : undefined} />
          ))}
        </div>
        <div className="code-card-gutter" aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className={i === caret.line ? 'is-active' : undefined}>
              {i}
            </div>
          ))}
        </div>

        <div className="code-card-text">
          {/* Drawn selection, behind the highlighted text. */}
          {focused &&
            charWidth > 0 &&
            selectionRects(code, selection.start, selection.end).map((r) => (
              <span
                key={r.line}
                className="code-card-selection"
                aria-hidden="true"
                style={{ top: `${r.line}lh`, left: r.from * charWidth, width: (r.to - r.from) * charWidth }}
              />
            ))}
          <pre className="code-card-highlight" aria-hidden="true">
            {tokens.map((token, i) =>
              token.kind === 'plain' ? token.text : (
                <span key={i} className={`tok-${token.kind}`}>
                  {token.text}
                </span>
              ),
            )}
            {/* Keeps a trailing empty line its height. */}
            {'​'}
          </pre>
          <textarea
            ref={textareaRef}
            className="code-card-input"
            value={code}
            onChange={onChange}
            onFocus={() => {
              setFocused(true)
              syncCaret()
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') e.currentTarget.blur()
              // No new line once the card is full (no scrolling).
              if (e.key === 'Enter') {
                const { value, selectionStart, selectionEnd } = e.currentTarget
                const removed = value.slice(selectionStart, selectionEnd).split('\n').length - 1
                if (lineCount - removed + 1 > MAX_LINES) e.preventDefault()
              }
              // Tab indents instead of moving focus (Esc, then Tab, leaves).
              if (e.key === 'Tab' && !e.altKey && !e.ctrlKey && !e.metaKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                indent(e.currentTarget, e.shiftKey)
              }
            }}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            wrap="off"
            aria-label="Tell us about your project"
            aria-describedby={hintId}
          />
          {charWidth > 0 && (
            <span
              className="code-card-caret"
              aria-hidden="true"
              style={{ translate: `${(caret.col - 1) * charWidth}px ${caret.line}lh` }}
            />
          )}
        </div>
        <span id={hintId} hidden>
          Tab indents. Press Escape, then Tab, to leave the editor.
        </span>
        <span className="code-card-measure" ref={charRef} aria-hidden="true">
          0000000000
        </span>
      </div>

      <div className="code-card-cta">
        <Button asChild modifier="primary" rightIcon="ArrowRight">
          <a href={href}>{cta}</a>
        </Button>
      </div>

      <div className="code-card-status" aria-hidden="true">
        <span>LF</span>
        <span>
          Line {caret.line}:{caret.col}
        </span>
        <span>UTF8</span>
        <span>{INDENT.length} {INDENT.length === 1 ? 'space' : 'spaces'}</span>
        <span className="code-card-branch">
          <img src={gitBranch} alt="" width={12} height={12} />
          main
        </span>
      </div>
    </div>
  )
}
