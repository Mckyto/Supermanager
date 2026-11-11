# SuperManager 26/27 — Ediția Supremă (v10.55.2)

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
  face-library.json      ← specificația celor 80 de fețe de jucător
  coach-library.json     ← specificația celor 24 de portrete de antrenor
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

`tools/data-check.js` validează datele din bundle (155 de verificări): fiecare club are antrenor, flag-ul U21 respectă limita de vârstă, loturi fără nume/numere duplicate, `pot ≥ ovr`, `shortName` unic și fără coliziune cu codurile UEFA, toate imaginile referite există în bundle, viewport-ul permite zoom, iar motorul live avansează pasul de simulare cu ceasul meciului (nu încărcat de două ori de viteza de joc) autosalvarea scrie într-o singură cheie `localStorage`, clasele de font mici sunt ridicate la 12px, iar jocul nu încarcă nicio resursă de pe alt domeniu.

Testele încarcă bundle-ul real într-un DOM jsdom și verifică **210 puncte** din fluxul principal:

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

## v10.55.2 — Radio doar cu subtitrare

- În Radio Live, zona de simulare afișează doar comentariul live sub formă de subtitrare, fără istoricul fazelor sau filtrul radio. Subtitrarea rămâne vizibilă în Radio chiar dacă este dezactivată în celelalte moduri; bannerele, reluarea și graficele TV nu o mai acoperă. Scorul, comenzile, pauza și modurile 2D/3D rămân disponibile.

## v10.55.1 — avertismente, Radio și reproșuri personalizate

- Înainte de simularea unei etape sau a mai multor etape, dacă există mesaje care așteaptă răspuns, apare o confirmare cu numărul lor și riscul expirării. Poți anula și deschide telefonul sau continua. Simularea în bloc avertizează și că mesajele noi pot expira pe parcurs.
- Radio Live are filtre pentru toate fazele sau doar goluri, ocazii mari, parade și cartonașe. Filtrarea nu modifică meciul, viteza ori scorul.
- Reproșurile folosesc contextul mesajului (transfer, nemulțumire sau mesaj personal), încrederea în relație și ignorările repetate. Mesajele importante sunt marcate, iar regulile existente pentru consecințe rămân neschimbate.
- Teste pentru confirmare/anulare, simulare în bloc, filtrul radio și personalizarea reproșurilor.

## v10.55.0 — Radio Live și mesaje cu termen

- „Radio Live” înlocuiește „Highlights 3D”: afișează comentariul și fazele produse de același motor al meciului, fără teren 3D. Scorul, comenzile, pauza și viteza aleasă rămân comune cu 2D/3D; poți comuta în timpul meciului.
- Mesajele care necesită răspuns sunt disponibile în etapa în care au fost primite. La trecerea în etapa următoare dispar din telefon și nu mai pot fi răspunse, inclusiv mesajele de început de sezon și cele din salvări vechi. Expeditorul trimite un reproș, iar consecințele se aplică o singură dată; ofertele de transfer ignorate sunt retrase. Mesajele răspunse și reproșurile rămân vizibile.
- Regula se aplică și în simularea în bloc: dacă simulezi peste o etapă fără să răspunzi, mesajele se consideră ignorate. Taxele pe etapă rămân plafonate; sumele din reproșuri reflectă plafonul aplicat.
- Teste pentru comutarea Radio/2D, expirare, reproșuri, protecție împotriva răspunsurilor târzii și simularea în bloc.

## v10.54.9 — flancuri corecte pe tabla tactică

- Tabla folosește acum aceleași posturi și aceeași ordine ca autoselecția și motorul de meci. Formațiile generate plasează RB/RWB/RM/RW pe dreapta și LB/LWB/LM/LW pe stânga; ordinea posturilor din 4-2-3-1 a fost corelată cu motorul.
- Eticheta indică postul ocupat pe teren, nu postul natural al jucătorului; la o rocadă se mută jucătorii, nu etichetele posturilor. Salvările și schimbările manuale nu sunt suprascrise. Pentru refacerea automată a echipei, folosește „Auto-Selecție Optimă XI”.
- Teste pentru toate cele 20 de sisteme, autoselecția Crețu/Radunović, schimbarea formației și rocada din interfață.

## v10.54.8 — radar mobil și mod Highlights 3D

- Radarul tactic 3D este vizibil și pe ecrane înguste, în colțul stâng de jos, la dimensiune redusă; butonul Radar îl poate ascunde sau afișa. Nicio regulă nu redimensionează toate panourile HUD.
- Noul mod „Highlights 3D” folosește același motor și aceeași scenă ca meciul live. Avansează mai repede în jocul neutru și revine la viteză normală în apropierea porții, la faze fixe, VAR, șuturi, parade, goluri și reluări; momentele detectate afișează o descriere. Pauza, comenzile și reluarea automată a golului rămân active. Dacă WebGL nu funcționează, se revine la 2D.
- Acesta nu este un sistem de cinematice fotorealiste sau o arhivă de reluări pentru toate fazele: nu garantează surprinderea începutului fiecărei eliminări/parade, iar reacțiile antrenorilor sunt cele disponibile în scena 3D și în descrierile evenimentelor. Nu sunt inventate rezultate sau faze independente de meci.
- Teste de motor pentru planuri, bonusul temporar și indicațiile de pe bancă, plus teste pentru selecția vitezei și radar. Renderizarea WebGL pe telefon trebuie verificată vizual pe dispozitiv.

## v10.54.7 — clasament fără pozele antrenorilor

- Am eliminat fotografiile antrenorilor din clasamentul de pe ecranul principal și din clasamentul oficial. Stemele, datele și numele cluburilor rămân; numele antrenorului este disponibil în titlul numelui clubului.
- Portretele din profil, salvări și biblioteca de imagini nu au fost modificate.

## v10.54.6 — transferuri și salarii mai realiste

