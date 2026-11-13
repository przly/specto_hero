/* Tiny TypeScript tokenizer for the code card. Not a parser: one
   sticky regex pass that is good enough for what a visitor types in a few
   lines (keywords, types, strings, template literals, numbers, comments,
   function calls). Unterminated strings / block comments run to the end of
   the line / text, like an editor's highlighter mid-typing. */

export type TokenKind =
  | 'comment'
  | 'string'
  | 'number'
  | 'keyword'
  | 'type'
  | 'function'
  | 'constant'
  | 'punctuation'
  | 'plain'

export type Token = { kind: TokenKind; text: string }

const KEYWORDS = new Set([
  'abstract', 'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'declare', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'finally', 'for', 'from',
  'function', 'get', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'is', 'keyof', 'let',
  'namespace', 'new', 'of', 'private', 'protected', 'public', 'readonly', 'return', 'satisfies', 'set',
  'static', 'super', 'switch', 'this', 'throw', 'try', 'type', 'typeof', 'var', 'while', 'with', 'yield',
])

const BUILTIN_TYPES = new Set([
  'any', 'bigint', 'boolean', 'never', 'number', 'object', 'string', 'symbol', 'unknown', 'void',
])

const CONSTANTS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity'])

const TOKEN = new RegExp(
  [
    String.raw`(?<comment>\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*)`,
    String.raw`(?<string>'(?:\\.|[^'\\\n])*'?|"(?:\\.|[^"\\\n])*"?|\`(?:\\[\s\S]|[^\`\\])*\`?)`,
    String.raw`(?<number>\b(?:0[xX][\da-fA-F_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?n?)\b)`,
    String.raw`(?<ident>[A-Za-z_$][\w$]*)`,
    String.raw`(?<space>\s+)`,
    String.raw`(?<punct>[^\w\s$'"\`])`,
  ].join('|'),
  'y',
)

export function tokenize(code: string): Token[] {
  const tokens: Token[] = []
  TOKEN.lastIndex = 0
  let match: RegExpExecArray | null
  while (TOKEN.lastIndex < code.length && (match = TOKEN.exec(code))) {
    const g = match.groups!
    const text = match[0]
    let kind: TokenKind = 'plain'
    if (g.comment) kind = 'comment'
    else if (g.string) kind = 'string'
    else if (g.number) kind = 'number'
    else if (g.punct) kind = 'punctuation'
    else if (g.ident) {
      const rest = code.slice(TOKEN.lastIndex)
      if (KEYWORDS.has(text)) kind = 'keyword'
      else if (CONSTANTS.has(text)) kind = 'constant'
      else if (BUILTIN_TYPES.has(text) || /^[A-Z]/.test(text)) kind = 'type'
      else if (/^\s*(?:<[^>\n]*>)?\s*\(/.test(rest)) kind = 'function'
    }
    const last = tokens[tokens.length - 1]
    if (last && last.kind === kind) last.text += text
    else tokens.push({ kind, text })
  }
  return tokens
}
