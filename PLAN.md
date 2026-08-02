# Plantespil — scope og implementeringsplan

Et hyggeligt browserspil, hvor du plejer og passer dine egne kødædende planter: vander med regnvand, fanger fluer til middag, finder den rigtige vindueskarm — og ser din Venusfluefanger vokse fra frø til blomstrende plante.

**Genre:** Care-/tamagotchi-spil ("cozy game"). **Platform:** Browser (mobil + desktop). **Spillere:** Én spiller, ingen konto — spillet gemmes lokalt i browseren.

---

## 1. Vision

- **Fantasien:** "Min plante derhjemme i vindueskarmen" — bare mere levende. Planten reagerer på din pasning, snapper efter fluer og har sit eget humør.
- **Tonen:** Rolig, varm og lidt finurlig. Korte, hyppige besøg (2-5 min.) frem for lange sessioner.
- **Det unikke:** Mekanikkerne bygger på **ægte pasning af kødædende planter** — regnvand frem for postevand, fælder der slides op, vinterdvale, blomstring der koster kræfter. Man lærer faktisk noget om planterne undervejs.
- **Ikke-mål:** Ingen stress, ingen straf for at holde ferie, ingen betalingsmekanikker.

## 2. Core loop

1. **Kig til planten** — se vand, næring, lys og humør med ét blik.
2. **Pas den** — vand med regnvand, flyt den i bedre lys, fang en flue i minispillet.
3. **Planten reagerer** — animation nu, vækst over de kommende timer/dage (realtid).
4. **Bliv belønnet** — dugdråber (valuta) og achievements → nye frø, potter og pynt.
5. **Kom igen senere** — planten udvikler sig, mens du er væk (skånsom offline-simulering).

## 3. Spilmekanikker

### 3.1 Plantens tilstand

| Stat | Skala | Ændres af |
|---|---|---|
| Vand | 0-100 | Falder over tid; fyldes ved vanding (kræver regnvand fra tønden) |
| Næring | 0-100 | Falder langsomt; fyldes ved fangst af insekter |
| Lys | placering | Afgøres af placering (nordvindue / sydvindue / growlampe) vs. artens behov |
| Sundhed | 0-100 | Afledt: falder når behov forsømmes, heler når planten trives |
| Vækst (XP) | akkumuleres | Optjenes pr. time hvor behovene er dækket; låser næste stadie op |
| Humør | ikon | Ren feedback (glad/tørstig/sulten/slatten) — ingen skjult mekanik |

Vigtig botanisk detalje der giver godt gameplay: planterne **overlever fint uden insekter** (de laver fotosyntese) — fodring giver bonusvækst og dugdråber, men er aldrig et pligtløb. Vand og lys er derimod livsnødvendige.

### 3.2 Vanding — regnvand, ikke postevand

- Kødædende planter tåler ikke kalk: I spillet vander man fra **regnvandstønden**, som fyldes når det regner i spillets vejrsystem.
- Postevand findes som fristende nød-knap: virker nu, men giver "kalkskade" (lille sundhedstab). Et lærerigt dilemma.
- MVP-forenkling: ubegrænset regnvand; tønden og vejret kommer i fase 2.

### 3.3 Fodring og fælde-slid

- Hver Venusfluefanger-fælde kan **kun klappe i ca. 3 gange**, før den visner (botanisk korrekt) — nye fælder vokser frem med planten.
- Efter en fangst **fordøjer** fælden i nogle timer og kan ikke bruges imens.
- **Overfodring** (alle fælder fyldt konstant) giver råd — mere er ikke altid bedre.

### 3.4 Minispil: "Fang fluen"

- En flue flyver ind over scenen i buede baner og lander af og til nær en fælde.
- Spilleren klikker/tapper fælden i det rigtige øjeblik → *snap!* For tidligt/sent → fluen undslipper.
- Forskellige byttedyr: flue (standard), myg (lille), edderkop (stor bonus) — og **biller, der er for store** og skader fælden, hvis man snapper efter dem.
- Belønning: næring + dugdråber. Naturligt loft via fordøjelsestiden (ingen grinding).

### 3.5 Vækst og livsstadier

`Frø → Spire → Ung → Voksen → (Blomstrende)`

