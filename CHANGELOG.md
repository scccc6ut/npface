# Changelog

## 0.1.0 — unreleased

Initial release.

- `npface` core: helmet avatar renderer, 12 states (`sleep, wake, idle, blink, happy, proud, thinking, searching, working, waiting, error, sad`), aliases, custom states (`registerState`, `extends`), springs, blink/breath/glance rhythm, motion primitives (`sine`, `sweep`, `wander`, `glance`, `keys`), entry sequences, `pulse()`, pointer gaze / `look()`, light & dark palettes, reduced-motion mode, off-screen pause, shared rAF ticker.
- `npface-react`: `<Npface />` component with imperative handle, `useNpface()` hook.
- Demo gallery / playground (Vite + React + Tailwind), GitHub Pages workflow, CI (lint · types · build · test · size budget).
