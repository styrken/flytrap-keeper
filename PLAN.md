# Flytrap Keeper — scope og implementeringsplan

Et hyggeligt **3D-browserspil**, hvor du plejer og passer dine egne kødædende planter: vander med regnvand, fanger fluer til middag, finder den rigtige vindueskarm — og ser din Venusfluefanger vokse fra frø til blomstrende plante i en lille levende diorama-scene.

**Genre:** Care-/tamagotchi-spil ("cozy game") i 3D. **Stil:** Blocky/chunky 3D à la Roblox/Minecraft. **Platform:** Browser (mobil + desktop, WebGL). **Sprog:** Engelsk med oversættelsesstruktur fra dag ét. **Hosting:** Vercel (spil + API). **Gemning:** Lokalt altid — og i skyen med en letvægtskonto (brugernavn + kodeord, ingen mail).

---

## 1. Vision

- **Fantasien:** "Min plante derhjemme i vindueskarmen" — som en lille 3D-diorama man kan dreje lidt på, hvor planten reagerer på pasning, snapper efter fluer og har sit eget humør.
- **Tonen:** Rolig, varm og lidt finurlig. Korte, hyppige besøg (2-5 min.) frem for lange sessioner.
- **Det unikke:** Mekanikkerne bygger på **ægte pasning af kødædende planter** — regnvand frem for postevand, fælder der slides op, vinterdvale, blomstring der koster kræfter. Man lærer faktisk noget undervejs.
- **Ikke-mål:** Ingen stress, ingen straf for at holde ferie, ingen betalingsmekanikker.

## 2. Navn

**Besluttet: Flytrap Keeper.** Beskrivende, søgevenligt og skalerer til flere arter ("keeper of carnivorous plants"). Valgfri undertitel til titelskærmen: _— a Venus flytrap tale_.

## 3. Core loop

1. **Kig til planten** — dioramaet viser vand, næring, lys og humør med ét blik.
2. **Pas den** — vand med regnvand, flyt den i bedre lys, fang en flue i minispillet.
3. **Planten reagerer** — animation nu, vækst over de kommende timer/dage (realtid).
4. **Bliv belønnet** — dugdråber (valuta) og achievements → nye frø, potter og pynt.
5. **Kom igen senere** — planten udvikler sig, mens du er væk (skånsom offline-simulering).

## 4. Spilmekanikker

### 4.1 Plantens tilstand

| Stat       | Skala       | Ændres af                                                                   |
| ---------- | ----------- | --------------------------------------------------------------------------- |
| Vand       | 0-100       | Falder over tid; fyldes ved vanding (kræver regnvand fra tønden)            |
| Næring     | 0-100       | Falder langsomt; fyldes ved fangst af insekter                              |
| Lys        | placering   | Afgøres af placering (nordvindue / sydvindue / growlampe) vs. artens behov  |
| Sundhed    | 0-100       | Afledt: falder når behov forsømmes, heler når planten trives                |
| Vækst (XP) | akkumuleres | Optjenes pr. time hvor behovene er dækket; låser næste stadie op            |
| Humør      | udtryk      | Ren feedback (glad-vip, slatten, "sulten" fælde-gab) — ingen skjult mekanik |

Vigtig botanisk detalje der giver godt gameplay: planterne **overlever fint uden insekter** (de laver fotosyntese) — fodring giver bonusvækst og dugdråber, men er aldrig et pligtløb. Vand og lys er derimod livsnødvendige.

### 4.2 Vanding — regnvand, ikke postevand

- Kødædende planter tåler ikke kalk: I spillet vander man fra **regnvandstønden**, som fyldes når det regner i spillets vejrsystem.
- Postevand findes som fristende nød-knap: virker nu, men giver "kalkskade" (lille sundhedstab). Et lærerigt dilemma.
- MVP-forenkling: ubegrænset regnvand; tønden og vejret kommer i fase 2.

### 4.3 Fodring og fælde-slid

- Hver Venusfluefanger-fælde kan **kun klappe i ca. 3 gange**, før den visner (botanisk korrekt) — nye fælder vokser frem med planten.
- Efter en fangst **fordøjer** fælden i nogle timer (lukket fælde) og kan ikke bruges imens.
- **Overfodring** (alle fælder fyldt konstant) giver råd — mere er ikke altid bedre.

### 4.4 Minispil: "Catch the fly" (i 3D)