- Stadier låses op via XP; hvert stadie har sin egen grafik, og voksne planter har flere fælder.
- **Blomstrings-dilemmaet** (fase 4): En voksen, veltrivende plante sætter blomsterstilk. Klip den (sikkert — som rigtige ejere gør) eller lad den blomstre: koster sundhed, men giver **frø** til nye planter eller dugdråber.

### 3.6 Vejr og årstider

- Simpelt indbygget vejr (sol/overskyet/regn) — regn fylder tønden, solrige dage øger lysudbyttet.
- **Vinterdvale** (fase 4): Venusfluefanger og trompetkande *skal* i dvale om vinteren. I dvale sover planten (= indbygget feriemode); springes dvalen over, starter planten svækket i foråret. Tropiske arter (kandebærer) er immune — variation mellem arterne.

### 3.7 Visnen frem for død

- Forsømte planter **visner** (grafik + stop for vækst) men dør ikke permanent — de kan altid plejes tilbage. Offline-forfald er desuden loftet (maks. ~36 timers forfald uanset fravær).
- **Hard mode** med permanent død kommer som tilvalg i fase 4 til de dedikerede.

## 4. Arter

Hver art har sin egen pasningsprofil, grafik og lille leksikontekst med ægte fakta.

| Art | Latin | Profil | Fase |
|---|---|---|---|
| Venusfluefanger | *Dionaea muscipula* | Starterplante. Fælde-mekanik, meget lys, dvale | 1 |
| Soldug | *Drosera capensis* | Tilgivende begynderart; klistrede blade "fanger selv" små insekter passivt | 3 |
| Kandebærer | *Nepenthes* | Tropisk: kræver dis/luftfugtighed (ny handling), ingen dvale | 3 |
| Trompetkande | *Sarracenia* | Ekstra lyskrævende + dvale; store flotte kander | 3 |
| Vibefedt | *Pinguicula* | Anderledes vandingsrytme; bonusart | Backlog |

## 5. Progression og belønning

- **Dugdråber** (valuta): optjenes ved daglig pasning, fangster, milepæle og achievements.
- **Butikken:** frø til nye arter, potter, growlampe (låser bedste lysplacering op), dekorationer til drivhuset.
- **Drivhuset** (fase 3): overblik med flere planter i potter side om side — samlingen er langtidsmotivationen.
- **Achievements:** "Første snap!", "En uge med grønne fingre", "Overlevede vinteren", "Fuld samling" m.fl.
- **Artsleksikon:** opslagsværk med de ægte plantefakta, man låser op undervejs.

## 6. Prioriteret featureliste (MoSCoW)

**Must (MVP):** Én art (Venusfluefanger) · vand/næring/lys/sundhed · tick-simulering med offline catch-up · fodring (simpel) · fælde-slid · 4 vækststadier · visnen/genopretning · lokal save med versionering · mobilvenligt UI.

**Should:** Minispillet "Fang fluen" · vejr + regnvandstønde · humør-animationer og lyd · tutorial · achievements · dugdråber + butik · 3-5 arter · drivhus.

**Could:** Årstider + dvale · blomstring/frø · ompotning · hard mode · artsleksikon · i18n (da/en) · PWA (installér på hjemmeskærm).

**Won't (denne omgang):** Backend/konti/sky-sync · multiplayer/handel · push-notifikationer · rigtige vejrdata via API · native apps · monetization.

## 7. Teknisk arkitektur

### 7.1 Stack

- **Vite + TypeScript + Svelte 5** — lille bundle, hurtig udvikling, og Sveltes indbyggede transitions/springs er perfekte til bløde, "levende" planteanimationer. (React kan vælges i stedet uden at ændre resten af planen — simulationskernen er framework-uafhængig, se 7.2.)
- **Grafik:** Lagdelt **SVG + CSS-animationer** pr. art/stadie. Ingen canvas/spilmotor nødvendig — heller ikke til minispillet (DOM/SVG rækker fint til én flue ad gangen).
- **Test:** Vitest til simulationskernen; Playwright til få e2e-røgtests senere.
- **Deploy:** GitHub Actions → GitHub Pages. Hver merge kan spilles med det samme.

