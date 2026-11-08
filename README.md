# Specto — Hero Scroll Animation

React 19 + Vite implementation of the Specto hero section, built to prototype a set of
scroll-driven animations before they get ported into the static production page. This
README documents the mechanics of each animation precisely enough to rebuild them with
any stack — the numbers and trigger points are what matter, not the specific library.

Reference Figma frames: "Initial State" (node `5370:9133`) → "Scrolled into view" (node
`5370:9124`), file `1AKutGdExY8tNB1WLkVnSk`.

## Hero animations

Source: `src/components/Hero.tsx`, `Hero.css`. Built with [motion.dev](https://motion.dev) (`useScroll` + `useTransform`), but every effect is a plain formula.

- **Scroll progress (0 → 1):** `0` when the video's top edge is 24px above the bottom of the viewport, `1` when it reaches 40% of the viewport height from the top. Clamped outside that range.
- **Video frame grows:** `width = calc(100% - (96 - 96·progress)px)`, centred inside the frame's fixed 24px padding, so the side margin goes from 72px to 24px. Height comes from `aspect-ratio` (`16/9` desktop, `1/1` at ≤ 767px). The 24px radius doesn't animate.
- **Footage zooms out:** `scale = 1.4 - 0.4·progress` on the `<video>` itself (`object-fit: cover`), clipped by the frame's `overflow: hidden`.
- **Parallax:** the hero image and the "Get to know us ↓" hint get `translateY = scrollY · 0.15` (raw scroll in px), so they lag behind the page. They sit below the video in `z-index`.
- **Reduced motion:** everything is fixed at its end state (full size, 100% scale, no parallax), and the background video is paused.

## Button component

Source: `src/components/Button/` (`Button.tsx`, `Button.css`, `Icon.tsx`), demo page `/buttons` (`src/pages/ButtonsPage.tsx`).
Copied from `specto-website` (develop @ `9756594`) and changed as follows:

- **Primary border:** the default border is now two stacked 0.5px gradient strokes, drawn
  in the 0.5px gap around the fill (`bg-btn-primary-main`, `Button.css`):
  - top stroke: white `100% → 0%` opacity, top to bottom;
  - under it: black `0% → 50%` opacity, top to bottom.
  It replaces the previous single white `90% → 20%` gradient. Hover, pressed and disabled
  borders are unchanged, and so is the secondary (dark) button.
- **Width only fixed while loading:** the button's width is no longer set in px at rest,
  so `w-full`, phone rotation and labels that wrap now work.
  - Loading start: the width is set to the last resting width, then to the button's
    height (the spinner circle), and `.t-resize` animates between the two.
  - The resting width is recorded by a `ResizeObserver`. It only reads the width and
    never fixes it in place. This is needed because the loading render applies the
    icon-only padding immediately, so measuring at that point would already give the
    narrower width.
  - Loading end: the width animates to the measured natural width, and the px width is
    cleared on `transitionend` / `transitioncancel`.
  - With reduced motion it jumps straight to the end size.
- **Icons are decorative:** `Icon` renders `aria-hidden` instead of `role="img"` plus the
  icon name, so screen readers don't announce "Plus Button ArrowRight". Icon-only buttons
  must have an `aria-label`, and dev builds log a warning when it's missing.
- **Accessible loading state:** the label is no longer `aria-hidden` while loading (it is
  only faded out). A visually hidden `loadingLabel` (default `"Loading"`, new prop) is
  added, so the name reads "Button Loading". The spinner is `aria-hidden`, and
  `aria-busy` stays on the button.
- **No tap flash on mobile:** `-webkit-tap-highlight-color: transparent` on the button, so
  iOS and Android don't flash a grey rectangle over the press scale.
- **`/buttons` phone layout:** below `md` the page switches from the desktop grid to a
  stacked list (one section per variant, a "label · button" row per state). Each section
  also has full-width, full-width-loading and long-label-in-a-narrow-column cases for
  testing on a device.

## Service card

Source: `src/components/ServiceCard.tsx` / `ServiceCard.css`, `HoverVideo.tsx` / `HoverVideo.css`,
`serviceItems.ts`; demo page `/service-card` (`src/pages/ServiceCardPage.tsx`).

- **Line colors:** the divider is `--color-gray-800`. The hover line drawn over it is
  `--color-gray-600` (was a hardcoded `rgb(255 255 255 / 0.15)`).
- **Line direction:** the line grows from the edge the cursor came in through. Entering
  through the top or bottom edge always grows it left → right. On leave it shrinks toward
  the side the cursor exits on.
- **Video plays forward on hover, backward on leave:**
  - Safari plays backwards natively (negative `playbackRate`).
  - Chrome and Firefox step `currentTime` back every frame.
  - A very quick hover always returns to the first frame. The rewind waits for `play()`
    to settle and always ends with a seek to 0, because Safari can report `currentTime`
    0 while still showing a later frame.
- **Scrolling under a resting cursor:** browsers don't send hover events when content
  scrolls under the mouse, so the page remembers the last mouse position. On scroll,
  each card checks whether the element under that point belongs to it, and starts or
  stops.
- **Touch screens (`hover: none`):** a card plays while it crosses the middle of the
  viewport and plays backwards once it scrolls past. This uses an `IntersectionObserver`
  with `rootMargin: -50% 0px -50% 0px`. Taps don't trigger the card.
- **Poster frames:** each video has a first-frame `*-poster.webp` (7–12 KB), because iOS
  draws nothing for a video that hasn't played. It's an `<img>` over the video, not the
  `poster` attribute. iOS drops that attribute as soon as `play()` is called, so it
  blinked. The image is removed once the video has drawn a frame of its own
  (`requestVideoFrameCallback`).
- **`/service-card` scroll room:** a full viewport of empty space above and below the
  grid, for testing scroll and touch playback.

## Source map

| File | Contains |
| --- | --- |
| `src/components/Hero.tsx` / `Hero.css` | Hero layout, video grow/zoom, image + hint parallax |
| `src/components/Navbar.tsx` / `Navbar.css` | Fixed navbar, gradient border |
| `src/components/ServiceCard.tsx` / `ServiceCard.css` | Service card: hover line, hover/scroll/touch triggers |
| `src/components/HoverVideo.tsx` / `HoverVideo.css` | Forward/backward video playback, poster overlay |
| `src/App.tsx` | Page composition |