- En flue flyver ind i dioramaet i buede baner, summer rundt og lander af og til nær en fælde.
- Spilleren klikker/tapper fælden i det rigtige øjeblik → _snap!_ (fælde-animation). For tidligt/sent → fluen undslipper.
- Forskellige byttedyr: flue (standard), myg (lille), edderkop (stor bonus) — og **biller, der er for store** og skader fælden, hvis man snapper efter dem.
- Belønning: næring + dugdråber. Naturligt loft via fordøjelsestiden (ingen grinding).

### 4.5 Vækst og livsstadier

`Frø → Spire → Ung → Voksen → (Blomstrende)`

- Stadier låses op via XP; planten bygges af moduler (se 11.5), så vækst = flere/større fælder og blade — synligt i 3D uden hårde skift.
- **Blomstrings-dilemmaet** (fase 5): En voksen, veltrivende plante sætter blomsterstilk. Klip den (sikkert — som rigtige ejere gør) eller lad den blomstre: koster sundhed, men giver **frø** til nye planter eller dugdråber.

### 4.6 Vejr og årstider

- Simpelt indbygget vejr (sol/overskyet/regn) — regn ses på ruden og fylder tønden; solrige dage øger lysudbyttet. Blød dag/nat-belysning i scenen.
- **Vinterdvale** (fase 5): Venusfluefanger og trompetkande _skal_ i dvale om vinteren. I dvale sover planten (= indbygget feriemode); springes dvalen over, starter planten svækket i foråret. Tropiske arter (kandebærer) er immune — variation mellem arterne.

### 4.7 Visnen frem for død

- Forsømte planter **visner** (slatten 3D-positur + afdæmpede farver, vækst stopper) men dør ikke permanent — de kan altid plejes tilbage. Offline-forfald er loftet (maks. ~36 timers forfald uanset fravær).
- **Hard mode** med permanent død kommer som tilvalg i fase 5 til de dedikerede.

## 5. Arter

Hver art har sin egen pasningsprofil, 3D-modelsæt og leksikontekst med ægte fakta.

| Art              | Latin               | Profil                                                       | Fase    |
| ---------------- | ------------------- | ------------------------------------------------------------ | ------- |
| Venus flytrap    | _Dionaea muscipula_ | Starterplante. Fælde-mekanik, meget lys, dvale               | 1       |
| Sundew           | _Drosera capensis_  | Tilgivende; klistrede blade fanger selv små insekter passivt | 4       |
| Tropical pitcher | _Nepenthes_         | Tropisk: kræver dis/luftfugtighed (ny handling), ingen dvale | 4       |
| Trumpet pitcher  | _Sarracenia_        | Ekstra lyskrævende + dvale; store flotte kander              | 4       |
| Butterwort       | _Pinguicula_        | Anderledes vandingsrytme; bonusart                           | Backlog |

## 6. Progression og belønning

- **Dugdråber ("Dewdrops")**: optjenes ved daglig pasning, fangster, milepæle og achievements.
- **Butikken:** frø til nye arter, potter, growlampe (låser bedste lysplacering op), dekorationer til drivhuset.
- **Drivhuset** (fase 4): kameraet trækker ud til et drivhus med flere planter i potter — samlingen er langtidsmotivationen.
- **Achievements:** "First snap!", "Green thumb week", "Survived the winter", "Full collection" m.fl.
- **Artsleksikon:** opslagsværk med de ægte plantefakta, man låser op undervejs.

## 7. Præsentation i 3D

- **Scene:** Én diorama — vindueskarm med potte, vindue (vejr/dagslys udenfor), regnvandstønde og vandkande. Senere drivhuset som udvidet scene.
- **Kamera & bevægelse:** Man går og hopper rundt i værelset som en lille passer-avatar (WASD/piletaster + mellemrum; virtuelt joystick og Hop-knap på touch). Kameraet er et tredjepersons orbit-kamera der følger figuren: spilleren beholder sin valgte vinkel og zoom, og azimuth-grænserne holder kameraet på værelsessiden af vinduesvæggen, så udsigten aldrig blokeres. _(Oprindeligt var scenen et fast diorama-kamera — opgraderet efter launch.)_
- **Kunststil:** **Blocky/chunky 3D à la Roblox/Minecraft** — modeller bygget af simple klodser og cylindre med flade farver, chunky proportioner og flat shading i en varm, blød palette. Bevidst valgt fordi stilen er charmerende _og_ meget billig at producere: ingen teksturmaling, ingen skulptering — og en stor klodset fluefanger-kæbe er sjov i sig selv. Props (potte, tønde, vindueskarm, pynt) kan laves som voxel-modeller i MagicaVoxel for ekstra Minecraft-vibe.
- **Interaktion:** Klik/tap direkte på tingene via raycasting — vandkanden for at vande, fælden for at snappe, planten for at flytte den. Store hit-områder på touch.
- **Animation:** Klods-stilen gør animation enkel: fælde-snap er en hængsel-rotation af overkæben, humør er poseringer/vip af hele planten, dertil blad-svaj, flue-flyvebaner og simple regn-partikler. Alt organisk sker i 3D; HUD er almindelig DOM ovenpå.
- **Performance-budget:** Klods-geometri er naturligt let: < 50k triangler, 1-2 dynamiske lyskilder + ambient, mål 60 fps på desktop og 30-60 på midrange-mobil. Testes på telefon fra fase 0.

