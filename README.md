# SuperManager 26/27 — Ediția Supremă (v10.37)

Joc de management fotbalistic pentru SuperLiga 2026/27, livrat ca **o singură pagină HTML autonomă**: React 18 + Tailwind, cu tot bundle-ul (inclusiv fotografiile jucătorilor în `base64`) inline. Nu face **nicio cerere externă** — funcționează complet offline și se instalează pe telefon ca aplicație.

```
public/
  index.html            ← tot jocul (single-file build, ~5.2 MB)
  manifest.webmanifest  ← instalare pe telefon (PWA)
  sw.js                 ← cache offline (network-first pentru HTML)
  icons/                ← set complet de iconițe
server.js               ← server static minimal, fără dependențe
tools/
  dom-harness.js        ← mediu jsdom (WebAudio/canvas/fullscreen stub-uite)
  smoke-test.js         ← testele automate (`npm test`)
  storage-test.js       ← autosalvare + migrarea carierelor vechi
  economy-test.js       ← masa salarială vs buget, salariul antrenorului
  build-icons.sh        ← regenerează iconițele din assets/icon-source.png
```

## Rulare

```bash
npm start          # http://localhost:3000   (PORT=8080 npm start pentru alt port)
```

Fără Node: `npm run serve:python`, sau deschide direct `public/index.html`. Atenție însă: pe `file://` unele browsere blochează `localStorage`/`IndexedDB`, deci salvările carierei nu persistă — folosește serverul.

## Testare

```bash
npm test           # ≈35s — integritate date + storage + economie + boot, carieră nouă, toate secțiunile, un meci live, salvarea, accesibilitatea
npm run test:data  # ≈0.2s — doar verificările de date
npm run test:storage # ≈6s — autosalvarea și migrarea din cheia veche
npm run test:economy # ≈6s — masa salarială față de bugetul de salarii
npm run test:quick # ≈8s  — fără meci
```

`tools/data-check.js` validează datele din bundle (50 de verificări): fiecare club are antrenor, flag-ul U21 respectă limita de vârstă, loturi fără nume/numere duplicate, `pot ≥ ovr`, `shortName` unic și fără coliziune cu codurile UEFA, toate imaginile referite există în bundle, viewport-ul permite zoom, iar motorul live avansează pasul de simulare cu ceasul meciului (nu încărcat de două ori de viteza de joc) autosalvarea scrie într-o singură cheie `localStorage`, clasele de font mici sunt ridicate la 12px, iar jocul nu încarcă nicio resursă de pe alt domeniu.

Testele încarcă bundle-ul real într-un DOM jsdom și verifică 34 de puncte din fluxul principal:

- aplicația bootează și randează ecranul de titlu, fără erori în consolă;
- onboarding-ul (cluburi, arhetipuri de manager) și intrarea în carieră;
- toate cele 7 secțiuni (Centru Comandă, Lot, Clasament, Cupe, Mercato, Academie, Viață) se randează;
- meciul live pornește, ceasul avansează, pauza de la 45' apare și repriza a doua reia jocul;
- cariera se salvează în `localStorage` (~420 KB) și în IndexedDB.

Rulează automat în CI la fiecare pull request. Grafica 3D, sunetul și interacțiunea reală cu degetul nu pot fi acoperite în jsdom — pentru ele e nevoie de un browser.

## Instalare pe telefon

Deschide adresa în Chrome/Safari → *Add to Home Screen*. Jocul pornește fullscreen (fără bara de browser), iar după prima încărcare merge și offline, datorită service worker-ului.

În WebView-ul Android, butonul de ecran complet folosește `window.AndroidBridge.toggleImmersive()` dacă e disponibil, altfel Fullscreen API.

## Deploy

Gata pregătit pentru **GitHub Pages** (`.github/workflows/deploy-pages.yml`): la fiecare push pe `main`, rulează testele rapide și publică `public/`.

Ca să funcționeze: *Settings → Pages → Source: GitHub Actions*, apoi rulează workflow-ul *Deploy pe GitHub Pages*. Site-ul apare la `https://<user>.github.io/Supermanager/`.

Orice alt hosting static merge la fel (Netlify, Vercel, Cloudflare Pages, S3): se publică directorul `public/`, fără build step.

