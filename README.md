# SuperManager 26/27 — Ediția Supremă (v10.37)

Joc de management fotbalistic pentru Liga 1 (sezonul 2026/27), construit ca **o singură pagină HTML autonomă**: React 18 + Tailwind, tot bundle-ul (inclusiv fotografiile jucătorilor în `base64`) este inline. Nu face **nicio cerere externă** — merge complet offline, direct din `file://` sau servit static.

```
public/index.html   ← tot jocul (single-file build)
server.js           ← server static minimal, zero dependențe
```

## Rulare

```bash
npm start            # http://localhost:3000  (PORT=8080 npm start pentru alt port)
```

sau, fără Node:

```bash
npm run serve:python # python3 -m http.server 3000 --directory public
```

Merge și deschizând `public/index.html` direct în browser (fără server), dar unele browsere blochează `localStorage` pe `file://`, deci salvările pot să nu persiste — recomandat serverul.

## Ce conține jocul

- **16 cluburi din Liga 1** (FCSB, Rapid, Dinamo, CFR, Universitatea Craiova, Farul etc.) plus cluburile europene din cupe.
- **Carieră completă**: alegerea clubului, a personajului de manager (Legend / Tactician / Charmer / Hardliner) și a dificultății (Normal / Realistic / Hardcore).
- **7 secțiuni principale**: Panou (dashboard), Lot, Liga / clasament, Competiții, Transferuri, Club, Viață.
- **Meci live** cu motor de simulare pe faze (șuturi, cornere, cartonașe, VAR, penalty-uri, schimbări, instrucțiuni tactice), comentariu și scene audio generate cu WebAudio.
- **Tactici**: formație, stil de joc, roluri individuale, planuri de antrenament, moralitate & coeziune vestiar.
- **Transferuri și negocieri**: piață internă + externă, împrumuturi, agenți, oferte, contracte, salarii, buget.
- **Sisteme de viață**: patron, consiliu, presă (conferințe cu variante de răspuns), suporteri/ultras, relații personale, viață personală.
- **Cupe**: Liga Campionilor / Europa / Conference, Cupa României, Supercupa, echipa națională.
- **Salvare**: 5 sloturi + autosave, în `localStorage` (`supermanager-26-27-autosave`), cu import/export de carieră portabilă.

## Note tehnice

- **Build**: bundle Vite single-file (React 18 în modul producție, Tailwind compilat). Codul e minificat — nu există sursă separată în acest repo, `public/index.html` este artefactul.
- **Fullscreen / immersive**: dacă rulează într-un WebView Android cu `window.AndroidBridge.toggleImmersive()`, butonul de fullscreen apelează puntea nativă; altfel folosește Fullscreen API.
- **Curățenie aplicată la import**: am eliminat scriptul injectat de Cloudflare (`__CF$cv$params` + iframe de challenge) pe care pagina îl căpătase la salvarea din browser. În rest, fișierul e neschimbat.

## Deploy

Orice hosting static merge (GitHub Pages, Netlify, Vercel, Cloudflare Pages, un bucket S3). Publică `public/` — un singur fișier, fără build step.