## 8. Sprog og oversættelse

- **Engelsk er kildesproget** — al spiltekst skrives på engelsk fra dag ét.
- Alle strenge går gennem i18n-laget fra første commit (ingen hårdkodede tekster): `t('care.water.action')` → `locales/en.json`.
- **Dansk som første oversættelse** når teksterne er stabile (fase 5) — strukturen gør, at flere sprog blot er endnu en JSON-fil.
- **Sproget følger browseren** (`navigator.languages`), til spilleren vælger eksplicit i indstillingerne — valget gemmes i saven (`locale: ''` = automatisk).
- Datoer/tal formateres via `Intl` med aktiv locale. Leksikon-/tutorialtekster ligger også i locale-filerne.

## 9. Gemning og konto (ingen mail)

**Princip: local-first.** Spillet virker fuldt ud uden konto — alt gemmes i `localStorage` med versionsnummer og migrationsfunktioner. Kontoen er et _tilbud_ om at sikre og flytte sin progression, aldrig en mur før spillet.

### 9.1 Kontomodel: brugernavn + kodeord, ingen mail

- Opret bruger med **brugernavn + kodeord** — intet mail-felt, ingen verifikation, ingen nyhedsbreve. (Minimal persondata: vi gemmer kun brugernavn + hash.)
- Ved oprettelse vises en **engangs-gendannelseskode** (12 tegn, "skriv den ned"), som kan nulstille kodeordet. Uden mail er det den eneste vej tilbage — det siges tydeligt i UI'et.
- Guest → konto: eksisterende lokal save uploades ved oprettelse, intet går tabt.
- Konto kan slettes i spillet (én knap, alt væk) — god skik, når man ikke kan kontakte brugerne.
- Senere mulighed (backlog): **passkeys** (WebAuthn) som kodeordsfrit alternativ.

### 9.2 Backend: lille og kedelig — på Vercel

- **Vercel serverless functions** i `/api`-mappen — samme repo, samme deploy som spillet. Ingen server at passe (planten er den eneste, der skal passes).
- **Database: Postgres via Vercels marketplace (Neon)** — gratis-tier rækker langt; to tabeller: `users` (id, username, pw_hash, recovery_hash, created_at) og `saves` (user_id, blob, updated_at). (Upstash KV kunne også bære det, men SQL gør unikke brugernavne og evt. senere behov trivielle.)
- API på fire endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `GET/PUT /api/save` (+ `DELETE /api/account`). Kodeords-hash med Nodes indbyggede `scrypt`, session via signeret token i httpOnly-cookie, rate limiting på auth-endpoints.
- Save er én lille JSON-blob (~få KB) pr. bruger — serveren forstår den ikke, den opbevarer den bare. Ingen anti-cheat: det er et single-player hyggespil.
- **Synk-strategi:** last-write-wins via `updatedAt`; klienten synker ved load, ved vigtige handlinger og ved `visibilitychange`. Ved stor divergens (to enheder offline længe) vælger spilleren: "beholde denne enheds save eller skyens?" Lokal backup beholdes altid.
- **Eksport/import af save som fil** beholdes som kontofri backup-vej.

## 10. Prioriteret featureliste (MoSCoW)

**Must (MVP):** 3D-diorama med én art (Venus flytrap) · vand/næring/lys/sundhed · tick-simulering med offline catch-up · fodring (simpel) · fælde-slid · vækststadier i 3D · visnen/genopretning · lokal save med versionering · engelsk UI med i18n-lag · mobilvenligt (touch + ydelse).

**Should:** Minispillet "Catch the fly" · vejr + regnvandstønde · humør-animationer og lyd · tutorial · achievements · **konto uden mail + sky-synk** · dugdråber + butik · flere arter · drivhus-scene.

**Could:** Årstider + dvale · blomstring/frø · ompotning · hard mode · artsleksikon · dansk oversættelse · PWA (installér på hjemmeskærm) · passkeys.