## Ce conține jocul

- **16 cluburi din SuperLiga** (FCSB, Rapid, Dinamo, CFR, Universitatea Craiova, Farul etc.) plus cluburile europene din cupe.
- **Carieră completă**: alegerea clubului, a arhetipului de manager (Fost Internațional, Obsedat Tactic, Strateg Monden, Mână de Fier) și a dificultății (Normal / Realist / Hardcore).
- **7 secțiuni**: Centru Comandă, Lot & Tabla XI, Clasament & Etape, Cupe & Europa, Mercato & Scouting, Academie & Club, Viață & Relații.
- **Meci live** cu motor de simulare pe faze (șuturi, cornere, cartonașe, VAR, penalty-uri, accidentări), comentariu, xG, vizualizare 2D tactică și 3D (WebGL), viteză 1x–8x, indicații tactice din bancă și discurs la pauză.
- **Tactici**: formație, linie, lățime, pase, pressing, roluri individuale, planuri de antrenament, moral și coeziune.
- **Transferuri și negocieri**: piață internă și externă, împrumuturi, agenți, oferte, contracte, salarii, buget.
- **Sisteme în afara terenului**: patron și consiliu, presă cu conferințe, peluză/ultras, viață personală și relații.
- **Salvare**: 5 sloturi + autosave în `localStorage` (`supermanager_26_27_pro2d_v2`) și IndexedDB (`supermanager-26-27-autosave`), cu import/export de carieră portabilă.

## Note tehnice