### 7.2 Arkitekturprincip: ren simulationskerne

Al spillogik ligger i `src/sim/` som **rene funktioner uden DOM-afhængigheder**:

- `tick(state, now, rng) → state` — fremskriver verden; samme funktion bruges til offline catch-up.
- `apply(state, action) → state` — spillerhandlinger (`waterPlant`, `feedPlant`, `movePlant`, …).
- Seedet RNG → deterministisk og testbar ("simulér 7 dages pasning" som unit test).
- Alle balance-tal (forfaldsrater, XP-tærskler, priser) samles i `sim/config.ts`, så tuning er ét sted.

UI'et er et tyndt lag ovenpå: viser state, afsender actions, animerer forskellen.

### 7.3 Datamodel (udkast)

```ts
type SpeciesId = 'dionaea' | 'drosera' | 'nepenthes' | 'sarracenia';
type PlacementId = 'north-window' | 'south-window' | 'growlight';

interface SpeciesDef {
  id: SpeciesId;
  name: string;                    // "Venusfluefanger"
  latin: string;                   // "Dionaea muscipula"
  care: {
    waterDecayPerHour: number;
    nutritionDecayPerHour: number;
    idealLight: PlacementId[];
    needsDormancy: boolean;
    needsMisting: boolean;         // kandebærer
  };
  stages: { xpThreshold: number; trapCount: number }[];
}

interface TrapState { usesLeft: number; digestingUntil: number | null }

interface PlantState {
  id: string;
  speciesId: SpeciesId;
  nickname: string;
  water: number;                   // 0-100
  nutrition: number;               // 0-100
  health: number;                  // 0-100
  xp: number;
  stage: number;
  placement: PlacementId;
  traps: TrapState[];
  dormant: boolean;
  wilted: boolean;
}

interface GameState {
  saveVersion: number;             // til save-migrationer
  lastTickAt: number;              // epoch ms — grundlag for offline catch-up
  rngSeed: number;
  plants: PlantState[];
  inventory: { dewdrops: number; items: string[] };
  weather: { current: 'sun' | 'clouds' | 'rain'; rainBarrel: number };
  achievements: string[];
  settings: { sound: boolean; locale: 'da' | 'en' };
}
```

### 7.4 Tid og offline-progression

- Realtid: planten vokser over timer/dage — det giver den ægte "kig til den hver dag"-følelse.
- Løbende simulering med grov tick (~30 sek.) mens fanen er åben; animationer kører separat via `requestAnimationFrame`.
- Ved load og `visibilitychange` beregnes forskellen fra `lastTickAt` i ét hug (stol aldrig på timere i baggrundsfaner — browsere throttler dem).
- Offline-forfald er **loftet** (~36 timer), og dvale pauser tiden helt: ferie skal aldrig koste en plante.

### 7.5 Persistens

- `localStorage` med `saveVersion` + små migrationsfunktioner pr. versionshop, så gamle saves aldrig knækker.
- Eksport/import af save som fil (backup + flyt mellem enheder) — billig feature, stor tryghed, når der ikke er nogen konto.

### 7.6 Mappestruktur

```
plantespil/
├── src/
│   ├── sim/            # ren spillogik: tick, actions, species, config, save/migrations
│   ├── ui/             # Svelte-komponenter: plantescene, HUD, minigame, butik
│   ├── assets/         # SVG pr. art/stadie, lyde
│   └── main.ts
├── tests/              # Vitest — primært mod src/sim
├── public/
└── .github/workflows/ci.yml
```

### 7.7 Kvalitet

- CI på hver PR: typecheck, lint, test, build.
- Tilgængelighed fra start: kan spilles med tastatur, respekterer `prefers-reduced-motion`, ordentlig kontrast.
- Tekster samles i én da-fil fra dag ét, så engelsk kan tilføjes uden ombygning.

## 8. Faseplan

Estimaterne er kalendertid i hobbytempo (aftener/weekender).

### Fase 0 — Fundament (~1 dag)
- [ ] Vite + Svelte + TypeScript-skelet, ESLint + Prettier, Vitest
- [ ] GitHub Actions: typecheck/lint/test/build
- [ ] Deploy til GitHub Pages
- [ ] README med "sådan kører du det lokalt"