**Won't (denne omgang):** Multiplayer/handel · mail-flows af enhver art · tredjeparts-login (Google m.fl.) · push-notifikationer · rigtige vejrdata via API · native apps · monetization.

## 11. Teknisk arkitektur

### 11.1 Stack

- **Vite + TypeScript + React + react-three-fiber (Three.js) + drei** — R3F giver deklarativ 3D med Reacts komponentmodel, og drei-økosystemet (kamera-kontrol, GLTF-hooks, HTML-overlays) sparer ugers arbejde. HUD/menuer er almindelig React-DOM oven på canvas. Spillet forbliver en ren SPA — ingen SSR/Next nødvendigt.
- **State:** Zustand som tyndt bindeled mellem sim-kernen og React/R3F (samme økosystem som drei, spiller pænt med begge verdener).
- **i18n:** i18next + react-i18next, `en` som kildesprog.
- **3D-indhold:** Primitiver komponeret i kode som udgangspunkt (klods-stilen inviterer til det); MagicaVoxel til props; Blender/GLB (Draco) kun hvor det giver mening.
- **Test:** Vitest til simulationskernen; Playwright til få e2e-røgtests senere.
- **Deploy: Vercel med git-integration** — push til GitHub → automatisk build; **hver PR får en preview-URL** (perfekt til playtest af nye features), `main` → produktion. Spil og API deployes samlet. GitHub Actions kører fortsat typecheck/lint/test som PR-gate.

### 11.2 Arkitekturprincip: ren simulationskerne

Al spillogik ligger i `src/sim/` som **rene funktioner uden DOM- eller Three.js-afhængigheder**:

- `tick(state, now, rng) → state` — fremskriver verden; samme funktion bruges til offline catch-up.
- `apply(state, action) → state` — spillerhandlinger (`waterPlant`, `feedPlant`, `movePlant`, …).
- Seedet RNG → deterministisk og testbar ("simulér 7 dages pasning" som unit test).
- Alle balance-tal (forfaldsrater, XP-tærskler, priser) samles i `sim/config.ts`, så tuning er ét sted.

3D-laget er _ren visning_: det læser state og afspiller animationer — det ejer aldrig sandheden. Skulle vi en dag skifte renderer (eller lave 2D-udgave til svage enheder), overlever hele spillet.

### 11.3 Datamodel (udkast)

```ts
type SpeciesId = 'dionaea' | 'drosera' | 'nepenthes' | 'sarracenia'
type PlacementId = 'north-window' | 'south-window' | 'growlight'

interface SpeciesDef {
  id: SpeciesId
  care: {
    waterDecayPerHour: number
    nutritionDecayPerHour: number
    idealLight: PlacementId[]
    needsDormancy: boolean
    needsMisting: boolean // tropical pitcher
  }
  stages: { xpThreshold: number; trapCount: number }[]
  modelSet: string // reference til artens 3D-kit
}

interface TrapState {
  usesLeft: number
  digestingUntil: number | null
}

interface PlantState {
  id: string
  speciesId: SpeciesId
  nickname: string
  water: number
  nutrition: number
  health: number // 0-100
  xp: number
  stage: number
  placement: PlacementId
  traps: TrapState[]
  dormant: boolean
  wilted: boolean
}

interface GameState {
  saveVersion: number // til save-migrationer
  updatedAt: number // til sky-synk (last-write-wins)
  lastTickAt: number // epoch ms — grundlag for offline catch-up
  rngSeed: number
  plants: PlantState[]
  inventory: { dewdrops: number; items: string[] }
  weather: { current: 'sun' | 'clouds' | 'rain'; rainBarrel: number }
  achievements: string[]
  settings: { sound: boolean; locale: string }
}
```

Sprog-note: al kode, kommentarer og strenge i koden er på engelsk; artsnavne o.l. kommer fra locale-filerne.

### 11.4 Tid og offline-progression

- Realtid: planten vokser over timer/dage — det giver den ægte "kig til den hver dag"-følelse.
- Løbende simulering med grov tick (~30 sek.) mens fanen er åben; animationer kører separat i R3F's frame-loop.
- Ved load og `visibilitychange` beregnes forskellen fra `lastTickAt` i ét hug (stol aldrig på timere i baggrundsfaner — browsere throttler dem).
- Offline-forfald er **loftet** (~36 timer), og dvale pauser tiden helt: ferie skal aldrig koste en plante.

### 11.5 3D-indholdspipeline — klodser gør det billigt

