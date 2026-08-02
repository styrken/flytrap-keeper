# Flytrap Keeper 🪴

A cozy 3D browser game about caring for carnivorous plants — water your Venus flytrap with rainwater, catch flies for it, find the right windowsill, and watch it grow from seed to flowering plant. Blocky, chunky visuals in the spirit of Roblox/Minecraft.

English-first with translation support. Progress is saved locally, with optional cloud sync via a lightweight account (username + password, no email). Hosted on Vercel (game + API).

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

Vite · React · TypeScript · react-three-fiber + drei (Three.js) · Zustand · i18next · Vitest. The game is a pure SPA; the cloud-save API (phase 3) will live in `/api` as Vercel serverless functions. All game logic goes in `src/sim/` as pure functions with no DOM/Three.js dependencies — the 3D scene is a thin view layer.

Placeholder 3D props are generated programmatically (`scripts/generate-props.mjs`); real voxel models (e.g. MagicaVoxel exports) can replace them 1:1 in `public/models/`.

## Deployment (Vercel)

One-time setup by the repo owner: import this repository at [vercel.com/new](https://vercel.com/new) — the Vite framework preset is auto-detected, no configuration needed. After that, every push to the default branch deploys to production and every pull request gets its own preview URL.

## Status

- [x] Scope and implementation plan
- [x] Phase 0 — foundation (Vite + React + react-three-fiber, GLB pipeline, i18n, CI) — _remaining: one-time Vercel import, see Deployment_
- [x] Phase 1 — MVP: one plant you can care for, in 3D, saved locally
- [ ] Phase 2 — game feel: fly-catching minigame, weather, sound, tutorial
- [ ] Phase 3 — account & cloud sync (username + password, no email)
- [ ] Phase 4 — collection: more species, currency, greenhouse
- [ ] Phase 5 — seasons, dormancy, flowering, Danish translation
