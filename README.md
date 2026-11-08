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
  build-icons.sh        ← regenerează iconițele din assets/icon-source.png
```

## Rulare

```bash
npm start          # http://localhost:3000   (PORT=8080 npm start pentru alt port)
```

Fără Node: `npm run serve:python`, sau deschide direct `public/index.html`. Atenție însă: pe `file://` unele browsere blochează `localStorage`/`IndexedDB`, deci salvările carierei nu persistă — folosește serverul.

## Testare

```bash
npm test           # ≈25s — integritate date + storage + boot, carieră nouă, toate secțiunile, un meci live, salvarea
npm run test:data  # ≈0.2s — doar verificările de date
npm run test:storage # ≈6s — autosalvarea și migrarea din cheia veche
npm run test:quick # ≈8s  — fără meci
```

`tools/data-check.js` validează datele din bundle (18 verificări): fiecare club are antrenor, flag-ul U21 respectă limita de vârstă, loturi fără nume/numere duplicate, `pot ≥ ovr`, `shortName` unic și fără coliziune cu codurile UEFA, toate imaginile referite există în bundle, viewport-ul permite zoom, iar motorul live avansează pasul de simulare cu ceasul meciului (nu încărcat de două ori de viteza de joc) și autosalvarea scrie într-o singură cheie `localStorage`.

Testele încarcă bundle-ul real într-un DOM jsdom și verifică 23 de puncte din fluxul principal:

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