- **Primitiver i kode frem for modelfiler:** Klods-stilen betyder, at planterne kan _bygges programmatisk_ af bokse og cylindre — en fælde er to kasser med et hængsel, snap-animationen er en rotation. Hver art er et _kit_ (potte, jord, roset-base, fælde/blad-modul, blomsterstilk), og vækst = kode der tilføjer/skalerer moduler. Ingen modelfil-eksplosion, glidende vækst, og fælder kan instanceres.
- **Voxel-props i MagicaVoxel:** Potte, tønde, vindueskarm og pynt modelleres hurtigt som voxels og eksporteres til GLB — gratis værktøj, meget begyndervenligt, rammer Minecraft-æstetikken direkte.
- **Blender som eskalering:** Kun hvis noget kræver mere (fx blomsten) — eksporteret som Draco-komprimeret GLB via `useGLTF`.
- **Placeholder-først:** Fase 0-1 bygges med rå primitiver i de rigtige farver — som i klods-stilen allerede _ligner_ næsten-færdig grafik. Polering er at justere proportioner og palette, ikke at lave alt om.

### 11.6 Mappestruktur

```
flytrap-keeper/
├── src/
│   ├── sim/            # ren spillogik: tick, actions, species, config, save/migrations, sync-klient
│   ├── scene/          # R3F: diorama, plantekits, minigame, vejr, animationer
│   ├── ui/             # React-DOM HUD: målere, knapper, butik, leksikon, konto-dialoger
│   ├── i18n/           # i18next-opsætning
│   └── main.tsx
├── locales/            # en.json (kildesprog), senere da.json …
├── assets/models/      # voxel-props som GLB + palette/konventioner
├── api/                # Vercel serverless functions: auth + save (Node)
├── tests/              # Vitest — primært mod src/sim
└── .github/workflows/ci.yml
```

### 11.7 Kvalitet

- CI på hver PR: typecheck, lint, test — og Vercel bygger preview-deploy automatisk.
- Ydelse er en feature: test på rigtig telefon fra fase 0; tri-/drawcall-budget håndhæves når scenen vokser.
- Tilgængelighed: alle handlinger kan nås via HUD-knapper (ikke kun 3D-klik), `prefers-reduced-motion` dæmper kamera/partikler, ordentlig kontrast i HUD.

## 12. Faseplan

Estimaterne er kalendertid i hobbytempo (aftener/weekender). 3D koster lidt ekstra fundament i fase 0-1, men klods-stilen holder prisen nede — placeholders og færdig grafik er næsten samme ting.

### Fase 0 — Fundament (~2 dage)

- [x] Vite + React + TS-skelet, ESLint + Prettier, Vitest
- [x] R3F-scene: klods-potte + placeholder-plante på vindueskarm, orbit med grænser, kører på telefon
- [x] GLB-pipeline bevist: vandkande-prop genereret som GLB (`npm run generate:props`) og indlæst via `useGLTF` — MagicaVoxel-eksporter kan afløse 1:1 i `public/models/`
- [x] i18next sat op med `locales/en.json` — al UI-tekst går gennem `t()`
- [x] Vercel koblet på repoet: preview pr. PR + produktion (manuel engangs-import på vercel.com — se README)
- [x] GitHub Actions (typecheck/lint/test/build) + README med "sådan kører du det lokalt"

### Fase 1 — MVP: "Én plante lever" (2-3 uger)

_Mål: En Venus flytrap i 3D man reelt kan passe over flere dage — og som gemmes lokalt._

- [x] Sim-kerne: `GameState`, `tick`, offline catch-up, seedet RNG
- [x] Stats (vand/næring/sundhed) + placeringer og lys
- [x] Handlinger via raycast + HUD: vand, fodr (klik på fælde), flyt placering
- [x] Fælde-slid: 3 brug pr. fælde + fordøjelsestid (lukket fælde i 3D) + genvækst efter 24 t
- [x] Vækst: XP + stadier via modulær klods-plante
- [x] Visnen (slatten positur, afdæmpede farver) + genopretning — ingen permanent død
- [x] Save/load i localStorage med versionering
- [x] HUD: behovsmålere, handlingsknapper — mobil-først, store touch-mål
- [x] Vitest: forfald, catch-up, vækst, fælde-regler ("7 dages pasning" som test)

**Definition of done:** Kan spilles på telefon og desktop; en uges simuleret pasning opfører sig korrekt; visnen kan altid vendes; kører flydende på midrange-mobil.

### Fase 2 — Spilfølelse (~2 uger)

