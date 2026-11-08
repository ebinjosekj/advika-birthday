# Advika’s Magical Universe

An interactive 3D birthday invitation for **Advika’s 7th Fairy Birthday** — a continuous, scroll-directed
flight through an original floating fairy kingdom, built with React, TypeScript, Three.js / React Three Fiber,
GSAP ScrollTrigger and Motion.

Not deployed anywhere. It runs locally only.


## Run it

```bash
npm install
npm run dev          # http://localhost:5173  (Ctrl+C to stop)
```

Production build and preview:

```bash
npm run build
npm run preview      # http://localhost:4173
```

Tests:

```bash
npm test                       # Vitest + React Testing Library (unit/component)
npx playwright install chrome  # once, if you don't have Chrome; or edit executablePath in playwright.config.ts
npm run test:e2e               # Playwright end-to-end (starts the dev server automatically)
```

> `playwright.config.ts` points at `/usr/bin/google-chrome` with SwiftShader flags so it can run on
> machines without a GPU. On your own computer you can delete the `executablePath` lines to use
> Playwright’s bundled Chromium with your real GPU.

## Useful URL switches

| Switch | Effect |
| --- | --- |
| `?skipIntro=1` | Start in the main world |
| `?quality=high\|medium\|low` | Force a render quality profile |
| `?introSpeed=2` | Play the opening film faster (or slower, e.g. `0.5`) |
| `?renderScale=0.5` | Cap the render resolution (for very slow machines) |
| `?reducedMotion=1` | Same as the OS “reduce motion” setting |
| `?nowebgl=1` | Preview the painted no-WebGL fallback |
| `?demoFail=1` | Demo mode only: make RSVP submissions fail, to see the error state |

## Where things live

- **All event details:** `src/config/eventConfig.ts` (verified against the reference invitation).
- **World geography & camera stations:** `src/config/worldLayout.ts`
- **Scroll → camera (single controller):** `src/animations/sectionTransitions/TransitionManager.ts`
  writes `world.t`; `src/scenes/shared/CameraRig.tsx` is the only thing that moves the camera.
- **Opening film:** `src/animations/cameraTimelines/IntroDirector.ts`
- **3D scenes:** `src/scenes/**`  ·  **Page chapters:** `src/components/**`
- **Sound (synthesised, no audio files):** `src/services/audioEngine.ts`

## RSVP storage (Supabase)

Without credentials the site runs in **local demo mode**: RSVPs are saved in the visitor’s own
browser (`localStorage`) and are clearly labelled as demo. The hosts do **not** receive them.

To store them for real:

1. Create a Supabase project.
2. Run `supabase/migrations/001_rsvps.sql` in the SQL editor. It creates the `rsvps`
   table with CHECK constraints, an idempotency key against double submits, and Row Level Security:
   guests can **insert** RSVPs but never read them.
3. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   (the public anon/publishable key — **never** the service-role key).
4. Restart `npm run dev`. The demo badges disappear and submissions go to Supabase.
5. Read RSVPs in the Supabase dashboard (Table editor → `rsvps`).

Optional hardening for a public launch: put inserts behind an Edge Function with rate limiting / CAPTCHA.

## Assets & credits

Almost everything visual and audible is generated in code:

- 3D models (castle, fairy, cake, book, islands, trees, butterflies) are procedural geometry written for this project.
- Textures (stone, roof tiles, book cover, faces, wings) are painted at runtime on `<canvas>`.
- Sound is synthesised with the Web Audio API.
- Lighting/reflections use the CC0 Poly Haven *sunset* HDRI, clouds a CC0 photographic cloud sprite, and surfaces CC0 scanned normal maps — all via the `@pmndrs/assets` npm package (bundled locally).
- Fonts: Cormorant Garamond and Jost (SIL Open Font License) via `@fontsource`, bundled locally.
- Icons: Lucide (ISC).
