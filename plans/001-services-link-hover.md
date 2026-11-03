# 001 — Tighten Services link hover timing/easing and add press feedback

- **Status**: DONE
- **Commit**: d483538
- **Severity**: LOW
- **Category**: Easing & duration / Physicality & origin
- **Estimated scope**: 2 files (`src/pages/Services.tsx`, `src/pages/Services.css`), small

## Problem

The `/services` page links (`src/pages/Services.tsx:6-28`, `src/pages/Services.css:16-54`) use a bare
`ease` timing function for both the color change and the underline reveal, and have no press
(`:active`) feedback at all — clicking a link gives zero tactile response before navigation.

```css
/* src/pages/Services.css:16-47 — current */
.services-link {
  position: relative;
  display: inline-block;
  padding-bottom: 2px;
  color: #a1a1a1;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s ease;
}

.services-link:hover {
  color: #0c0c0c;
}

.services-link-underline {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 1px;
  width: 100%;
  background: #0c0c0c;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.15s ease;
}

.services-link:hover .services-link-underline {
  transform: scaleX(1);
}
```

Per AUDIT.md §2 (Easing & duration), a bare `ease` is acceptable for hover/color changes but the
underline reveal is an entering/exiting transform and should use a strong `ease-out` curve, not
the weak built-in `ease`. Per AUDIT.md §3 (Physicality & origin), any pressable/clickable element
should have press feedback (`scale(0.97)` on `:active`), which is currently missing.

## Target

```css
/* target */
.services-page {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
}

.services-link {
  position: relative;
  display: inline-block;
  padding-bottom: 2px;
  color: #a1a1a1;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  text-decoration: none;
  white-space: nowrap;
  transition: color 150ms ease, transform 120ms var(--ease-out);
}

.services-link:hover {
  color: #0c0c0c;
}

.services-link:active {
  transform: scale(0.97);
}

.services-link-underline {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 1px;
  width: 100%;
  background: #0c0c0c;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 160ms var(--ease-out);
}

.services-link:hover .services-link-underline {
  transform: scaleX(1);
}
```

## Repo conventions to follow

- No shared motion-token file exists yet in this repo (`src/components/Navbar.css:63` and
  `src/pages/Services.css` both hand-type durations/easings inline). Scope the new `--ease-out`
  token to `.services-page` rather than inventing a global tokens file, since this plan is scoped
  to this component only.
- Keep the existing `@media (prefers-reduced-motion: reduce)` block (`src/pages/Services.css:49-54`)
  and extend it to also neutralize the new `:active` transform transition.
- The `transform-origin` flip logic in `src/pages/Services.tsx:9-15` (nearest-edge detection) is
  correct and out of scope — do not change it.

## Steps

1. In `src/pages/Services.css`, add `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);` as a custom
   property on the `.services-page` rule (`src/pages/Services.css:1-7`).
2. In `src/pages/Services.css`, change `.services-link`'s `transition` from
   `color 0.15s ease;` to `color 150ms ease, transform 120ms var(--ease-out);`.
3. In `src/pages/Services.css`, add a new `.services-link:active { transform: scale(0.97); }` rule
   directly after the `.services-link:hover` rule.
4. In `src/pages/Services.css`, change `.services-link-underline`'s `transition` from
   `transform 0.25s ease;` (already tightened to `0.15s ease` in a prior session) to
   `transform 160ms var(--ease-out);`.
5. In `src/pages/Services.css`, extend the existing reduced-motion block so `.services-link` (which
   now also transitions `transform`) has its transition fully neutralized — no change needed since
   `transition: none` on `.services-link, .services-link-underline` already covers the new
   `:active` transform (verify this after editing).

## Boundaries

- Do NOT touch `src/components/Navbar.tsx`, `src/components/Navbar.css`, `src/pages/Home.tsx`, or
  any other component.
- Do NOT change markup/structure in `Services.tsx` beyond what's needed — the nearest-edge
  transform-origin logic stays as-is.
- Do NOT add new dependencies or a global tokens file.
- If the current code doesn't match the "current" excerpt above (drift since commit `d483538`),
  stop and report instead of improvising.

## Verification

- **Mechanical**: `npm run build` (or the project's existing typecheck/lint script) completes with
  no new errors.
- **Feel check**: run the dev server, open `/services`, and confirm:
  - Hovering a link: the underline reveals with a quick, responsive snap (not a linear crawl) and
    the text color darkens smoothly.
  - Clicking and holding a link: the text visibly compresses slightly (scale 0.97) before release —
    subtle, not jarring.
  - In DevTools Animations panel at 10% playback speed, the underline's scale-in should visibly
    decelerate into place (ease-out character), not move at constant speed.
  - Toggle `prefers-reduced-motion` (Rendering panel) and confirm the underline/color/press-scale
    transitions are all removed, with color still available as a non-animated state change.
- **Done when**: all four rules above match the "Target" block verbatim and the feel-check items
  are confirmed in-browser.