### Fase 1 — MVP: "Én plante lever" (1-2 uger)
*Mål: En Venusfluefanger man reelt kan passe over flere dage — og som gemmes.*
- [ ] Sim-kerne: `GameState`, `tick`, offline catch-up, seedet RNG
- [ ] Stats (vand/næring/sundhed) + placeringer og lys
- [ ] Handlinger: vand, fodr (simpelt klik på fælde), flyt placering
- [ ] Fælde-slid: 3 brug pr. fælde + fordøjelsestid
- [ ] Vækst: XP og 4 stadier med simpel SVG-grafik
- [ ] Visnen + genopretning (ingen permanent død)
- [ ] Save/load i localStorage med versionering
- [ ] UI: plantescene, behovsmålere, handlingsknapper — mobil-først
- [ ] Vitest: forfald, catch-up, vækst, fælde-regler ("7 dages pasning" som test)

**Definition of done:** Kan spilles på telefon og desktop; en uges simuleret pasning opfører sig korrekt; visnen kan altid vendes.

### Fase 2 — Spilfølelse (1-2 uger)
- [ ] Minispillet "Fang fluen" med snap-animation og timing
- [ ] Insekttyper med forskellig værdi + biller der skader fælden
- [ ] Vejrsystem + regnvandstønde (vand bliver en ressource; postevands-dilemmaet)
- [ ] Humør-ikoner og animationer (glad-vip, slatten ved tørst), snap-/regn-lyde
- [ ] Førstegangsflow/tutorial med ægte pasningstips
- [ ] 5-8 achievements

### Fase 3 — Samling og progression (2-3 uger)
- [ ] Dugdråber som valuta (pasning, fangster, milepæle)
- [ ] Butik: frø, potter, growlampe, dekorationer
- [ ] Soldug, kandebærer (dis-handling) og trompetkande med egne profiler og grafik
- [ ] Drivhus-visning med flere planter
- [ ] Artsleksikon med fakta der låses op

### Fase 4 — Sæsoner og dybde (2-3 uger)
- [ ] Årstider + vinterdvale (dvale = feriemode; skippes den, svækkes planten)
- [ ] Blomstrings-dilemmaet: klip stilken eller høst frø
- [ ] Frø → nye planter eller dugdråber
- [ ] Ompotning + hard mode (permanent død som tilvalg)
- [ ] Polering: overgange, tilgængelighed, ydelse, evt. engelsk oversættelse

### Backlog (senere, efter lyst)
PWA + påmindelser ("Din plante er tørstig 🌱") · rigtige vejrdata via API · konto/sky-sync · daglige opgaver · dele/forære frø til venner · vibefedt som art nr. 5.

## 9. Risici og modtræk

| Risiko | Modtræk |
|---|---|
| Scope creep — spillet vokser vildere end planterne | Faserne er værdisluser: hver fase er et spilbart spil. Backloggen er en parkeringsplads, ikke en forpligtelse |
| Grafik æder al tiden | Flad, stiliseret SVG-stil er bevidst billig; start med simple former og opgradér art for art |
| Balancering (rater føles forkerte) | Alle tal i én config-fil; testscenarier simulerer dage på millisekunder; justér efter egne playtests |
| Offline-forfald frustrerer | Loftet forfald, visnen i stedet for død, dvale som feriemode |
| Browser-throttling af timere | Catch-up ved load/`visibilitychange` er kilden til sandhed — aldrig `setInterval`-akkumulering |
| Save-format knækker ved nye features | `saveVersion` + migrationsfunktioner fra første save |

## 10. Åbne spørgsmål

1. **Navn:** "Plantespil" er arbejdstitlen — bud: *Grønne Gab*, *Snap!*, *Fluefælden*, *Dugdråben*.
2. **Sprog:** Kun dansk først (planens antagelse), eller da+en fra start?
3. **Kunststil:** Flad vektor (planens antagelse) eller mere håndtegnet look?
4. **Tempo:** Er realtid over dage det rigtige, eller ønskes hurtigere vækst (timer)?

## 11. Første skridt

Fase 0 kan gå i gang med det samme: projektskelet, CI og Pages-deploy — derefter fase 1's sim-kerne, som er hjertet i det hele.
