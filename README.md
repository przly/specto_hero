# Specto — Hero Scroll Animation

React 19 + Vite implementation of the Specto hero section, built to prototype a set of
scroll-driven animations before they get ported into the static production page. This
README documents the mechanics of each animation precisely enough to rebuild them with
any stack — the numbers and trigger points are what matter, not the specific library.

Reference Figma frames: "Initial State" (node `5370:9133`) → "Scrolled into view" (node
`5370:9124`), file `1AKutGdExY8tNB1WLkVnSk`.

## Getting started

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build to dist/
npm run lint      # oxlint
```

## Animations

This project uses [motion.dev](https://motion.dev) (`useScroll` + `useTransform`), but
every effect below is described as a plain formula so it's implementable with any scroll
library, native CSS scroll-timelines, or an `IntersectionObserver` + `scroll` listener.

### 1. Video frame grows on scroll

Source: `src/components/Hero.tsx` (`extraInset`, `width`), `Hero.css` (`.hero-video-frame`, `.hero-video`).

The video sits in normal page flow (not pinned/sticky) below the hero heading. As the
page scrolls, its container widens from a narrow, inset box to a near-full-bleed one.

**Scroll range → progress (0 → 1):**
- `progress = 0` at the scroll position where the video's **top edge sits 24px above
  the bottom of the viewport** (only a 24px sliver is visible, poking up from below the fold).
- `progress = 1` at the scroll position where the video's top edge has scrolled up to
  **40% of the viewport height from the top**.
- Progress is clamped to `[0, 1]` outside that range (stays at its resting value before/after).

**What animates — a horizontal inset, in px:**
```
inset(progress) = 96 - 96 * progress        // 96px at progress 0, 0px at progress 1
```
This `inset` stacks on top of a **fixed 24px page margin** already applied to the video's
parent frame (`padding: 24px` on `.hero-video-frame`), so the effective margin from the
viewport edge is:
- At `progress = 0`: `24px + 96px / 2 = 72px` on each side.
- At `progress = 1`: `24px + 0 = 24px` on each side.

Concretely: `video.style.width = calc(100% - inset(progress)px)`, centered inside the frame.

**Height is never animated directly** — it's derived automatically from `aspect-ratio`:
- Desktop: `16 / 9`
- Mobile (viewport ≤ 767px): `1 / 1`

Border-radius stays constant at `24px` throughout — it does not animate.

### 2. Video footage zooms out on scroll

Source: `src/components/Hero.tsx` (`scale`), `Hero.css` (`.hero-video-media`).

Uses the **same `progress` (0 → 1)** as animation #1 (same scroll range, same trigger points).
The `<video>` element itself — not its frame — is scaled via CSS `transform`:
```
scale(progress) = 1.4 - 0.4 * progress      // 140% at progress 0, 100% at progress 1
```
The frame around it has `overflow: hidden` with the same `24px` border-radius, so the
zoomed footage is clipped cleanly to the rounded frame — only the footage zooms, the
frame's shape never distorts. The video uses `object-fit: cover` so it fully fills the
frame regardless of the frame's own size changing.

### 3. Hero image + "Get to know us" hint parallax

Source: `src/components/Hero.tsx` (`imageParallaxY`), `Hero.css` (`.hero-copy-image`, `.hero-scroll-hint`).

Uses **raw window scroll position in px** (`scrollY`) — not the 0–1 progress from
animations #1/#2. Both the hero headline image and the "Get to know us ↓" hint text
below it are pushed down by:
```
translateY = scrollY * 0.15
```
Net effect: for every `Δ`px the user scrolls, these two elements only move up the
screen by `Δ * 0.85`px instead of the full `Δ`px everything else moves — they lag
behind, reading as sitting on a plane further back than the rest of the page.

- The factor (`0.15`) is a tunable constant — `0` = fully pinned in place, `1` = normal
  scroll speed (no parallax).
- Both elements are given a **lower stacking order (`z-index`)** than the elements below
  them (the video frame), so if the lag ever causes visual overlap, they render behind
  rather than on top of the video.

### 4. Reduced-motion behavior

Source: `src/components/Hero.tsx` (`prefersReducedMotion`).

For users with the OS "reduce motion" preference enabled, animations **#1–#3 above are
disabled entirely** rather than made instant — instead of tracking scroll, every value
is pinned permanently to its resting/end state:
- Video renders at its full final size (`24px` margins, `16:9` / `1:1` aspect) from the start.
- Video footage renders at `100%` scale (no zoom-in).
- The hero image and hint sit with zero parallax offset.

The autoplaying, looping background video is also explicitly **paused** (rather than
looping silently) for these users.

## Visual detail worth matching (not an animation)

Both the video frame and the navbar pill use a `0.5px` border rendered as a **top-to-bottom
gradient** — white at 20% opacity at the top, fading to 8% opacity at the bottom — rather
than a flat single-color border.

Since a plain CSS `border-color` can't take a gradient, this uses a two-layer
`background-image` trick: a solid fill clipped to the `padding-box`, and the gradient
clipped to the `border-box`, with the actual `border` set to `0.5px solid transparent`
(see `.hero-video` in `Hero.css` / `.navbar` in `Navbar.css` for the exact CSS).

## Source map

| File | Contains |
| --- | --- |
| `src/components/Hero.tsx` / `Hero.css` | Hero layout, video grow/zoom, image + hint parallax |
| `src/components/Navbar.tsx` / `Navbar.css` | Fixed navbar, gradient border |
| `src/App.tsx` | Page composition |