- [x] "Catch the fly": flue med 3D-flyvebane, landing, timing-snap med hængsel-animation
- [x] Insekttyper med forskellig værdi + biller der skader fælden
- [x] Vejrsystem + regnvandstønde i scenen (vand bliver en ressource; postevands-dilemmaet)
- [x] Humør-poseringer, blad-svaj, dag/nat-lys, snap-/regn-lyde (syntetiseret Web Audio — ingen lydfiler)
- [x] Rolig baggrundsmusik: generativ vuggevise (pad-akkorder + spilledåse-toner, syntetiseret — ingen lydfiler) med egen til/fra-knap i indstillinger
- [x] Førstegangsflow/tutorial med navngivning og ægte pasningstips
- [x] 8 achievements med dugdråbe-bonus og toast
- [x] Kit-polering: fælde-tænder, regnvandstønde med synligt vandniveau, skyer og regn (flere voxel-props kan afløse løbende)

### Fase 3 — Konto og sky-synk (~1 uge)

- [x] `api/`: Vercel functions + Postgres (Neon) — register/login/reset/save/delete, scrypt, signerede session-cookies, rate limiting; in-memory DB-adapter til tests. _Går først live når repoet er importeret på Vercel og `DATABASE_URL` + `SESSION_SECRET` er sat — se README. Uden backend viser spillet pænt "sky-synk ikke sat op"._
- [x] Konto-UI: opret (brugernavn + kodeord, gendannelseskode vises én gang), login, glemt-kodeord via gendannelseskode, log ud, slet konto
- [x] Synk-lag i klienten: last-write-wins på `updatedAt`, konflikt-dialog ved stor divergens, debounced push
- [x] Guest → konto: lokal save pushes ved oprettelse; ved login vælges mellem sky og enhed
- [x] Eksport/import af save som fil (kontofri backup)

### Fase 4 — Samling og progression (2-3 uger)

- [x] Dugdråber som valuta (fangster, achievements, blomstring)
- [x] Butik: frø (3 arter), potter i 3 farver (= ompotning), growlampe (3. lysplacering), nisse-dekoration
- [x] Sundew (passiv fangst), tropical pitcher (dis-handling + fugtigheds-stat) og trumpet pitcher med egne profiler og klods-kits
- [x] Flere planter: op til 3 potter på vindueskarmen med tap-til-valg og plantevælger-chips. _Scope-justering: den separate drivhus-scene med kamera-zoom er rykket til backloggen — karmen bærer samlingen fint indtil videre._
- [x] Artsleksikon med ægte fakta, der låses op ved at eje arten

### Fase 5 — Sæsoner og dybde (2-3 uger)

- [x] Årstider (fra kalenderen) + vinterdvale: dvale = feriemode; en vågen dvale-art slides om vinteren (ingen regeneration + løbende svækkelse) og vækkes automatisk af foråret
- [x] Blomstrings-dilemmaet: klip stilken (sikkert, +8 🫧) eller lad den blomstre (5 dage, koster sundhed, +60 🫧 i frø-udbytte)
- [x] Frø → dugdråber (frø-udbyttet sælges til andre samlere; egne nye planter købes som frø i butikken)
- [x] Ompotning via pottefarver i butikken + hard mode som tilvalg (permanent død efter 72 timer i bund; potten kan ryddes)
- [x] **Dansk oversættelse** (`da.json`) med sprogskifter i indstillinger — testen håndhæver 1:1-nøgledækning med engelsk
- [x] **Sprogvalg via browser-locale** — dansk browser starter på dansk; et eksplicit valg i indstillingerne vinder stadig
- [x] Polering: humør/positurer for dvale og død, gravsten, valg-ring, tilgængelige dialoger

### Efter launch

