# Changelog

## Unreleased

- **Face shapes.** New `shape` option, `setShape()` and `registerShape()`. Six character shapes join the npcrew `square` (still the default): `shield`, `ghost`, `cat`, `circle` (with a little moon), `drop` and `crown`, drawn from the npcrew brand sketches. Aliases include Chinese ones such as `猫咪` and `皇冠`. Each shape tunes its own visor, eye placement and size, head pivot and z z z anchor. Switching morphs the helmet (outlines are resampled to 120 points from a shared start; detached dots grow or shrink in place) and snaps under reduced motion. Custom outlines can be SVG path data (parsed without the DOM), rounded polygons or ellipses (`ShapeDef`), plus optional `dots`.
- `npface-react`: `shape` prop.
- Demo: Face shapes section with an auto-morphing showcase, a shape picker in the playground, a shape switcher in the States gallery, and mixed shapes in the crew. Also fixed phone-width overflow caused by long code lines, and header wrapping at 1280 px.

## 0.1.0 — 2026-08-20

Initial release.

- `npface` core: helmet avatar renderer (flat 2D rounded-square helmet), 13 states (`sleep, wake, idle, blink, happy, proud, thinking, search-docs, search-web, working, waiting, error, sad`), name normalisation (`searchDocs` → `search-docs`), aliases, custom states (`registerState`, `extends`), springs, blink/breath/glance rhythm, motion primitives (`sine`, `sweep`, `wander`, `glance`, `keys`), entry sequences, `pulse()`, pointer gaze / `look()`, light & dark palettes, reduced-motion mode, off-screen pause, shared rAF ticker.
- `npface-react`: `<Npface />` component with imperative handle, `useNpface()` hook.
- Demo gallery / playground (Vite + React + Tailwind), GitHub Pages workflow, CI (lint · types · build · test · size budget).