- Taxa de transfer între cluburi este limitată la 75–150% din valoarea jucătorului, inclusiv la ofertele vechi și la finalizare. Salariile la venire și prelungire au un plafon legat de salariul și nivelul jucătorului și de cerințele contractuale.
- Cluburile interesate trebuie să aibă buget, loc în lot și un nivel compatibil cu jucătorul și cu ceilalți jucători pe postul său. Ofertele pornesc de la circa 80% din cotă, ajustat pentru formă; la vânzare poți cere mai mult și clubul poate contraoferta. Salariul la plecare este negociat de club și jucător.
- Vârstele lui David de Gea și Marc-André ter Stegen sunt corectate pentru începutul sezonului 2026/27, inclusiv în loturile europene generate deja în salvări. Celelalte vârste generate în loturile europene suplimentare nu au fost încă verificate individual.
- Teste dedicate pentru limite, selecția cumpărătorilor, contraoferte și vârstele corectate.

## Reparații aplicate în v10.54.5 (noiembrie 2026) — HUD-ul din meciul 3D revine la locul lui

- **Regresia din v10.54.4:** regula `.sm-3d-shell>div{width:100%;height:100%}` era menită să întindă doar containerul canvas-ului, dar selectorul `>` prinde **toți** copiii direcți ai shell-ului 3D — adică și panourile HUD (minimap, cardul jucătorului, presetele de cameră, telemetria). Panourile au stiluri inline cu `position`/`top`/`left`, dar fără `width`/`height`, deci regula le-a umflat la toată caseta: butoanele „FIFA Tele / Co-Op TV / Pro Cam / Aproape / Tactic" s-au împrăștiat pe teren, iar minimap-ul a devenit un dreptunghi mare peste gazon.
- **Fixul:** containerul canvas-ului are acum clasă proprie — `.sm-3d-mount{position:absolute;inset:0;width:100%;height:100%}` — iar `.sm-3d-shell` rămâne doar rama (`position:relative`, `overflow:hidden`). Nicio regulă nu mai atinge copiii shell-ului, deci HUD-ul își păstrează stilurile.
- **Plasă anti-regresie:** `data-check` respinge orice regulă de forma `.sm-3d-shell > div` și verifică faptul că minimap-ul își ține atributele proprii de canvas.
- **Testat:** `data-check` **164/164** (+2), smoke **233/233**, storage 9, economy 6.

## Reparații aplicate în v10.54.4 (noiembrie 2026) — cauza reală a terenului negru în 3D

- **Bugul:** în bucla de randare, `_avg` (media timpului pe cadru) era declarat cu **`const` în interiorul blocului de măsurare** (`if(ln._c>=24){const _avg=…}`), dar folosit **în afara** lui, în `if(ae&&_avg>30){…}` — garda care renunță la bloom când cadrele sunt lente. Ori de câte ori bloom-ul era pornit (`ae` nenul), fiecare cadru arunca `ReferenceError: _avg is not defined` **înainte** de `Q.render(scene, camera)`, deci canvas-ul rămânea negru din primul cadru, iar în meci se vedeau doar overlay-urile DOM. Când bloom-ul era oprit (`ae === null`), scurt-circuitul `ae && …` ascundea eroarea — de aceea pe unele telefoane mergea, iar pe altele nu.
- **Fixul:** `let _avg = 0` la nivelul buclei, iar în blocul de măsurare doar atribuire. Garda de calitate (pixel ratio, umbre, ceață, renunțarea la bloom) funcționează acum ca intenționat.
- **De ce a apărut abia acum:** variabila `ae` (lanțul de bloom) a devenit nenulă din v10.54.0. Până atunci ramura `if(ae && …)` nu se evalua niciodată, deci eroarea de scop dormea în cod.
- **Două plase noi, ca să nu se mai poată întâmpla:** `_smPitchProbe` (v10.54.3) citește pixeli din canvas, iar un **watchdog de 3,5 s** comută meciul pe 2D dacă nu a apărut niciun cadru valid — indiferent ce ar arunca bucla. În plus, canvas-ul 3D e poziționat absolut (`.sm-3d-shell`), deci umple întotdeauna caseta terenului, fără să depindă de un lanț de `height:100%`.
- **Testat:** `data-check` **162/162** (+3: `_avg` la nivelul buclei, watchdog-ul, canvasul absolut), smoke **233/233**, storage 9, economy 6.

## Reparații aplicate în v10.54.3 (noiembrie 2026) — meciul nu mai poate rămâne cu terenul gol

Scenă raportată: în meci se vedea bara de scor și comentariul, dar terenul rămânea negru. Trei plase de siguranță, toate în calea 3D:

- **Bloom-ul verifică ce poate GPU-ul înainte de a porni.** Lanțul are nevoie de render target-uri **half-float**, iar pe multe GPU-uri mobile combinația half-float + MSAA ×2 produce un framebuffer incomplet — randarea în render target nu aruncă nicio eroare, doar scrie negru. Acum, dacă lipsește `EXT_color_buffer_half_float`/`EXT_color_buffer_float`, lanțul nu se mai construiește deloc și se randează direct.
- **Fiecare render target e verificat cu `checkFramebufferStatus`.** Dacă unul dintre cele patru (scenă, bright-pass, blur A, blur B) nu e `FRAMEBUFFER_COMPLETE`, RT-urile se eliberează și bloom-ul e abandonat, în loc să lase ecranul negru.
- **Sondă de imagine: dacă terenul iese negru, meciul trece singur pe 2D.** `_smPitchProbe` citește cinci pixeli din canvas (`gl.readPixels`) în primele cadre; dacă toți sunt negri opt cadre la rând, pornește fallback-ul existent (`onWebGLFallback`) și meciul continuă în vederea tactică 2D. Sonda se oprește la prima imagine validă, deci nu costă nimic în jocul normal.
- **De știut:** pe telefoanele cu `devicePixelRatio ≥ 2,5` sau ≤ 4 nuclee jocul se declară „slow" (`_SM_SLOW`) și **oprește din start bloom-ul, umbrele și urmele de ghete** — deci acolo bloom-ul nu era cauza. Plasele de mai sus acoperă și restul căilor (WebGL indisponibil, context pierdut, framebuffer incomplet).
- **Testat:** `data-check` **159/159** (+3: garda de capabilitate, verificarea framebuffer-urilor, sonda cu fallback pe 2D), smoke **233/233**, storage 9, economy 6. jsdom nu are WebGL, deci căile 3D sunt acoperite de verificări statice pe bundle și de plasele din cod, nu de randare reală.