- Bundle-ul este **minificat** (Vite single-file): `public/index.html` este artefactul, nu sursa. Modificările făcute direct în el sunt limitate intenționat la `<head>` (meta/iconițe/manifest) și la înregistrarea service worker-ului de la final — codul jocului e neatins.
- Scriptul și iframe-ul injectate de Cloudflare Challenge (`__CF$cv$params`, `/cdn-cgi/challenge-platform/…`) la salvarea paginii din browser au fost eliminate.
- `server.js` servește HTML-ul, `sw.js` și manifestul cu `no-cache`, restul cu cache lung; are ETag, MIME corect, doar GET/HEAD și protecție la path traversal.
- La o versiune nouă de joc, crește `CACHE_VERSION` din `public/sw.js` ca să se invalideze cache-ul offline.
- **Antrenorii și arenele** sunt date reale pentru sezonul 2026/27, verificate în noiembrie 2026 (Wikipedia — *SuperLiga României 2026-2027*, GSP). Cluburile europene folosesc cele mai recente informații disponibile. Regula U21 respectă definiția jocului („cel mult 21 de ani").

## Reparații aplicate în v10.37.1 (noiembrie 2026)

- **Motor live sub-calibrat.** Pasul de simulare (`_stepSubtick`) împărțea încă o dată la viteza de joc, așa că la 8x ceasul avansa de 8 ori mai repede decât fotbalul: un meci întreg producea ~2.8 șuturi și 0 goluri. Acum pasul avansează cu ceasul; măsurat pe 45 de minute × 6 rulări la 1x și 8x: **≈10 șuturi și ≈2 goluri pe meci**, cu rezultate identice la orice viteză (simularea instantanee dă 2.88 goluri/meci).
- **Salvare dublată.** Fiecare autosalvare scria aceeași carieră (~420 KB) în două chei `localStorage`, riscând să umple cota de 5 MB. Acum se scrie doar în `sm2627_career_slot_N`; carierele vechi, salvate doar sub `supermanager_26_27_pro2d_v2`, sunt migrate automat la prima pornire și cheia veche e ștearsă (`npm run test:storage`).

## Reparații aplicate în v10.37.2 (noiembrie 2026)

- **Economia cluburilor.** Bugetul lunar de salarii era în afara oricărei scale: la cluburile europene valora **14–19 milioane/lună** (de fapt un buget de transferuri copiat greșit), adică **~2%** acoperire, iar în România 33–65%. Antrenorul câștiga mai mult decât cel mai bine plătit jucător la **24 din 24** de cluburi (la FCSB 18.500 față de 8.000; la Real Madrid 185.000 față de 23.500). Acum fiecare club are masa salarială la **70–73% din buget**, ca bugetul să fie o constrângere reală, iar antrenorul câștigă 1.2× cât starul lotului (`npm run test:economy`).
- **Accesibilitate.** Cele 347 de texte de 8–11px urcă la minimum **12px** printr-un strat CSS peste utilitarele Tailwind; focus vizibil la navigarea din tastatură; `prefers-reduced-motion` respectat. Un strat mic de JS pune `aria-label` pe butoanele doar cu iconiță (luat din `title`) și marchează iconițele decorative ca `aria-hidden`. Verificat în DOM: **fiecare buton are nume accesibil, fiecare imagine are `alt`**.
- **Igienă.** `window.AndroidBridge` nu e cod mort, ci un cârlig opțional pentru ambalajul Android (`stopSpeak`, `toggleImmersive`) — e păstrat, dar fiecare apel e deja gardat cu verificare de tip. Offline-ul e acum garantat și prin test: nicio resursă (`src`, `href`, `url()`) nu vine de pe alt domeniu.

## Reparații aplicate în v10.37.3 (noiembrie 2026)

- **Meciul nu mai e întrerupt de decizii.** Popup-urile de pe margine (minutul 25–30, 59–64, 74–78, cartonaș galben/roșu, penalty) și blocul de pauză cu „Corecții Tactice pe Tablă” + „Dialog 1-la-1” au fost eliminate. Meciul curge continuu de la fluierul de start până la final; pauza arată doar scorul și butonul „Începe Repriza a Doua”. Butoanele de indicații de pe bancă rămân — sunt opționale, le apeși tu.
- **Text corectat:** „kamerele noastre” → **„camerele noastre”** (reporterul de teren).
- **Reacțiile jucătorilor urmează rezultatul.** După fiecare etapă, știrile includ o declarație a celui mai bun jucător al meciului, construită din rezultatul real: victorie → „Am dat totul pentru culori…”, egal → „Un punct luat, dar gustul e amar…”, înfrângere → „Ne asumăm înfrângerea…”. Textul conține scorul exact (ex. „după FCSB 2-2 CSI”) și nota jucătorului; testul verifică în DOM că formularea se potrivește cu scorul.

## Reparații aplicate în v10.37.4 (noiembrie 2026)

- **Mesajele ignorate din telefon dor real.** La fiecare etapă nouă, mesajele din etapa precedentă la care nu ai răspuns se marchează ca expirate și produc consecințe mecanice: patronat **−6%** (patronul) sau −1…−2% (agent/vestiar), coeziune **−2…−5%** (vestiarul), galerie −1% (agentul), plus −8 moral pe jucătorul nemulțumit. Știrile primesc o linie „📱 Ai ignorat N mesaje… Tăcerea costă”, deci efectul e vizibil imediat în panoul de club. Penalizarea e plafonată (max −14% patronat, −14% vestiar, −6% galerie pe etapă), ca să nu prăbușească cariera dintr-un singur pas.
- **Războiul psihologic și spionajul au fost eliminate complet.** Secțiunea „🕵️ Război Psihologic & Spionaj Pre-Meci” (provocare în presă, scouter-spion, zvon de transfer) a dispărut din panoul de pregătire, împreună cu handlerul, lista de operațiuni și generatorul de efecte. Nu mai există costuri de buget, rivalități de antrenor sau impulsuri pentru adversar din aceste acțiuni.
- **Ofertele și nemulțumirile ajung pe telefon.** Telefonul lui Mister primește acum, pe lângă mesajele patronului și ale căpitanului: ofertele de transfer (cu numele clubului, suma oferită, nota din ultimul meci și golurile/pasele decisive) și nemulțumirile jucătorilor cu moral scăzut. Oferta se poate **accepta, amâna sau refuza direct din telefon** — acceptarea intră în circuitul normal de transfer (intrări de bani, efect pe patronat/vestiar/peluză).
- **Valoarea ofertei depinde de valoare ȘI de performanță.** Taxa de transfer = valoarea de piață × multiplicator de fereastră × (1 + forma din ultimul meci + goluri/pase în meciul respectiv + randamentul pe sezon + corecție de vârstă). Un jucător cu notă mare și goluri primește cu până la ~45% peste valoarea de piață; unul în formă slabă, sub ea. Pragul de declanșare a scăzut de la nota 8.1 la 7.6 (sau un gol/pasă decisivă), ca ofertele să apară constant, dar tot pe merit.
- **Mai puțină repetitivitate.** Reacțiile de după meci și mesajele patronului au acum câte trei variante de text pe fiecare rezultat (victorie/egal/înfrângere), alese aleator — nu mai vezi aceeași frază etapă după etapă.
- **Deciziile au rămas, dar fereastra lor nu mai ocupă ecranul.** Panoul de decizie (`nh`) e acum un card compact de maximum 2xl lățime și 72% din înălțime, ancorat jos, cu o bandă de imagine de 96–112px în loc de 256–320px, pe fundal semitransparent — poți vedea clubul din spate în timp ce decizi.

## Reparații aplicate în v10.37.5 (noiembrie 2026)

- **Jucătorul singur șutează, nu mai întoarce mingea.** Ordinea deciziilor purtătorului de minge a fost rescrisă: șutul se evaluează acum **înaintea** centrării (până acum centrarea putea fura ocazia, cu o rată de până la ~48%/secundă la sub 16 m), iar centrarea e stinsă la 35% când jucătorul are spațiu.
- **Multiplicator de ocazie clară.** Dacă cel mai apropiat adversar de câmp e la peste 3 m și jucătorul e la sub 36 m de poartă, șansa de șut crește de 1,8× (33–36 m), 2,4× (26–33 m), 3× (18–26 m) și 3,6× (sub 18 m), iar apetitul de pasă scade la 35%. Unghiurile foarte strâmte nu mai blochează 80% din șuturi când ești singur (doar 58%).
- **Fără pasă înapoi în treimea ofensivă.** În ultimii 38 m, `_findBestPassTarget` respinge orice coleg care nu e cu cel puțin 0,8 m mai aproape de poartă — dacă nu există variantă în față, jucătorul continuă acțiunea (dribling/șut) în loc să returneze la mijlocași.
- **Pasa de panică (watchdog) nu mai merge în spate.** Când mingea stă prea mult la un jucător, mecanismul de degajare alegea un coleg la întâmplare din primii trei; acum preferă numai colegi aflați în fața purtătorului.
- **Măsurat pe 4+4 meciuri simulate:** pasele din treimea ofensivă au scăzut de la 20 la 6, cele înapoi de la 4 la 1, iar șuturile au crescut de la 42 la 46. `data-check` are 6 verificări noi care blochează regresii (ordinea șut/centrare, multiplicatorul, filtrul de pasă înapoi, watchdog-ul).

## Reparații aplicate în v10.37.6 (noiembrie 2026)

- **Simularea nu mai intră în spirala de lag.** Bucla de fizică rula până la **36 de substeps pe cadru** (`min(36, ceil(s/.008))`): dacă un cadru dura mult, motorul adăuga muncă exact când era mai încet. Acum pasul e fix (8 ms) și se plafonează **timpul simulat pe cadru la 128 ms** (max 16 substeps) — când dispozitivul nu ține ritmul, meciul înaintează puțin mai încet în loc să sacadeze. Fizica rămâne identică (același pas), deci rezultatele meciurilor nu se schimbă: măsurat pe 3+3 meciuri, șuturi 42 → 44, goluri 2 → 2.
- **Calitate 3D adaptivă.** Bucla de randare măsoară media ultimelor 24 de cadre și coboară pe trepte: pixel ratio 1.35 → 1.12 → 1.0, ceață mai densă (draw distance mai mic), iar publicul instanțiat se animă la 12 Hz în loc de 20 Hz pe treapta minimă. Revenirea se face doar sub 12.5 ms/cadru, ca să nu „pompeze”.
- **Randarea se oprește când tabul e ascuns** (economie de baterie și CPU), iar la revenire ceasul nu sare — delta e oricum plafonat la 50 ms.
- Instrumentat în jsdom: 15.7 → 14.7 substeps/cadru la 8x pe un cadru sănătos, cu plafon dur la 16 în loc de 36 când cadrele se lungesc.