- [x] Daglige opgaver: 3 tilfældige (men deterministiske pr. dag) opgaver — vand ×2, fang ×2, lug ×2, kæl ×2, perfekt hældning, dis kandebæreren (kun når man ejer en levende Nepenthes). +5 🫧 pr. opgave, +10 bonus når alle tre er klaret; 📋-knap med rød prik i HUD'en og toast ved fuldførelse. Nulstilles ved UTC-midnat.
- [x] "Start forfra"-knap under Din save (to-trins bekræftelse) + genoptagelig onboarding efter reload
- [x] Værelset bygget færdigt: alle vægge (dollhouse-teknik — sidevægge er ensidede og usynlige udefra), matteret sidevindue, seng, skrivebord, stol, væghylde med kaktus, vægur; kameraet kan dreje meget længere rundt (azimuth ±1,45 rad)
- [x] Indret-dit-værelse i butikken: tæppe (35), plakat (30), hylderadio (45), gulvlampe (55, lyser om aftenen) og computer (90, skærmen gløder) — samme deco-mekanisme som nissen, så gamle saves virker uændret. _Fravalg: fri træk-og-slip-placering — faste, håndplacerede pladser er langt bedre på mobil._
- [x] Spilhastighed (speed mode): valgbart tempo ×1/×10/×60/×600 i indstillinger via et spil-ur i simmen (skala + ankre) — forfald, fordøjelse, vejr, årstider og dag/nat følger med, mens `updatedAt` forbliver væg-ur af hensyn til sky-synk. HUD'en viser spiltid med ⏩-badge; offline-loftet gælder fortsat i spiltimer; gamle saves migreres (v8).
- [x] Passer-avatar i stedet for fast kamera: en lille blocky figur (grøn passer-kasket, fluefanger-badge) man går rundt med via WASD/piletaster eller virtuelt joystick på touch; gå-cyklus, drejning og blød følgekamera-logik. Kollision mod seng, skrivebord, stol, karm, vægge og den købte gulvlampe er ren, testbar matematik i `playerMovement.ts` (samme princip som sim-kernen). Klik-interaktionerne, insekt-minispillet og HUD'en er uændrede — figuren giver skala og nærvær, den gater ingen handlinger.
- [x] Hop og klatring: mellemrum (eller Hop-knappen på touch) hopper — tyngdekraft, squash-and-stretch-landing og en løsrevet blob-skygge, der bliver på fladen under figuren. Møbeltoppe er gangbare flader: op på sengen og stolen fra gulvet, stol → skrivebord som lille platform-kæde (karmen er bevidst umulig — planterne skal have fred). Sengen er hoppebold: hårde landinger giver et lille "boing" og et hop. Hop-fysikken er rene funktioner med tests (apex-højde, kant-fald, seng-bounce).
- [x] **Drivhuset**: købbart i butikken (250 🫧) — et glashus med egen scene (glasvægge/-tag, pottebord, tomatkasse) og tre ekstra pladser. Ny placering `greenhouse` med godt lys til alle arter og halveret fugtighedstab (godt til kandebæreren); rumskifter i HUD'en, insekter, minispil og passeren følger med derud (egne kollisions-bokse og spawn ved døren). Save-version 10 (ingen nye felter — bumpet så gamle klienter afviser fremfor at fejlsimulere den nye placering).
- [x] **Venner, chat og besøg**: venneliste via brugernavn (anmod/acceptér — at tilføje tilbage ER at acceptere), 1:1-chat med ulæst-prik, og læse-besøg i vennens værelse/drivhus: klienten henter vennens save-blob og renderer den read-only (kig, men rør ikke — alle handlinger er slået fra, men passeren går med på besøg). Kræver sky-konto; serveren fik to nye endpoints (`/api/friends`, `/api/chat`) og to små tabeller (venskaber + beskeder) — den fortolker stadig ikke saves. Handel/gaver er fortsat bevidst fravalgt.
- [x] **Natteliv**: møl der kredser om den købte gulvlampe efter mørkets frembrud (ny fangbar insekt-type, egen natlig spawn-tabel), ildfluer forbi vinduet på nogle sommernætter (deterministisk pr. nat ligesom vejret — til at kigge på, ikke fodre med: ildfluer er faktisk giftige for mange rovdyr) og sjældne stjerneskud på klare nætter, man kan ønske på (+3 🫧 med sim-cooldown à la gyldne dråber). Håndplacerede blinkende stjerner sælger nattehimlen. Tre nye achievements: Natteravn, Ønsk dig noget, Ildfluenat. Save v12 (`minigames.lastWishAt`).
- [x] **Kultivarer**: tre ægte Venus flytrap-sorter som sjældne frø i butikken — 'Justina Davis' (helt grøn, 100 🫧), 'B52' (kæmpefælder ×1,28, 120 🫧) og 'Red Dragon'/Akai Ryū (helrød, 140 🫧). Samme art og pasning; udseendet er farve-/proportions-overrides i scene-laget, simmen kender kun id'et (`PlantState.cultivar`). Egne standard-kaldenavne, kultivar i anførselstegn i HUD'en, ægte fakta-linjer i leksikonet pr. ejet kultivar — og Kultivar-samler-achievement for alle tre på én gang.
- [x] **Fotomode og tilbehør**: 📷-knap i HUD'en fotograferer scenen præcis som man selv har vinklet den og pakker den ind i et postkort (kaldenavn + dato + spilnavn, lokaliseret) med Gem/Del-dialog (Web Share API på mobil; HUD'en er DOM og kommer aldrig med på billedet). Butikken sælger rulleøjne (25 🫧) og sløjfe (20 🫧) pr. plante efter samme mekanik som pottefarver — på fluefangeren sidder rulleøjnene på selve overkæben og snapper med. `PlantState.accessory` i save v12.
- [x] **Kæledyr** — med den bærende regel at **kæledyr ingen behov har**: planterne er dem, man passer; dyrene er selskab. (1) **Frøen**: "En frø (ikke et frø)" i butikken (60 🫧, kræver drivhuset) — et syltetøjsglas på skrivebordet, hvor æg → haletudse → ben → frølet forvandler sig over ~7 dage i realtid (ren kalender-funktion, ingen tick-bogføring — ferier tæller fuldt med), hvorefter frøen flytter ud i drivhuset. Står der en levende trompetkande derude, sidder den ved *den* — ligesom ægte frøer, der hugger bytte fra kandeplanter. (2) **Katten**: i nogle regnperioder (deterministisk pr. seed + periode, som vejret) sidder en gennemblødt kat og mjaver ved ruden; luk den ind via banner eller ved at tappe den, og den sover fremover på sengen (tap for spinden). (3) **Sneglen**: kravler i sneglefart over karmen i regnvejr (ægte skadedyr for kødædere); tre blide redninger (+2 🫧, cooldown i simmen), og den flytter ind i et glas med lufthuller. Fire achievements (Fuldendt forvandling, Regnvejrsven, Verdens roligste kæledyr, Fuldt hus), `GameState.pets` i save v12, og dyrene følger med på vennebesøg (read-only).