## Reparații aplicate în v10.54.2 (noiembrie 2026) — jocul umple ecranul **și** derulează normal

- **Ce s-a stricat în v10.54.1:** odată cu garda de lățime am pus `html{overflow-x:hidden}`, `body,#root{width:100%}` și `#root{display:flex;flex-direction:column;min-height:100vh}`. Pe telefon, combinația dintre `overflow-x` pe elementul rădăcină și `#root` transformat în container flex a **blocat derularea verticală**: pagina se încadra pe orizontală, dar conținutul lung nu mai putea fi derulat.
- **Fixul din v10.54.2:** garda de lățime a fost **scoasă complet** — nu mai atingem `html`, `body`, `#root` sau `.sm-app-shell`. Nu se pune `overflow` ascuns pe rădăcină și nu se forțează `display:flex` pe `#root`, deci documentul derulează exact ca înainte de v10.54.1.
- **Ce rămâne din fixul de layout (partea care conta):** bara de butoane din header e `.sm-toolbar` cu `flex-wrap`, `justify-content:flex-end`, `gap:.375rem`, `min-width:0`, `max-width:100%` — se împachetează pe două rânduri în loc să lărgească pagina. Header-ul are `max-width:100%`, copilul lui `min-width:0`, iar `main` are `min-w-0`, ca niciun rând să nu poată împinge documentul pe orizontală. Meta viewport rămâne `width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=5,viewport-fit=cover`: fără micșorare automată, dar cu zoom-in permis.
- **Testat:** `data-check` **156/156** (+6 față de v10.54.0: meta viewport, absența `overflow:hidden` pe `html`/`body`/`#root`, absența unui `#root` flex/înălțime fixă, `min-w-0` pe main, `.sm-toolbar` cu `flex-wrap` în bundle), smoke **233/233** (+3: viewport în DOM, `.sm-toolbar` randat, shell prezent), storage 9, economy 6.

## Modificări în v10.54.0 (noiembrie 2026) — un-doi, urme de ghete pe gazon, bloom real

