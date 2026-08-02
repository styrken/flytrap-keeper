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
- **Kamera:** Fast, indbydende vinkel med begrænset fri rotation/zoom (orbit med stramme grænser, pinch på mobil). Ingen fri navigation — det er en diorama, ikke en verden.
- **Kunststil:** **Blocky/chunky 3D à la Roblox/Minecraft** — modeller bygget af simple klodser og cylindre med flade farver, chunky proportioner og flat shading i en varm, blød palette. Bevidst valgt fordi stilen er charmerende _og_ meget billig at producere: ingen teksturmaling, ingen skulptering — og en stor klodset fluefanger-kæbe er sjov i sig selv. Props (potte, tønde, vindueskarm, pynt) kan laves som voxel-modeller i MagicaVoxel for ekstra Minecraft-vibe.
- **Interaktion:** Klik/tap direkte på tingene via raycasting — vandkanden for at vande, fælden for at snappe, planten for at flytte den. Store hit-områder på touch.
- **Animation:** Klods-stilen gør animation enkel: fælde-snap er en hængsel-rotation af overkæben, humør er poseringer/vip af hele planten, dertil blad-svaj, flue-flyvebaner og simple regn-partikler. Alt organisk sker i 3D; HUD er almindelig DOM ovenpå.
- **Performance-budget:** Klods-geometri er naturligt let: < 50k triangler, 1-2 dynamiske lyskilder + ambient, mål 60 fps på desktop og 30-60 på midrange-mobil. Testes på telefon fra fase 0.

## 8. Sprog og oversættelse

- **Engelsk er kildesproget** — al spiltekst skrives på engelsk fra dag ét.
- Alle strenge går gennem i18n-laget fra første commit (ingen hårdkodede tekster): `t('care.water.action')` → `locales/en.json`.
- **Dansk som første oversættelse** når teksterne er stabile (fase 5) — strukturen gør, at flere sprog blot er endnu en JSON-fil.
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
plantespil/
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
- [ ] Vercel koblet på repoet: preview pr. PR + produktion (manuel engangs-import på vercel.com — se README)
- [x] GitHub Actions (typecheck/lint/test/build) + README med "sådan kører du det lokalt"

### Fase 1 — MVP: "Én plante lever" (2-3 uger)

_Mål: En Venus flytrap i 3D man reelt kan passe over flere dage — og som gemmes lokalt._

- [ ] Sim-kerne: `GameState`, `tick`, offline catch-up, seedet RNG
- [ ] Stats (vand/næring/sundhed) + placeringer og lys
- [ ] Handlinger via raycast + HUD: vand, fodr (klik på fælde), flyt placering
- [ ] Fælde-slid: 3 brug pr. fælde + fordøjelsestid (lukket fælde i 3D)
- [ ] Vækst: XP + stadier via modulær klods-plante
- [ ] Visnen (slatten positur, afdæmpede farver) + genopretning — ingen permanent død
- [ ] Save/load i localStorage med versionering
- [ ] HUD: behovsmålere, handlingsknapper — mobil-først, store touch-mål
- [ ] Vitest: forfald, catch-up, vækst, fælde-regler ("7 dages pasning" som test)

**Definition of done:** Kan spilles på telefon og desktop; en uges simuleret pasning opfører sig korrekt; visnen kan altid vendes; kører flydende på midrange-mobil.

### Fase 2 — Spilfølelse (~2 uger)

- [ ] "Catch the fly": flue med 3D-flyvebane, landing, timing-snap med hængsel-animation
- [ ] Insekttyper med forskellig værdi + biller der skader fælden
- [ ] Vejrsystem + regnvandstønde i scenen (vand bliver en ressource; postevands-dilemmaet)
- [ ] Humør-poseringer, blad-svaj, dag/nat-lys, snap-/regn-lyde
- [ ] Førstegangsflow/tutorial med ægte pasningstips
- [ ] 5-8 achievements
- [ ] Venus flytrap-kit v1: proportioner, palette og voxel-props poleres

### Fase 3 — Konto og sky-synk (~1 uge)

- [ ] `api/`: Vercel functions + Postgres (Neon) — register/login/save/delete, scrypt, rate limiting
- [ ] Konto-UI: opret (brugernavn + kodeord, gendannelseskode vises én gang), login, log ud, slet konto
- [ ] Synk-lag i klienten: last-write-wins på `updatedAt`, konflikt-dialog ved stor divergens
- [ ] Guest → konto: lokal save uploades ved oprettelse
- [ ] Eksport/import af save som fil (kontofri backup)

### Fase 4 — Samling og progression (2-3 uger)

- [ ] Dugdråber som valuta (pasning, fangster, milepæle)
- [ ] Butik: frø, potter, growlampe, dekorationer
- [ ] Sundew, tropical pitcher (dis-handling) og trumpet pitcher med egne profiler og kits
- [ ] Drivhus-scene med flere planter (kamera trækker ud)
- [ ] Artsleksikon med fakta der låses op

### Fase 5 — Sæsoner og dybde (2-3 uger)

- [ ] Årstider + vinterdvale (dvale = feriemode; skippes den, svækkes planten)
- [ ] Blomstrings-dilemmaet: klip stilken eller høst frø
- [ ] Frø → nye planter eller dugdråber
- [ ] Ompotning + hard mode (permanent død som tilvalg)
- [ ] **Dansk oversættelse** (`da.json`) nu hvor teksterne er stabile
- [ ] Polering: overgange, tilgængelighed, ydelsesgennemgang

### Backlog (senere, efter lyst)

Passkeys (WebAuthn) · PWA + påmindelser ("Your plant is thirsty 🌱") · rigtige vejrdata via API · daglige opgaver · dele/forære frø til venner · butterwort som art nr. 5 · flere sprog.

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

Multiplayer og handel mellem spillere · mail, nyhedsbreve og tredjeparts-login · push-notifikationer · native apps · fotorealisme · monetization. Backenden forbliver en "dum" save-opbevaring — al spillogik bor i klienten.

## 15. Åbne spørgsmål

1. **Stil-hældning:** Mest Roblox (chunky klodser, flade farver — planens antagelse) eller mest Minecraft (voxels og pixel-teksturer)? Antagelsen er chunky med flade farver og voxel-props som krydderi.
2. **Dansk** som første oversættelse efter engelsk — korrekt antaget?

## 16. Første skridt

Fase 0 kan gå i gang med det samme: React + R3F-skelet med klods-diorama, voxel-pipeline, i18n-opsætning, CI og Vercel-deploy — derefter fase 1's sim-kerne, som er hjertet i det hele.