### Backlog (senere, efter lyst)

Passkeys (WebAuthn) · PWA + påmindelser ("Your plant is thirsty 🌱") · rigtige vejrdata via API · dele/forære frø til venner · butterwort som art nr. 5 · flere sprog.

## 13. Risici og modtræk

| Risiko                                             | Modtræk                                                                                                                       |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 3D-indhold æder tiden                              | Klods-stilen er valgt netop derfor: primitiver i kode + voxel-props i MagicaVoxel — placeholders _er_ næsten den færdige stil |
| Ydelse på mobil (WebGL)                            | Klods-geometri er let (< 50k tris, 1-2 lys), instancing af fælder, test på rigtig telefon i hver fase                         |
| Touch-interaktion i 3D er upræcis                  | Store hit-områder, alle handlinger findes også som HUD-knapper                                                                |
| Scope creep — spillet vokser vildere end planterne | Faserne er værdisluser: hver fase er et spilbart spil. Backloggen er en parkeringsplads, ikke en forpligtelse                 |
| Glemt kodeord uden mail = mistet konto             | Gendannelseskode ved oprettelse + tydelig advarsel; eksport/import som sidste udvej; passkeys senere                          |
| Synk-konflikter mellem enheder                     | Last-write-wins + konflikt-dialog kun ved stor divergens; lokal backup røres aldrig                                           |
| Balancering (rater føles forkerte)                 | Alle tal i én config-fil; testscenarier simulerer dage på millisekunder                                                       |
| Offline-forfald frustrerer                         | Loftet forfald, visnen i stedet for død, dvale som feriemode                                                                  |
| Browser-throttling af timere                       | Catch-up ved load/`visibilitychange` er kilden til sandhed — aldrig `setInterval`-akkumulering                                |
| Save-format knækker ved nye features               | `saveVersion` + migrationsfunktioner fra første save — gælder også blob'en i skyen                                            |

## 14. Afgrænsning (bevidst fravalgt)

Handel og gaver mellem spillere · mail, nyhedsbreve og tredjeparts-login · push-notifikationer · native apps · fotorealisme · monetization. Backenden forbliver dum om spillet: den opbevarer saves, venskaber og chatbeskeder uden at fortolke dem — al spillogik bor i klienten. (Venneliste, chat og læse-besøg kom til efter launch som en bevidst, lille undtagelse fra "ingen multiplayer".)

## 15. Åbne spørgsmål

1. **Stil-hældning:** Mest Roblox (chunky klodser, flade farver — planens antagelse) eller mest Minecraft (voxels og pixel-teksturer)? Antagelsen er chunky med flade farver og voxel-props som krydderi.
2. **Dansk** som første oversættelse efter engelsk — korrekt antaget?

## 16. Første skridt

Fase 0 kan gå i gang med det samme: React + R3F-skelet med klods-diorama, voxel-pipeline, i18n-opsætning, CI og Vercel-deploy — derefter fase 1's sim-kerne, som er hjertet i det hele.
