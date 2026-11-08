# QA report — Advika’s Magical Universe

Date: 7 November 2026 · Local only, nothing deployed.

## Reference check

Every detail was checked against the reference invitation (`index.html` in the public `aswanidev6119/Advika_birthday` repo; the github.io page itself couldn't be fetched from this sandbox). **No discrepancies.** Name, age, date, 6:00 PM, Pastel Shades, the Evoke Apartments address, the 20 November RSVP deadline, both phone numbers, and the invitation and closing messages all match.

Two small notes:
- The reference site's calendar file uses a 3-hour event, but the invitation advertises no end time. The length is set in `calendarDurationMinutes` (default 180).
- The reference offers SMS and call links but no WhatsApp. WhatsApp links were added because the brief asked for them. Nobody has confirmed that these numbers use WhatsApp.

## Test results

| Suite | Result |
| --- | --- |
| Vitest + React Testing Library | **36 / 36 passed** (6 files) |
| Playwright end-to-end | **40 / 40 passed.** Final full run: 39 passed, 1 failed. The failure was the keyboard-scroll test, a test-environment issue explained below. After the fix it passed on its own run. The intro and reduced-motion tests were run again after the last camera tweak and passed. |
| TypeScript strict | passes |
| Production build | passes. Main chunk 185 kB gzip; 3D chunk 323 kB gzip, lazy-loaded |

The 40 end-to-end tests cover:
- **A · app:** loading, no console errors or uncaught exceptions, no failed requests or broken images.
- **B · intro:** book opens, fairy appears, camera travels more than 100 units, doors open, reveal text shows. Also skip at the start, skip mid-journey, repeated clicks, sound off by default, sound toggle and volume.
- **C · transitions:** every chapter reaches its camera stop going forward and back. Also fast scrolling to the end and back, mouse wheel, keyboard, touch swipe, interruptible navigation, no NaN or frozen camera, and no overlapping panels.
- **D · functionality:** countdown values with a fixed clock, the "magic has begun" state, the visitor's own timezone (Asia/Kolkata), RSVP validation, loading, success and failure, double-submit protection, tel/WhatsApp/SMS/Maps links, copying the address to the clipboard, the .ics download and its contents, wishes (validation, safe rendering, staying after a reload), all five hidden surprises, and the quick-details chip.
- **E · responsive:** 390×844, 430×932, 768×1024, 1440×900 and 1920×1080. Checks no horizontal overflow, panels inside the viewport, headings not clipped, tap targets at least 40 px, and the menu and RSVP reachable.
- **F · accessibility:** axe finds no serious or critical issues. Also skip link, visible focus, keyboard-only RSVP, form labels and error announcements, accessible names, the canvas hidden from screen readers, and reduced motion.
- **G · performance and fallback:** load, asset sizes, frame rate, memory, GPU-resource leak check, the no-WebGL fallback, and the low profile on phones.

### Real bugs the tests found (all fixed)
1. **Phones couldn't scroll over the 3D world.** React Three Fiber sets `touch-action: none` on the canvas, so swipes on the world were swallowed. Fixed with `pan-y`.
2. **GPU memory leak.** Each chapter change rebuilt 2 firefly geometries because array props were inline, so every render created new ones. The section-reactive parts were moved into small components and the props hoisted. GPU resources now stay flat at 415 geometries and 24 textures over repeated round trips.
3. **Butterflies and lanterns jumped** when changing chapters (same cause as #2).
4. **The intro could skip story beats** after a long frame hitch. GSAP lag smoothing now caps each step at 0.5 s.
5. **A wish error message stayed after the guest fixed their text.**
6. **The guide butterfly lagged far off-screen on slow devices.** Its follow speed was tied to frame rate, so it couldn't be tapped.
7. **An empty wish list was invalid ARIA**, and the night panels had low contrast.
8. **Sound toggle could hang** on devices without an audio output.
9. **Trees blocked the cake** at high quality, and the original depth-of-field setup drew a blank frame. Fixed with a tree keep-out area and a fixed focus distance.

### Test-environment notes (not app bugs)
- The sandbox has no GPU. Chrome draws with **SwiftShader at roughly 0.2–2 fps**, so tests use `?quality=low&renderScale=0.4` and long timeouts.
- At that frame rate, Chrome's animated keyboard scroll never gets enough frames to move. The suite runs with `--disable-smooth-scrolling`; the app's keyboard scrolling was checked to work with it.
- CDP's `synthesizeScrollGesture` does nothing in this headless setup, so the touch test sends real touch events instead.

## Performance observations
- First paint at about 0.7–1.6 s (DOM ready). The world is fully built and the book shown at about 19–21 s **on the software renderer**. Expect a few seconds on real GPUs; this hasn't been measured.
- **About 546 draw calls** at the low profile. The castle, fairy and book are made of many separate meshes. Merging castle parts would be the next optimisation.
- JS heap is stable after a full round trip (132 → 134 MB in dev mode).
- Quality profiles: high (2× DPR, soft shadows, bloom + depth of field + MSAA), medium, and low (no post-processing, fewer particles and grass). Phones and software renderers start at low. If the frame rate drops, PerformanceMonitor steps down one level. **60 fps on desktop could not be verified here.**

## Remaining limitations
- **No rigged fairy, castle or other GLB models.** The sandbox can only reach package registries, so every 3D asset is procedural geometry written for this project. The fairy is stylised (painted face, spring-animated hair, iridescent flapping wings, procedural rig), not a realistic character model. Swapping in licensed GLB models would be the biggest visual upgrade.
- When quality steps down at runtime, the post-processing swap can show a blank frame or two.
- Clouds are layered billboards, not true volumetric clouds. "Volumetric" light uses additive shafts.
- The look on real phones and GPUs hasn't been seen. It was only rendered in software here.

## Modes and credentials
- **Local demo mode (current):** RSVPs and wishes are saved in the visitor's browser only, with a clear "Demo mode" label. The hosts don't receive them.
- **Needs credentials:** real RSVP and wish storage needs Supabase. Run `supabase/migrations/001_rsvps_and_wishes.sql`, then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`. RLS makes RSVPs insert-only for guests. The service-role key is never used in the browser.
- No other external credentials are needed. Maps, WhatsApp and calendar work without them.

