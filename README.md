# SuperManager 26/27 — Ediția Supremă (v10.39)

Joc de management fotbalistic pentru SuperLiga 2026/27, livrat ca **o singură pagină HTML autonomă**: React 18 + Tailwind, cu tot bundle-ul (inclusiv fotografiile jucătorilor în `base64`) inline. Nu face **nicio cerere externă** — funcționează complet offline și se instalează pe telefon ca aplicație.

```
public/
  index.html            ← tot jocul (single-file build, ~5.5 MB)
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

`tools/data-check.js` validează datele din bundle (79 de verificări): fiecare club are antrenor, flag-ul U21 respectă limita de vârstă, loturi fără nume/numere duplicate, `pot ≥ ovr`, `shortName` unic și fără coliziune cu codurile UEFA, toate imaginile referite există în bundle, viewport-ul permite zoom, iar motorul live avansează pasul de simulare cu ceasul meciului (nu încărcat de două ori de viteza de joc) autosalvarea scrie într-o singură cheie `localStorage`, clasele de font mici sunt ridicate la 12px, iar jocul nu încarcă nicio resursă de pe alt domeniu.

Testele încarcă bundle-ul real într-un DOM jsdom și verifică **138 de puncte** din fluxul principal:

- aplicația bootează și randează ecranul de titlu, fără erori în consolă;
- onboarding-ul (cluburi, arhetipuri de manager) și intrarea în carieră;
- toate cele 8 secțiuni (Centru Comandă, Lot, Clasament, Cupe, Mercato, Academie, Viață, Profil) se randează;
- meciul live pornește, ceasul avansează, pauza de la 45' apare și repriza a doua reia jocul;
- profilul de antrenor: avatarul se desenează, editorul are 38 de presetări, boosturile sunt plafonate, omogenitatea are motive pe fiecare legătură;
- selecționerul: pool-ul are doar români, lotul de 23 e validat, 4 portari sau un lot incomplet sunt respinse;
- schimbul de poziții din meci se execută și confirmă adaptarea −12%;
- socoteala jucătorului nemulțumit: liderii vestiarului, matricea patron/lideri, costul fiecărei căi de ieșire, cele 3 variante din cererea de plecare, plafonul de 2 conflicte pe etapă;
- cariera se salvează în `localStorage` (~535 KB) și în IndexedDB.

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

## Modificări în v10.40.0 (noiembrie 2026) — mesajele încetează să mai mintă

- **Golaverajul număra doar golurile tale.** `careerStats` primea doar marcatorii echipei tale, așa că un 0-1 apărea ca „0-0” în profil. Acum socoteala primește ambele rezultate — un 0-1 se vede corect ca `gf 0, ga 1`, iar în deplasare un 2-1 al adversarului devine `1:2`.
- **Mesajul căpitanului folosește minutele reale.** `_smCaptainPick()` alege rezerva care **chiar a intrat pe teren** (cele mai puține minute, dar peste zero) și pune cifrele ei în text. Dacă nimeni de pe bancă nu are minute, mesajul devine neutru — nu mai spune „e cam abătut” despre un jucător cu 0 minute jucate.
- **Patronul cere doar jucători apți, cu puține minute, și nu repetă cererea.** Cererea de titularizare (`xA`) trece prin `_smFitPlayer` (accidentați/suspendați excluși), cere **cel puțin un meci jucat** în carieră, vizează jucători cu **sub 180 de minute** și cel mult o titularizare, iar același jucător nu mai e cerut **6 etape**. Înainte de primul meci jucat patronul nu cere nimic.
- **Fereastra de expirare a mesajelor s-a mutat la o etapă, iar etapa de intrare e protejată.** Un mesaj generat în etapa N expiră abia când intri în etapa N+1 („Expiră la Etapa N+1”), deci ai o etapă întreagă să răspunzi. Mesajele generate în **etapa 1** (momentul intrării în carieră) nu expiră niciodată — telefonul le arată cu „🕊️ Mesaj de început de sezon — fără termen, nu te taxează”.
- **Testat:** smoke test-ul a crescut de la 124 la **138 de verificări** — golaveraj corect acasă/deplasare, înfrângere 0-1 acumulată, mesajul din etapa 1 niciodată taxat, expirarea mutată la o etapă, căpitanul care alege o rezervă cu minute reale (și varianta neutră), patronul care cere doar jucători apți/fără minute/nereluat 6 etape. `data-check` rămâne la 79, storage 7, economy 6.

## Modificări în v10.39.0 (noiembrie 2026) — socoteala jucătorului nemulțumit

- **Evidență de minute pe fiecare jucător.** `appsThisSeason`, `startsThisSeason`, `minutesThisSeason`, `lastStartRound` se acumulează la fiecare etapă (90 de minute pentru titulari, 25 pentru cei intrați de pe bancă) și se resetează la începutul sezonului. Socoteala are cifre: „0 meciuri (0 ca titular) și 0 minute în acest sezon”.
- **Cine te ia la întrebări.** Un jucător care nu e portar îți cere socoteala dacă are **moralul sub 52** *sau* dacă are **OVR ≥ 72, vârstă ≥ 23 și cel mult un meci ca titular după etapa 6** — adică exact cazul „jucător bun, lăsat pe bancă”. Doar jucători apți, cel mult **2 conflicte pe etapă**, iar un conflict deschis nu se dublează.
- **Liderii vestiarului decid cât de mult poți promite.** `_smLeaders()` = **căpitanul + veteranii (28+ ani, OVR ≥ 72)**; `_smLeaderSupport()` = media moralului lor **ponderată cu OVR**. Se combină cu încrederea patronului (`boardConfidence`) și decid ce variante primești.
- **Variantele de soluționare** (fiecare arată în text patronul și liderii, ca să știi pe ce te bazezi):
  - **promisiune de titularizare** — +8 moral, +2% vestiar, +1% patron; dacă liderii sunt sub 40% costă −4% coeziune, iar dacă patronul e sub 40% costă −4% încredere;
  - **explicația rolului** — +3 moral și +2% vestiar cu lideri puternici, doar +1 moral fără ei;
  - **primă de joc** — 2 salarii din contul tău, +10 moral, +2% vestiar (ascunsă dacă patronul e sub 45% sau nu ai bani);
  - **disciplină (tribune)** — apare doar când e sigură (patron puternic + lideri puternici, sau patron ≥ 60% cu lideri slabi); forțată când vestiarul nu te susține → −12 moral, −8% vestiar, −2% patron;
  - **lista de transfer** — valoare −10%, moral +4, patron +2%;
  - **„nu comentez acum”** — −10 moral, −4% vestiar și pornește ceasul conflictului.
- **Cererea oficială de plecare.** Apare când **nu mai există cale de împăcare**: (a) patronul **și** liderii sunt sub 40%, (b) a trecut **o promisiune încălcată**, sau (c) au trecut **2 etape** de la discuție fără îmbunătățire (moral sub 45). Are exact trei căi:
  - **împrumut până în vară** — pleacă din lot, clubul plătește 50% din salariu, vestiar −2%, patron +1%;
  - **listă de transfer** — rămâne, dar e marcat (valoare −10%), moral +4, patron +2%;
  - **liber de contract** — plătești salariile rămase din contract (−4% patron); **dacă încrederea patronului e sub 40%, patronul acoperă el rezilierea** (0 € din bugetul clubului, dar −8% încredere).
- **Conflictul se vede în profil**, la secțiunea „Conflicte deschise & cereri de plecare”: cine e nemulțumit, ce cifre are, cine e pe lista de transfer și cine are promisiune încălcată — plus patronul și sprijinul liderilor, ca să știi dinainte ce variante vei avea.
- **Testat:** smoke test-ul a crescut de la 101 la **124 de verificări** — liderii (căpitan + veterani, ponderat cu OVR), matricea patron/lideri, costul rezilierii cu patron mulțumit vs nemulțumit, cele 3 căi de ieșire, efectele promisiunii în funcție de vestiar și patron, plafonul de 2 conflicte pe etapă și nereluarea unui conflict deschis.

## Modificări în v10.38.0 (noiembrie 2026) — profilul antrenorului, boosturi plafonate, selecționer și omogenitate

- **Profil de antrenor (secțiune nouă „Profil”).** Un card complet de carieră: meciuri jucate, **V-E-Î**, golaveraj, rată de victorie, trofee, sezon și etapă, reputație, carismă, jucători aduși prin transfer și obiecte deținute. Contoarele se acumulează în motor (`careerStats`, actualizat la fiecare meci jucat) și se salvează odată cu cariera.
- **Editor de avatar din presetări.** **6 tenuri × 8 coafuri × 6 ținute**, plus 6 accesorii și 4 tipuri de barbă — **38 de presetări**, fără slidere, fiecare aplicată instant. Avatarul e desenat ca SVG (fără asset-uri) și apare în profil; alegerea se salvează în carieră (`manager.avatar`) și supraviețuiește reload-ului.
- **Obiectele cumpărate se văd pe tine.** Costumul croit pe comandă adaugă revere și nasturi aurii, ceasul elvețian apare ca badge ⌚, iar în profil lista „Pe tine” arată ce ai cumpărat — casă, mașină, garderobă, investiții.
- **Fiecare achiziție dă un boost vizibil, dar plafonat.** Carisma și reputația sunt afișate ca **„brut → plafonat”**: contribuția maximă e **+8 pe atribut**, iar după +5 randamentul scade la jumătate pentru fiecare punct (`5 + (brut − 5) × 0,5`). În meci, tot ce ai cumpărat se traduce într-un **bonus de echipă de maximum +0,4 OVR** (`0,03 × carismă + 0,02 × reputație`, plafonat), aplicat în `vt()`. Cumpărăturile noi adaugă doar delta plafonată (`_smItemDelta`), deci nu mai poți ajunge la carismă 100 cumpărând șapte costume.
- **Bonusuri active.** Secțiune în profil cu cele trei valori (carismă, reputație, bonus de meci), totalul brut și lista obiectelor cu contribuția fiecăruia.
- **Simulare în cupe.** Două butoane noi în „Cupe & Europa”: **„Simulează runda de cupă”** (joacă tie-ul tău și calculează automat toate celelalte meciuri din aceeași rundă) și **„Simulează tot parcursul european”**, care rulează unul după altul toate meciurile rămase din faza curentă, cu rezultate reale.
- **Selecționer: lotul naționalei din toate campioanele.** Panou nou când ești selecționer: pool-ul adună **toți jucătorii români** — SuperLiga, Top Europa și liberi de contract — cu filtre pe post, OVR minim, vârstă maximă, club și căutare după nume. Reguli FRF respectate: **lot de 23**, **maximum 3 portari**, **doar jucători apți** (accidentații, suspendații și cei cu refacere fizică sunt respinși). Buton „Completează automat (23)” și contor live `23/23`, portari, omogenitate. Lotul convocat (`ntSquad`) se salvează în carieră și **intră efectiv în meciurile naționalei** (live și simulate), cu bonusul de chimie al selecționatei.
- **Fix de identitate:** clubul naționalei avea `id: "nt_romania"`, dar fixtures-urile și codul de meci foloseau `"romania_nt"` — deci naționala nu se rezolva corect. Aliniat la `"romania_nt"`.
- **Omogenitate din relațiile reale.** Chimia nu mai e doar „aceeași naționalitate”: fiecare legătură dintre doi jucători apropiați pe teren adună **naționalitate (+18)**, **aceeași limbă (+9)**, **mentorat (+28)**, **moral ridicat la amândoi (+10)**, **vârstă apropiată (+4)**, **experiență comună (+3)**, și scade la **limbi diferite (−6)** sau **moral scăzut (−22)**. Fiecare legătură are motivele scrise în clar, iar profilul arată scorul, numărul de legături și **cele mai slabe trei legături** — exact acelea care scad precizia pasei. Funcționează la club **și la națională**.
- **Schimbarea pozițiilor în timpul meciului.** În tabul „Tactică” din meciul live, alegi doi jucători și apeși **„Schimbă pozițiile”**: își inversează rolul, ancora și poziția pe teren, iar ambii primesc o **penalizare de adaptare de −12% la pas, șut și dribling pentru 6 minute**. Schimbarea formației în meci aplică și ea un **șoc de reorganizare** (−0,18 bonus de echipă, 8 minute). Ambele expiră singure, prin `_adaptTick()` din bucla motorului.
- **Testat:** smoke test-ul a crescut de la 72 la **101 verificări** (profil, avatar, plafoane, motivele omogenității, lotul de 23, filtrele, schimbul de poziții cu confirmarea adaptării, bara de simulare în cupe); `data-check` rămâne la 79, storage 7, economy 6.

## Modificări în v10.37.9 (noiembrie 2026) — telefonul care te taxează, simulare de sezon

- **Mesajele ignorate te costă bani.** Până acum telefonul nerespectat însemna doar încredere și coeziune pierdute; acum fiecare mesaj expirat aplică o taxă în bugetul clubului: **patronat 80.000 €**, agent 35.000 € (+3.000 € din contul personal), vestiar 25.000 €, presă 15.000 €. Plafon **250.000 € pe etapă**, ca o etapă în care n-ai intrat în joc să nu te falimenteze.
- **Escaladare la repetiție.** Dacă ignori același expeditor în două etape consecutive, taxa crește **×1,5**, apoi **×2,5**; după a treia ignorare conducem cu încrederea afectată suplimentar.
- **Persoana te ceartă.** Pe lângă taxă, expeditorul îți scrie un mesaj de reproș (text diferit pe fiecare treaptă) și primești o replică vorbită cu numele și portretul lui. Cardul de reproș rămâne în telefon, cu suma exactă reținută.
- **Expirarea e vizibilă.** Fiecare mesaj nerezolvat arată **„⏳ Expiră la Etapa N"**; după expirare devine **„⌛ Expirat — taxat X €"** și se arhivează automat după 3 etape, ca inboxul să nu se umple.
- **Simulare până la etapa X.** Butoane în bara de sus și pe Centru Comandă: **Tur (15)**, **Sezon (30)** și o etapă țintă introdusă manual, cu buton **Stop** care se oprește curat la finalul etapei. Simularea folosește același motor de rezultate ca „Simulează meciul" și rulează toată conducta de după meci (clasament, bani, salarii, mentenanță, accidentări, moral, știri), dar fără 3D și fără decizii în meci.
- **Mod neutru, cum ai cerut:** în timpul simulării mesajele de pe telefon primesc răspuns automat neutru — **fără taxe, fără ceartă, dar și fără bonusuri** — iar conferințele de presă sunt sărite. Evenimentele și modalurile sunt oprite cât rulează simularea, ca să nu-ți sară ferestre peste ecran.
- **Raport la final:** V-E-Î, golaveraj, locul în clasament, în știri și în jurnalul de decizii.
- **Bonus, un bug vechi reparat:** simulatorul rapid de rezultate primea bonusul de manager ca obiect (`{bonus: 3.2}`) în loc de număr, deci toate meciurile „simulate" din cupă/națională ieșeau **0-0**. Acum bonusul e numeric și rezultatele sunt reale.
- **Ecranul de start:** descrierea arhetipului selectat se afișează integral (era tăiată la 2 rânduri de `line-clamp-2`); cele neselectate rămân pe două rânduri, ca lista să rămână compactă.
- **Testat:** `data-check` a ajuns la **79 de verificări**, smoke test-ul la **72** — verifică taxele pe roluri, escaladarea ×1,5/×2,5, plafonul, mesajul de reproș în DOM, expirarea taxată și simularea care duce cariera de la etapa 2 la 15 fără erori.

## Modificări în v10.37.8 (noiembrie 2026) — progresia facilităților costă

- **Curba de cost a facilităților e exponențială.** Înainte, modernizarea costa `baseCost × nivel` (140k → 280k → 420k pentru gazon): toate cele patru facilități la maxim însemnau **3,3 mil. €**, bani de o singură fereastră de transfer. Acum multiplicatorii sunt `[2, 6, 16]`, cu factor de dificultate (0,85 normal / 1,0 realist / 1,2 hardcore):

  | Facilitate | 1→2 | 2→3 | 3→4 | Total |
  |---|---|---|---|---|
  | Gazon hibrid | 280k | 840k | 2,24M | **3,36M** |
  | Clinică crio | 260k | 780k | 2,08M | 3,12M |
  | Peluză & Loje VIP | 350k | 1,05M | 2,80M | **4,20M** |
  | Centru video | 220k | 660k | 1,76M | 2,64M |

  Toate patru la maxim: **13,32 mil. €** (×4 față de înainte).

- **Mentenanță lunară de 2% din valoarea investită.** La nivelul 4, gazonul costă 67k/lună, iar tot setul **266k/lună** (≈2,4 mil. € pe sezon). Se scade în bilanțul lunar, lângă salarii; dacă duce bugetul pe minus, conduci în deficit (−6% încredere).
- **Upgrade-ul nu mai e instant.** Apeși butonul, plătești, dar nivelul nou se activează abia la **recepție, după 7 etape** (10 dacă prinde întârziere). Până atunci rămâne activ nivelul vechi — deci șantierul suspendă avantajul, iar lucrările se văd pe teren la momentul greșit dacă nu le planifici.
- **Un singur șantier simultan.** Nu mai poți cumpăra toate cele patru modernizări în aceeași etapă.
- **Risc de execuție:** 12% șansă de depășire de buget (+15% la cost) și 8% șansă de întârziere (+3 etape), anunțat pe card.
- **Porți de acces pe nivel:** nivelul 3 cere loc de playoff (top 6), nivelul 4 cere loc de cupe europene (top 3) — evaluate pe clasamentul live. Peluza VIP nu mai poate sări la „Arenă Fortăreață” din postura de locul 12.
- **Bonusul gratuit de +3 suporteri la fiecare upgrade a fost eliminat.**
- **Schimbarea politicii de bilete costă bani și timp:** 25k + 200 € pe punct de suporter (≈38k), maximum o dată la 8 etape (2 luni), iar primele 2 etape încasările scad cu 20% până se recalibrează ticketing-ul.
- **Promisiunile încălcate costă bani,** nu doar moral: pe lângă −14 moral și −6% coeziune, clubul plătește 3 salarii compensație jucătorului nemulțumit.
- **Testat:** `data-check` a crescut la **66 de verificări** (curba de cost, mentenanța, șantierul, porțile, riscul, costul biletelor, compensația), iar smoke test-ul la **42** — verifică în DOM real costurile din panou, scăderea din buget, blocajul „un singur șantier” și costul schimbării politicii de bilete.

## Reparații aplicate în v10.37.7 (noiembrie 2026)

- **Texturile jucătorilor se generează la rezoluția potrivită dispozitivului.** Fiecare din cei 22 de jucători primiți în scenă avea o textură de tricou de 1024×512 și una de față de 512×512, adică ~3 MB de VRAM fiecare (~66 MB pe meci). Pe dispozitive slabe (DPR ≥ 2,5 sau ≤ 4 nuclee) canvas-ul se creează la jumătate (512×256, respectiv 256×256) și se desenează cu `ctx.scale(0.5)`, deci toate coordonatele rămân neschimbate: **~66 MB → ~16,5 MB** (−75%).
- **Anizotropia scade la 2 pe dispozitivele slabe** (era 4) — mai puțin cost de filtrare la unghi ras pe texturile de tricou și față.
- **Capetele au mai puține segmente**: 18×14 în loc de 22×18 (~−36% triunghiuri pe cap), invizibil la distanța camerei de meci.
- Euristica e evaluată o singură dată, la pornire: desktop cu multe nuclee și DPR mic păstrează texturile la rezoluție maximă.