- **Un-doi (dubla pasă), prima mecanismă de combinare din motor.** Până acum jucătorul dădea mingea și rămânea pe loc. Acum, la o pasă scurtă pe pământ sau pe culoar (**5,5–21 m, înainte**), purtătorul poate arma o dublă: pleacă imediat în cursă pe direcția porții, **fără să treacă linia offside-ului** (`_otLim = awayDefX − 0,4`), iar când colegul receptează mingea o returnează din prima în culoarul alergătorului (`_maybeArmOneTwo` / `_oneTwoReturn`). Șansa de armare crește cu pasa și cu spațiul din față: `0,42 + tehnică·0,3 + spațiu·0,26`.
- **Returul are garduri, ca să nu devină o scurtătură.** Alergătorul trebuie să fi avansat măcar **0,8 m**, distanța de retur trebuie să fie între **3,2 și 18 m**, alergătorul trebuie să fie **onside**, iar culoarul liber: niciun adversar la sub **1,45 m** de linia pasei și niciunul la sub **1,7 m** de cel care dă înapoi. După un un-doi urmează un **lock de 1,6 minute de joc** în care nu se mai armează altul, ca să nu se transforme în ping-pong.
- **Se vede și se aude:** banner „🔄 UN-DOI", eveniment în relatare („Korenica — Cisotti — Korenica!"), `spokenText` pentru voce și **+3 impuls**. Măsurat: **143/200** armări pe o configurație curată; în meciurile reale iese cam **1–3 pe repriză** (2 armate / 1 finalizată în sondele de 45').
- **Urmele de ghete se adună acum în timpul meciului.** Gazonul procedural (`sA`) rămânea identic din primul până în ultimul minut. Peste el stă acum un **strat separat** — canvas 920×608 (8 px/m), plan 115×76 la `y = 0,006`, textură `CanvasTexture` reîncărcată la 2 Hz. Fiecare jucător care aleargă peste **2,7 m/s** lasă o urmă la ~0,1 s (stângul/dreapta alternativ), iar **alunecările lasă dâre** de 3,4×1,5 px; ploaia întunecă urmele **×1,55**, ninsoarea le face mai vizibile (**×1,25**). Stratul se **estompează 6% la fiecare 18 s**, ca terenul să nu se umple de noroi, și e oprit pe dispozitivele slabe sau cu `window.__SM_BOOTMARKS = false`.
- **Bloom real, fără `EffectComposer`.** Bundle-ul minificat nu are exemplele din three, dar are tot ce trebuie: lanțul e scris de la zero (`_smBloomChain`) cu `WebGLRenderTarget` + `ShaderMaterial` + un quad de ecran complet. Scena se randează într-un target **half-float linear** (MSAA ×2 pe WebGL2), un **bright-pass** la **26% rezoluție** (prag 0,74, knee 0,36) alimentează un **Gaussian separabil de 5 taps**, două iterații, iar compunerea adună glow-ul (**×0,62**) peste scenă. Ca să nu se schimbe culorile, compunerea reface **exact** ACES-ul din three (`RRTAndODTFit` + matricele de intrare/ieșire, expunere 1,06) și conversia sRGB — practic pix mari identici, plus glow pe lumini, reclame și nocturne.
- **Plase de siguranță:** dacă lanțul aruncă o eroare, comută singur pe randarea directă (`_fail`); dacă media cadrelor trece de **30 ms**, bloom-ul se oprește și pixel ratio-ul revine la 1,35; pornit doar dacă dispozitivul nu e marcat lent, și se poate închide cu `window.__SM_BLOOM = false`.
- **Testat:** `data-check` **150/150** (+14: armarea, gardurile returului, cursa onside, stratul de urme, harta 8 px/m, estomparea, lanțul de bloom, bright/blur, ACES, kill-switch), smoke **230/230** (+6 pe un-doi, inclusiv returul real, gardul de „fără alergare" și numărarea paxelor reale din meci); storage 9, economy 6. jsdom nu are WebGL, deci calea 3D e acoperită de verificări statice pe bundle și de plasele de siguranță din cod, nu de randare reală.

## Modificări în v10.53.0 (noiembrie 2026) — barajul de la lovitura liberă, primul control, legea avantajului

- **Barajul de la lovitura liberă blochează, în sfârșit.** Barajul de patru oameni exista vizual din v10.36, dar `_checkDefenderShotBlock` sărea explicit peste `source === "FREE_KICK"` — adică șuturile treceau prin zid. Acum barajul blochează, cu reguli proprii: rază de blocare mai mică (**1,05 m** față de 1,38 m în joc deschis) și probabilitate **×0,55**, ca să nu transforme loviturile libere în ziduri impenetrabile. Penalty-urile rămân exceptate.
- **Eroare de prim control.** Recepția nu mai e perfectă: `_firstTouch(jucător, viteza_pasei)` calculează o probabilitate `0,05 + (viteză−17)·0,007 − (tehnică−70)·0,0035`, plafonată la 1–24%. Dacă „scapă”, mingea sare 0,75–2 m înaintea jucătorului cu viteză mică, `owner` se eliberează, iar `cooldown` urcă la 0,26 s — deci un adversar aproape poate fura. Portarii sunt exceptați. Măsurat în jsdom: 35/200 scăpări la `dri 45` + pasă de 26 m/s, 2/200 la `dri 92` + pasă de 8 m/s.
- **Legea avantajului.** Când o intrare e fault, dar mingea liberă ajunge la un coechipier al faultatului (sub 9,5 m) în jumătatea ofensivă, arbitrul lasă jocul să continue (45% din cazuri): banner „▶️ AVANTAJ", eveniment în relatare și +4 impuls, fără lovitură liberă. Faultul rămâne statistic.
- **Vignetă de transmisie.** Un strat CSS discret (radial-gradient + `inset` shadow, `pointer-events-none`) peste teren, valabil identic în **2D și 3D** — închide colțurile fără post-processing și fără cost pe GPU.
- **Ce era deja acolo și nu a fost rescris:** cameră TV cu amortizare și shake pe impact (v10.40), numere + nume pe tricou (`kR`, 1024×512), gazon procedural cu dungi și urme (`sA`, 2048×1024), public instanțiat (v10.37.6), ghete colorate, reluarea golului (v10.50), tuneluri de lumină la cele patru nocturne. Bloom real ar cere post-processing (EffectComposer) peste bundle-ul minificat — rămâne singurul punct deschis din listă, plus dynamic boot-marks în timpul meciului.
- **Testat:** `data-check` **136/136** (+4), smoke **224/224** (+2 pe primul control, cu praguri statistice pe 200 de recepții), storage 9, economy 6.

## Modificări în v10.52.0 (noiembrie 2026) — portrete reale pentru toate cele 24 de cluburi

- **Galerie completă.** Toate cele 24 de echipe din joc au acum fotografia reală a antrenorului: după cele 10 din valurile anterioare au intrat **Corvinul** (Florin Maxim), **Oțelul** (Rui Duarte), **Botoșani** (Marius Croitoru), **FC Argeș** (Bogdan Andone), **Voluntari** (Florin Pîrvu), **Csíkszereda** (Valentin Suciu) și cele opt din Europa: **Real Madrid** (Xabi Alonso), **Barcelona** (Hansi Flick), **Man. City** (Pep Guardiola), **Arsenal** (Mikel Arteta), **Liverpool** (Arne Slot), **Inter** (Cristian Chivu), **PSG** (Luis Enrique), **Bayern** (Vincent Kompany).
- **Decupaje refăcute la nevoie.** Șapte poze au cerut a doua iterație (Flick, Guardiola, Luis Enrique, Kompany, Slot, Pîrvu, Suciu) — fie fața ieșea din cadru, fie decupajul prindea fundalul. Fiecare e verificată pe contact-sheet înainte de injecție; coordonatele stau în `assets/coach-photos/crops.json`.
- **Greutate sub control:** 24 de poze × 128×128 WebP = **82 KB**, bundle **6,11 MB** (limita de test rămâne 7,5 MB). Fallback-ul pe galeria generică a rămas în cod pentru cluburi noi sau salvări cu id necunoscut.
- **Testat:** `data-check` **132/132** (pragul de poze reale urcă la 24), smoke **222/222** — verificarea de acoperire „toate cele 24 de cluburi au fotografie reală" + fallback-ul pe un id inexistent. Storage 9, economy 6.

## Modificări în v10.51.0 (noiembrie 2026) — tranșa 2 de portrete reale (10/24)

- **Încă șase chipuri reale în clasament:** **Dinamo** (Nuno Campos), **U Cluj** (Cristiano Bergodi), **Farul** (Ioan Ovidiu Sabău), **Petrolul** (Ricardo Sousa), **Sepsi OSK** (Ovidiu Burcă) și **UTA Arad** (Adrian Mihalcea). Fiecare e decupat manual pe față (`crops.json`), verificat pe contact-sheet, convertit la 128×128 WebP (2,6–4,4 KB) și injectat în bundle — totalul urcă la **10/24**, adică 32 KB de poze pentru 6,05 MB de bundle.
- **Sepsi a cerut o a doua căutare:** prima poză (Burcă cu mâna pe frunte) ascundea fața, la fel și prima variantă a lui Ricardo Sousa — ambele au fost înlocuite cu portrete curate înainte de decupaj, ca să nu ajungă chipuri ilizibile la 24 px.
- **Numele reale rămân sursa de adevăr:** `_SM_COACH_NAMES` + `alt`/`title` („Antrenor UTA Arad — Adrian Mihalcea"); cluburile fără poză încărcată (Corvinul, Oțelul, Botoșani, Argeș, Voluntari, Csíkszereda + cele 8 din Europa) cad în continuare pe galeria de 24.
- **Testat:** `data-check` **132/132** (pragul de poze reale a urcat de la 4 la 10), smoke **221/221** — verificarea „chipul clubului folosește fotografia reală" acoperă acum toate cele 10 cluburi. Storage 9, economy 6.

## Modificări în v10.50.0 (noiembrie 2026) — reluarea golului și chipurile reale ale antrenorilor

- **Reluarea golului, automată, în 2D și în 3D.** Motorul înregistrează acum fazele (minge + toți cei 22 de jucători, 20 Hz de timp real, ultimele 90 de cadre) într-un ring buffer. La gol, `_startReplay()` păstrează fereastra relevantă (max. 48 de cadre, cel mult 3,2 s de joc) și o redă **3,1 secunde**, indiferent de viteza de simulare; sărbătoarea e prelungită automat cât să încapă reluarea (`phaseTimer = max(2,45, delay+dur+0,4)`).
- **O singură sursă de adevăr pentru ambele randări.** Reluarea scrie pozițiile interpolate înapoi în starea motorului (`homePlayers/awayPlayers/ball`), deci **canvas-ul 2D și scena 3D** o afișează fără cod duplicat; 3D-ul nu mai rulează animația de sărbătoare cât timp `snapshot.replay.active` e true. Snapshot-ul expune `replay: {active, progress, speed}`, iar HUD-ul arată un badge **REPLAY** cu viteza efectivă (ex. 0,8× la 1×, 2,2× când joci la 8×) peste teren, în ambele moduri.
- **Siguranță:** reluarea nu supraviețuiește pauzei de 45' sau fluierului final, se termină singură, iar toate metodele sunt în `try/catch` (un eșec de reluare nu poate opri meciul).
- **Chipurile antrenorilor devin fotografii reale.** Fiecare club are acum **numele real al antrenorului** (`_SM_COACH_NAMES`, 24 de intrări), iar chipul din clasament folosește **portretul foto real** când e încărcat (`coach/club/<clubId>.webp` în `__SM_ASSETS__`), cu fallback pe galeria generică de 24 pentru cluburile fără poză. `alt`/`title` spun acum și numele: „Antrenor FCSB — Laurențiu Reghecampf".
- **Pipeline reproductibil:** pozele stau în `assets/coach-photos/<clubId>.jpg` (+ `crops.json` pentru decupaj), iar `node tools/coach-photos.js` le decupează pătrat, le face **128×128 WebP (~2–4 KB)** și le injectează în bundle. `--list` arată ce lipsește. În 10.50.0 sunt gata **4/24** (FCSB, Rapid, CFR, Universitatea Craiova); restul intră în tranșe, fără nicio schimbare de cod.
- **Testat:** `data-check` **132** (+11: configurația reluării, badge-ul, garda de pauză, pipeline-ul de poze, numele reale), smoke **221** (+4 pe chipurile reale, +7 pe reluare: badge, snapshot, mișcare, terminare automată), storage 9, economy 6.

## Modificări în v10.49.0 (noiembrie 2026) — umbre reale pe gazon (valul 2, 3D)

- **Scena 3D proiectează umbre, în sfârșit.** `renderer.shadowMap` era oprit complet, iar fiecare jucător avea doar un „blob" desenat sub el. Acum lumina principală (turnul de nocturnă) are `castShadow`, hartă de **2048×2048** cu **`PCFShadowMap`** (`PCFSoftShadowMap` a fost scos din three-ul inclus — cerea fallback la fiecare cadre) și cameră de umbră **±78 / ±58**, suficient ca să acopere tot terenul de 115×76. Umbră aruncă **cei 22 de jucători, arbitrul, cei doi asistenți, mingea, buturile și porțile**, iar gazonul (deja `receiveShadow`) le primește.
- **Tribunele nu aruncă umbră, intenționat.** Acoperișul stă la 16 m, nocturna la 38 m — dacă tribuna ar arunca umbră, jumătate din gazon ar intra într-o bandă neagră care nu are sens fizic. Grupul stadionului e exclus explicit, deci umbrele vin doar de la ce e *pe* teren.
- **Blob-ul de contact devine fallback.** Când umbrele reale sunt active, blob-ul vechi se ascunde (fără dublură „lipită"); când sunt oprite, revine exact ca înainte.
- **Guvernatorul de calitate (din 10.37.6) decide.** Umbrele pornesc doar dacă dispozitivul nu e marcat lent (`_SM_SLOW`: dpr ≥ 2,5 sau ≤ 4 nuclee) și are măcar 6 nuclee. În buclă, dacă media ultimelor 24 de cadre trece de **19,5 ms** umbrele se sting singure; se reaprind doar sub **14,5 ms** și pe treapta 0 — histerezis, deci nu „pompează". La comutare, materialele primesc `needsUpdate` ca shaderele să fie recompilate o singură dată.
- **Reparat un bug de portar.** Ramura de poziționare a portarului cu `tacticalOffsetX/Y` referenția o variabilă `side` care nu exista în acel scope (`D=side==="home"`), adică un `ReferenceError` gata să sară la primul portar cu offset tactic. Acum folosește `p.side`.
- **Fizica valului 2 era deja acolo.** Recunoașterea codului a arătat că Magnus pe șut/centrare, restituția pe bare, frecarea de rulare, accelerația/inerția jucătorilor (`vx += (țintă-vx)·(1-e^{-6,3·dt})`), viteza în funcție de oboseală, separarea de capsule (`_resolvePhysicalSpacing`), portarul pe bisectoare cu timp de reacție (`gkDive` ANTICIPATE/PARRY/DESPERATE) și eroarea de execuție la șut există deja (v10.36–v10.40). Nu au fost rescrise — ar fi recalibrat distribuția șuturi/goluri fără câștig.
- **Testat:** `data-check` a crescut de la 112 la **121** (7 verificări noi pe configurația de umbre + guard-ul de dispozitiv + fixul de portar), smoke **210/210**, storage 9, economy 6. jsdom nu are WebGL, deci calea 3D e acoperită de verificări statice pe bundle și de `try/catch` în jurul comutării, nu de randare reală.

## Modificări în v10.48.0 (noiembrie 2026) — sloturi cu chip, zoom pe touch, poster la click

- **Sloturile de salvare arată cine ești.** Fiecare slot ocupat din „Salvări & Cross-Save" afișează acum **portretul antrenorului** (12×15 mm pe ecran, derivat din `manager.avatar` al salvării, cu fallback pe nume) și **emblema clubului** suprapusă peste colț, lângă numele clubului, managerul, sezonul, etapa și bugetul. Sloturile libere rămân cu textul „Slot liber".
- **Zoom pe touch.** Pe telefoane și tablete, **apăsarea lungă (~380 ms)** pe o fotografie deschide aceeași mărire; se închide singură la ~1,2 s după ce ridici degetul, iar `touchmove` anulează intenția (ca să nu apară măriri când dai scroll). Evenimentele de mouse sunt ignorate ~0,9 s după un touch, ca să nu se dubleze.
- **Poster la click.** Click pe o fotografie care **nu** stă într-un buton deschide o vedere mare: imagine până la 92vw/78vh, fundal estompat, descrierea pozei (textul `alt`) dedesubt. Se închide cu click oriunde, cu `Escape` sau cu un click pe fundal. Pozele din butoane (galeria de portrete, chipurile care fac altceva la click) sunt excluse, ca să nu fure acțiunea.
- **Accesibilitate:** butonul de închidere al ferestrei de salvări primea nume doar din iconiță — are acum `title` și `aria-label` („Închide fereastra de salvări"), deci testul „fiecare buton are nume" rămâne verde.
- **Testat:** smoke test-ul a crescut de la 202 la **210 de verificări** (click pe fotografie deschide posterul, imaginea și descrierea coincid, `Escape` închide, slotul ocupat arată portretul WebP din bundle cu `alt` descriptiv, fereastra se închide), iar `data-check` la **112** (touch, poster, excluderea pozelor din butoane, portretul din slot). Storage 9, economy 6.

## Modificări în v10.47.0 (noiembrie 2026) — lotul se filtrează și se sortează

- **Cinci filtre rapide, pe lângă filtrele de poziție.** Sub rândul „Toți / Portari / Fundași / Mijlocași / Atacanți / Eligibili U21" apare o bară nouă: **Contract < 1 an**, **Morală < 60**, **Indisponibili** (accidentați sau suspendați), **Până în 21**. Filtrele se combină cu poziția — „Portari" + „Contract < 1 an" arată exact portarii care intră în ultimul an.
- **Sortare pe șase criterii.** Dropdown-ul „Sortează" oferă **OVR ↓**, **Vârstă ↑**, **Cotă ↓**, **Salariu ↓**, **Minute ↓**, **Nume A–Z**. Sortarea se aplică după filtre și **nu mută lista originală** (copie înainte de `sort`).
- **Contor viu și reset.** „Arată 18 din 28" arată imediat efectul filtrelor, iar **Resetează** readuce poziția pe „Toți", filtrul pe „niciunul" și sortarea pe OVR.
- **Logica e o funcție pură, testabilă:** `_smRosterView(jucători, {flag, sort})` + `_smRosterFlag`, expuse și în `window.__smFix` pentru teste.
- **Testat:** smoke test-ul a crescut de la 184 la **202 de verificări** — 28 de jucători în grilă la pornire, „Portari" reduce la 3, „Până în 21" lasă doar jucători de maximum 21 de ani, „Toți" readuce lotul complet, sortarea după vârstă dă 17, 18, 19…, resetul readuce totul, plus **8 verificări pure** pe `_smRosterView` (OVR descrescător, vârstă crescătoare, cotă descrescătoare, fiecare filtru, lista originală neatinsă). `data-check` a crescut la **108**. Storage 9, economy 6.

## Modificări în v10.46.0 (noiembrie 2026) — antrenorii din galerie intră în clasament, portretul are stare

- **Fiecare echipă are acum chipul antrenorului, în clasament.** Cele 24 de portrete foto primesc o a doua viață: clubul e mapat determinist pe un portret (`_smClubCoachId`, hash pe id-ul clubului), așa că FCSB are mereu același chip, Rapid altul, iar chipul apare în **ambele** tabele de clasament (sezon regular + play-off/out), lângă emblema clubului. Hover pe chip → mărirea din v10.44.1.
- **Portretul tău are stare.** `_smCoachMood` derivă o stare din încrederea consiliului, stresul managerului și seria de rezultate: **Calm**, **Încrezător** (2+ victorii la rând sau consiliu peste 78) sau **Tensionat** (2+ înfrângeri, consiliu sub 40 sau stres peste 70). Starea apare ca badge în Profil („Stare: Încrezător") și **filtrează fotografia** — caldă și saturată când e bine, desaturată și mai întunecată când e presiune. Zero asset-uri noi.
- **Salvările vechi sunt aliniate la regula „o singură schimbare".** O carieră care are deja `manager.avatar.photoId` (ales în 10.43/10.44, când exista pasul din onboarding) primește la încărcare `photoChangeUsed: true` + `photoMigrated: true`, deci nu mai are o a doua schimbare. Carierele noi, fără `photoId`, rămân cu schimbarea disponibilă.
- **Testat:** smoke test-ul a crescut de la 178 la **184 de verificări** (16 chipuri în clasament, toate WebP din bibliotecă, minim 4 portrete distincte, același club → același antrenor, starea afișată în Profil și filtrul aplicat pe portret), `storage-test` de la 7 la **9** (o salvare veche cu `photoId` se încarcă cu butonul „Portret blocat" și migrarea scrie `photoChangeUsed` fără să piardă portretul), iar `data-check` la **105**. Economy 6.

## Modificări în v10.45.0 (noiembrie 2026) — portretul se schimbă o singură dată

- **O singură schimbare de portret pe carieră.** Butonul din Profil devine „🔒 Portret blocat" după prima folosire, e dezactivat (`disabled`), iar galeria celor 24 nu se mai deschide — nici prin click pe buton, nici la rerandare. Alegerea se salvează ca `manager.avatar.photoChangeUsed` (plus `photoChangedAt`), deci blocajul trece prin reload și prin autosalvare.
- **Avertisment înainte de alegere.** Lângă contorul „Portret NN / 24" apare „Ai o singură schimbare de portret." (galben), iar antetul galeriei spune „O singură schimbare — alege cu grijă". După consumare, textul devine „Ți-ai folosit singura schimbare de portret." (gri).
- **Portretul de start nu consumă schimbarea.** Cariera nouă primește automat portretul derivat din numele managerului, fără să scrie nimic în salvare — deci jucătorul are exact o schimbare la dispoziție, când vrea.
- **Testat:** smoke test-ul a crescut de la 174 la **178 de verificări** (schimbarea e marcată ca folosită în salvare, butonul se dezactivează după o folosire, textul anunță consumarea, galeria nu se mai deschide a doua oară), iar `data-check` la **102** (`photoChangeUsed`, „Portret blocat", mesajul de unică folosință). Storage 7, economy 6.

## Reparații în v10.44.1 (noiembrie 2026) — zoom-ul prinde și jucătorii fără fotografie

- **Hover-ul pe chipul unui jucător generat nu deschidea mărirea.** Jucătorii fără fotografie reală primesc portretul din bibliotecă, dar peste `<img>` stă un strat decorativ (`div[aria-hidden]` cu vinietă radială), așa că evenimentul de mouse lovea un `<div>`, nu imaginea — iar scriptul de zoom asculta doar `e.target.tagName === "IMG"`. Jucătorii cu fotografie reală nu au acel strat, de aceea la ei funcționa.
- **Acum poza e căutată și sub strat.** `resolveImg()` verifică întâi elementul apuntat, apoi îi caută un `<img>` fiu direct (chip-ul întreg), apoi face același lucru pe părintele lui (stratul de peste poză). Căutarea e limitată la fii direcți, ca hover-ul pe un rând de tabel să nu mai declanșeze măriri nedorite.
- **Pragul de mărime a coborât la 22 px**, ca să includă și chipurile mici din tabele; rămâne plafonul de 300 px (hero/fundaluri nu se măresc).
- **Testat:** smoke test-ul a crescut de la 170 la **174 de verificări** — un chip sintetic `div > img + strat` își deschide mărirea la hover pe strat, mărirea folosește poza de sub el, un chip **real** de jucător generat din aplicație face zoom, iar panoul se închide la `mouseout`. `data-check` a crescut la **101** (prezența `resolveImg`/`directImg`). Storage 7, economy 6.

## Modificări în v10.44.0 (noiembrie 2026) — zoom pe fotografii și portretul ales doar din Profil

- **Mărire la hover, pe orice fotografie.** Treci cu mouse-ul peste o poză — chipul jucătorului din lot, fața din fereastra de decizie, portretul antrenorului, emblema clubului — și lângă ea apare o mărire (190–320 px, până la 72% din înălțimea ecranului), cu aceeași încadrare ca originalul (`object-fit`/`object-position` preluate din element). Panoul e `pointer-events:none`, se mută singur dacă nu are loc în dreapta, și dispare la `mouseout`, scroll, resize, click sau tastă. Nu se activează pe ecrane tactile (`(hover: none)`), nu apare pentru imaginile deja mari (hero, fundal, > 300 px) și respectă `prefers-reduced-motion`.
- **Portretul antrenorului nu se mai alege la începutul carierei.** Pasul „Portretul Tău de Antrenor (24)" a fost scos din onboarding: ecranul de start revine la nume → dificultate → arhetipuri → club → semnarea contractului. Cariera nouă primește **automat** un portret stabil, derivat din numele managerului (același nume → același chip, la fiecare pornire) — nimic nu se mai scrie în salvare ca „alegere".
- **Singurul loc de schimbare rămâne Profilul.** „🖼️ Schimbă portretul" deschide galeria celor 24, cu portretul curent marcat; click pe altul îl salvează ca `manager.avatar.photoId` și închide galeria. Salvările vechi fără `photoId` continuă să primească portretul determinist din nume.
- **Testat:** smoke test-ul a crescut de la 165 la **170 de verificări** (onboarding fără grilă de portrete, cariera nouă primește portret automat și stabil din nume, alegerea nu se scrie în salvare, portretul schimbat din Profil persistă, hover-ul deschide mărirea cu exact aceeași imagine și o închide la `mouseout`), iar `data-check` de la 97 la **100** (portret schimbabil doar din Profil, onboarding fără pas de portret, scriptul de zoom prezent, respectarea `hover: none` și `prefers-reduced-motion`). Storage 7, economy 6, bundle 6,28 MB.

## Modificări în v10.43.0 (noiembrie 2026) — portretul antrenorului, ca în dating sim

- **Antrenorul are acum chip de fotografie, nu de desen.** Cele 288 de combinații de avatar (6 tenuri × 8 coafuri × 6 ținute × 6 accesorii × 4 bărbi) desenau un bust plat, care nu semăna cu fețele fotorealiste ale jucătorilor. Acum managerul alege din **24 de portrete foto** — antrenori între 33 și 63 de ani, în costum, smoching, pardesiu bej sau trening, unii cu ochelari, barbă sau chelie. WebP de 216×270, **5,7–8,5 KB bucata**, încorporate în bundle: nicio cerere către exterior.
- **Alegerea se face la începutul carierei.** În onboarding, sub numele de pe bancă, apare grila „Portretul Tău de Antrenor (24)" cu un portret preselectat; alegerea ajunge în salvare ca `manager.avatar.photoId` (ex. `coach-07`) și se scrie o singură dată, la semnarea contractului.
- **Schimbabil oricând din Profil.** Butonul „🖼️ Schimbă portretul" deschide aceeași galerie, cu portretul curent marcat; click pe altul îl salvează pe loc și închide galeria. Editorul cu presetări a dispărut din interfață — desenul SVG rămâne doar ca plasă de siguranță, dacă imaginea lipsește.
- **Carierele vechi nu rămân fără chip.** O salvare fără `photoId` primește un portret **determinist derivat din numele managerului** — același nume dă același portret la fiecare pornire, deci nu „sare" între fețe.
- **Fără sigle pe echipament.** Portretele sunt decupate head-and-shoulders (58% din înălțime, ancorat sus, 4:5), ceea ce uniformizează încadrarea în galerie și scoate din cadru siglele și sponsorii generați pe tricouri.
- **Testat:** smoke test-ul a crescut de la 157 la **165 de verificări** (onboarding-ul afișează toate cele 24 de portrete, alegerea se salvează în carieră, portretul schimbat din Profil persistă, salvare veche → portret stabil din nume, `photoId` are prioritate, fiecare portret e încorporat în bundle), iar `data-check` de la 89 la **97** (listă de 24 fără goluri, specificația `coach-library.json`, WebP sub 18 KB, galerie în ambele locuri, limita de 7,5 MB — acum 6,28 MB). Storage 7, economy 6.

## Modificări în v10.42.0 (noiembrie 2026) — fețe fotorealiste și avatarul cinematic

- **Jucătorii fără fotografie primesc o față în stilul dating sim-ului.** Cei care nu au poză reală în bundle (tineri din academie, jucători generați la transferuri) vedeau până acum un bust desenat plat, de 64×64. Acum primesc un **portret fotorealist**: lumină caldă de reflector, tribună estompată în bokeh, piele cu textură naturală — aceeași rețetă vizuală ca portretele din „Relații & Întâlniri". Biblioteca se încarcă în bundle ca WebP de 192×192 (~4,5 KB bucata), deci nu se face nicio cerere către exterior.
- **Potrivire pe trei criterii: ten, vârstă, păr.** Pe lângă familia de ten (pale→fair, amber→tan, ebony/dark_brown→dark, brown→Asia de Sud), alegerea ține cont de **banda de vârstă** (sub 21, 21–29, peste 29): un junior de 17 ani nu mai primește fața unui chel de 36. Sud-asiaticii nu mai împart grupul `brown` cu jucătorii afro-brazilieni — aceștia au trecut la `dark_brown`, iar `Bv` nu mai atribuie `brown` jucătorilor din America Latină (primesc `tan`).
- **Fața e stabilă și potrivită jucătorului.** `_smFaceFor()` alege portretul printr-un hash pe nume (același jucător → aceeași față, și după reload), filtrat întâi după tenul și culoarea părului pe care motorul le atribuie deja din naționalitate — nu apare un jucător cu ten deschis peste o față întunecată. Fotografiile reale au în continuare prioritate; biblioteca e doar plasa de siguranță.
- **Bokeh în culorile clubului, desenat procedural.** Fundalul portretului se colorează cu cele trei culori ale clubului (gradient radial + blend `soft-light`), așa că aceeași față arată corect la FCSB, la Rapid sau la un club din Top Europa fără să existe 24 × N randări de imagine.
- **Avatarul antrenorului, redesenat cinematografic.** Cele 288 de combinații (6 tenuri × 8 coafuri × 6 ținute × 6 accesorii × 4 bărbi) rămân exact cum erau — aceleași chei în salvare — dar randarea a trecut de la forme plate la un portret cu **gradiente de ten, umbre difuze, lumină de contur, ochi cu iris și lumini speculare, fundal bokeh cald și vinietă**. Barba, ochelarii, butoniera, ceasul și cravata colorată sunt straturi separate peste același desen.
- **Pază de greutate în `data-check`:** fiecare față generată trebuie să fie sub 18 KB, toate să fie WebP în bundle, iar `index.html` să rămână sub 7,5 MB (acum 5,78 MiB cu tot cu cele 80 de portrete).
- **Bibliotecă completă: 80 de fețe.** Fiecare familie de ten din motor are acum portrete proprii, cu vârste între 17 și 36 de ani și coafuri de la bucle și dreadlocks la chelie: fair 24, olive 22, tan/amber 12, dark 16, est-asiatice 6. `tools/face-library.json` păstrează specificația fiecărui portret (vârstă, ten, coafură, barbă, etnie), iar `data-check` verifică acum că **toate cele 80 sunt livrate** și că etichetele de ten și păr respectă specificația — dacă o față e înlocuită sau adăugată greșit, testul pică.

- **Testat:** smoke test-ul a crescut de la 138 la **157 de verificări** (fața e stabilă după reload, fețele se distribuie între jucători, fotografia reală are prioritate, toate cele 288 de combinații de avatar se randează cu gradiente proprii și fără cereri externe), iar `data-check` de la 79 la **89** (biblioteca de fețe, greutatea fiecărei imagini, acoperirea tenurilor, întâietatea fotografiei reale, limita de 7,5 MB). Storage 7, economy 6.

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

