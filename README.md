# Flytrap Keeper 🪴

A cozy 3D browser game about caring for carnivorous plants — water your Venus flytrap with rainwater, catch flies for it, find the right windowsill, and watch it grow from seed to flowering plant. Blocky, chunky visuals in the spirit of Roblox/Minecraft.

English and Danish, with translation support for more. Progress is saved locally, with optional cloud sync via a lightweight account (username + password, no email). Hosted on Vercel (game + API).

Scope, mechanics, technical architecture and roadmap live in **[PLAN.md](PLAN.md)** (in Danish).

## Getting started

```bash
npm install
npm run dev
```

| Script                            | What it does                                           |
| --------------------------------- | ------------------------------------------------------ |
| `npm run dev`                     | Start the dev server                                   |
| `npm run build`                   | Typecheck and build for production                     |
| `npm run preview`                 | Serve the production build locally                     |
| `npm test`                        | Run the test suite (Vitest)                            |
| `npm run lint` / `npm run format` | Lint / format the code                                 |
| `npm run generate:props`          | Regenerate placeholder GLB props into `public/models/` |

## Tech

Vite · React · TypeScript · react-three-fiber + drei (Three.js) · Zustand · i18next · Vitest. The game is a pure SPA. All game logic lives in `src/sim/` as pure, deterministic functions with no DOM/Three.js dependencies — the 3D scene is a thin view layer, which is why a week of plant care can be unit-tested in milliseconds.

The cloud-save API lives in `/api` as Vercel serverless functions (Node) backed by Postgres. The server is a dumb blob store: accounts are username + password only (no email), passwords are scrypt-hashed, sessions are signed HttpOnly cookies, and a one-time recovery code replaces email resets.

Placeholder 3D props are generated programmatically (`scripts/generate-props.mjs`); real voxel models (e.g. MagicaVoxel exports) can replace them 1:1 in `public/models/`.

## Deployment (Vercel)

One-time setup by the repo owner:

1. Import this repository at [vercel.com/new](https://vercel.com/new) — the Vite framework preset is auto-detected.
2. For cloud sync (optional): create a Postgres database (e.g. Neon via the Vercel Marketplace) and set two environment variables on the project: `DATABASE_URL` (from the database) and `SESSION_SECRET` (any long random string). The schema creates itself on first use.

Without step 2 the game still works fully — the account section simply shows that cloud sync isn't set up, and saves stay on-device (with file export/import as backup).

After setup, every push to the default branch deploys to production and every pull request gets its own preview URL.

## Status

- [x] Scope and implementation plan
- [x] Phase 0 — foundation (Vite + React + react-three-fiber, GLB pipeline, i18n, CI)
- [x] Phase 1 — MVP: one plant you can care for, in 3D, saved locally
- [x] Phase 2 — game feel: fly-catching minigame, weather, sound, tutorial
- [x] Phase 3 — account & cloud sync (username + password, no email) — _code-complete; goes live with the one-time Vercel + database setup above_
- [x] Phase 4 — collection: sundew, tropical pitcher, trumpet pitcher, shop, up to three pots
- [x] Phase 5 — seasons, winter dormancy, flowering, hard mode, Danish translation
- [x] Post-launch — onboarding, pour & golden-drop minigames, daily tasks, start-over button
- [x] Post-launch — full room (walls, bed, desk, second window) and buyable room decor
- [x] Post-launch — a walkable keeper avatar: stroll the room with WASD/arrows (touch joystick on mobile) while the camera follows
- [x] Post-launch — jumping: Space (or the Hop button) hops onto the bed and chair, chair → desk works, and the bed is bouncy
