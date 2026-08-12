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
- [x] Post-launch — greenhouse: a buyable glass room with three extra bench spots, bright light and humid air
- [x] Post-launch — friends: add by username, chat, and visit each other's rooms read-only (requires a cloud account)
- [x] Post-launch — night life: moths orbit the floor lamp after dark, fireflies visit on some summer nights, and shooting stars grant wishes
- [x] Post-launch — cultivars: three real flytrap rarities ('Justina Davis', 'B52', 'Red Dragon') as rare seeds with their own looks and lexicon facts
- [x] Post-launch — photo mode (postcard snapshots with save/share) and plant accessories: googly eyes that ride the snapping jaw, and a little bow
- [x] Post-launch — pets (zero needs, pure company): a tadpole that metamorphoses into a greenhouse frog, a rainy-day cat you let in at the window, and a snail that moves in after three gentle rescues
- [x] Post-launch — pets, second wave: an autumn spider that keeps a corner web and pays rent in caught bugs, and the ladybird — a lucky guest that strolls the sill and can never, ever be trap food
- [x] Post-launch — garden guests, year round: a robin at a buyable bird feeder (sings even in winter), a spring/summer butterfly that rests safely on blooming flower stalks, and an evening hedgehog on the greenhouse lawn
- [x] Post-launch — step outside: the garden around the house as a walkable third room — lawn with a picket fence and gate, the house facade with its front door, flower beds, an apple tree, a clothesline, a letterbox, and weather in the open (garden-wide rain, sun, clouds and stars). Real doors stitch the world together: walk out through a new bedroom door, back in through the front door, and into the owned greenhouse through its own door
- [x] Post-launch — butterwort as species five: the lime-tolerant exception where tap water doesn't hurt, completing the classic carnivore lineup (and the Full collection achievement)
- [x] Post-launch — the plant diary: every plant journals its milestones, from seed to bloom (and back from the brink), readable via the 📔 button
- [x] Post-launch — SNAP!: a retro arcade game on the desk computer — a growing flytrap tongue, flies to eat, beetles to dodge, a daily pocket-money lid
- [x] Post-launch — full-circle camera: orbit all the way around the keeper in every room — solid backdrops (the window wall, the house facade) duck out of sight while the camera is behind them, the outdoor sky is a drum around the whole lawn with sun, clouds and stars in every direction, and the bedroom gained a fourth wall (the keeper's crayon gallery) that only appears when you look back from inside
- [x] Post-launch — wishes from the youngest playtester: rain about a third of the time, ladybirds strolling the garden flower bed, rain-day snails out on the lawn, slightly quicker digestion, a walk-and-look camera without stutter, a catch quest sized to the plant's trap count (a one-trap sprout gets "catch 1"), and float labels that only promise the dewdrops a tap actually paid
- [x] Post-launch — second round of wishes: ladybirds now live outdoors only (two of them share the flower bed), and the shop sells its first consumable — the fly pack, a buzzing little box whose flies you release wherever you're standing, hungry traps included
- [x] Post-launch — third round of wishes: catching an animal always pays — greeting guests, rescuing snails, golden drops and star wishes reward every single time (the spawn rhythm is pacing enough; only the snail's jar-adoption count keeps its slow cadence) — and the pack shelf grew into a full lineup: mosquito, fly, moth and spider packs, each releasable wherever you stand
- [x] Post-launch — fourth round of wishes: a buyable garden trampoline with real bounce physics (every landing springs back, and jumps timed with the landing pump higher and higher, up to a satisfying cap), plus weekly quests — two chunkier goals drawn every UTC Monday alongside the three dailies, paid at a chunkier rate with a both-done bonus
- [x] Post-launch — the junior playtester's glitch report: no more infinite tap-farming — one reward per visit, everywhere. One-shot catches (golden drops, shooting stars, snails) claim synchronously so extra fingers can't cash them in twice, lingering guests (robin, butterfly, hedgehog) pay one hello per visit and then just sing/flutter/snuffle, and the sim backs it all with repeat windows far shorter than any two real visits — so every genuine catch still pays, every time
- [x] Post-launch — daily luck jars (the family's own balancing idea): every little friend pays from a per-critter daily max that visibly counts down (⏳ in the float label when it runs low, 🌙 once today's jar is empty) and refills at midnight with the quests — greetings, quest progress and adoptions keep working on an empty jar, the tap just stops printing money
