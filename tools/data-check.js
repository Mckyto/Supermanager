#!/usr/bin/env node
/**
 * Verificări de integritate a datelor din public/index.html.
 *
 * Bundle-ul e minificat, deci „datele” sunt obiecte JS în interiorul lui.
 * Le extragem și le validăm: antrenori, loturi, flag-uri U21, stadioane,
 * referințe de imagini. Rulează cu `npm test` (înaintea smoke test-ului).
 */
const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', 'public', 'index.html');
const html = fs.readFileSync(FILE, 'utf8');

const results = [];
const check = (name, condition, detail = '') => {
  results.push({ name, ok: Boolean(condition), detail });
  if (!condition) console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
};

/** Găsește array-ul care începe imediat după `marker` (paranteze echilibrate). */
function arrayAfter(marker) {
  const at = html.indexOf(marker);
  if (at < 0) throw new Error(`Nu găsesc markerul: ${marker}`);
  return readArray(html.indexOf('[', at));
}

/** Găsește array-ul care ÎNCADREAZĂ obiectul de la `marker` (ex. lista de cluburi EU). */
function arrayEnclosing(marker) {
  const at = html.indexOf(marker);
  if (at < 0) throw new Error(`Nu găsesc markerul: ${marker}`);
  let depth = 0;
  for (let i = at; i >= 0; i -= 1) {
    if (html[i] === ']') depth += 1;
    else if (html[i] === '[') {
      if (depth === 0) return readArray(i);
      depth -= 1;
    }
  }
  throw new Error(`Nu găsesc array-ul părinte pentru ${marker}`);
}

/** Citește array-ul JS care începe la `start` și îl evaluează ca date. */
function readArray(start) {
  let depth = 0;
  for (let i = start; i < html.length; i += 1) {
    if (html[i] === '[') depth += 1;
    else if (html[i] === ']') {
      depth -= 1;
      if (depth === 0) return eval(`(${html.slice(start, i + 1)})`); // eslint-disable-line no-eval
    }
  }
  throw new Error('Array neînchis');
}

const roClubs = arrayAfter('const L2=[{id:"fcsb"');
const euClubs = arrayEnclosing('{id:"realmadrid",name:"Real Madrid"');
const clubs = [...roClubs, ...euClubs];
const squads = clubs.flatMap((club) => (club.players || []).map((p) => ({ ...p, club: club.shortName })));

console.log('Integritate date');

// 1. Cluburi + antrenori
check('16 cluburi în SuperLiga', roClubs.length === 16, `${roClubs.length}`);
check('8 cluburi europene', euClubs.length === 8, `${euClubs.length}`);
const faraAntrenor = clubs.filter((c) => !c.coach || !String(c.coach).trim()).map((c) => c.shortName);
check('fiecare club are antrenor', faraAntrenor.length === 0, `lipsă: ${faraAntrenor.join(', ')}`);

// 2. Regula U21: flag-ul trebuie să respecte limita de vârstă a jocului
const u21PreaBatrani = squads.filter((p) => p.u21 && p.age > 21);
check('niciun jucător U21 peste 21 de ani', u21PreaBatrani.length === 0,
  u21PreaBatrani.map((p) => `${p.name} (${p.age})`).join(', '));
const u21Straini = squads.filter((p) => p.u21 && p.nat !== 'ROU');
check('flag-ul U21 doar pe jucători români', u21Straini.length === 0,
  u21Straini.map((p) => `${p.name} (${p.nat})`).join(', '));

// 3. Loturi
const nume = squads.map((p) => p.name);
const duplicate = nume.filter((n, i) => nume.indexOf(n) !== i);
check('niciun jucător în două loturi', duplicate.length === 0, duplicate.join(', '));

const numereDuble = [];
for (const club of clubs) {
  const seen = new Set();
  for (const p of club.players || []) {
    if (seen.has(p.number)) numereDuble.push(`${club.shortName} #${p.number}`);
    seen.add(p.number);
  }
}
check('numere de tricou unice în fiecare club', numereDuble.length === 0, numereDuble.join(', '));

const potGresit = squads.filter((p) => p.pot < p.ovr).map((p) => p.name);
check('potențial ≥ OVR la toți jucătorii', potGresit.length === 0, potGresit.join(', '));

const varste = squads.map((p) => p.age);
check('vârste plauzibile (16–42)', Math.min(...varste) >= 16 && Math.max(...varste) <= 42,
  `${Math.min(...varste)}–${Math.max(...varste)}`);

// 4. Identificatori de club
const shortNames = clubs.map((c) => c.shortName);
const shortDuble = shortNames.filter((n, i) => shortNames.indexOf(n) !== i);
check('shortName unic pentru fiecare club', shortDuble.length === 0, shortDuble.join(', '));
const coduriCompetitii = ['UCL', 'UEL', 'UECL'];
const coliziuni = shortNames.filter((n) => coduriCompetitii.includes(n));
check('shortName nu se confundă cu un cod de competiție', coliziuni.length === 0, coliziuni.join(', '));

// 5. Referințe de imagini
const assetsBlock = html.slice(html.indexOf('window.__SM_ASSETS__={'));
const assetKeys = new Set([...assetsBlock.matchAll(/"([^"/]+(?:\/[^"/]+)*\.(?:jpg|jpeg|png|webp))":"data:/g)].map((m) => m[1]));
const referinte = new Set([...html.matchAll(/["'](?:\.?\/)?assets\/([^"']+\.(?:jpg|jpeg|png|webp))["']/g)].map((m) => m[1]));
const lipsa = [...referinte].filter((r) => !assetKeys.has(r));
check('toate imaginile referite există în bundle', lipsa.length === 0, lipsa.slice(0, 5).join(', '));
check('bundle-ul are un set de imagini', assetKeys.size > 500, `${assetKeys.size} imagini`);

// 6. Meta / accesibilitate
check('viewport-ul permite zoom', !/user-scalable=no/.test(html) && !/maximum-scale=1/.test(html));

// 7. Motor live: pasul de simulare trebuie să avanseze cu ceasul meciului
// (înainte se împărțea încă o dată la viteza de joc, așa că la 8x se jucau
// de 8 ori mai puține faze fotbalistice pe minut — meciuri fără șuturi).
check(
  'motorul live nu mai împarte pasul de simulare la viteza de joc',
  html.includes('_stepSubtick(e){const t=e;') && !html.includes('t=e/Math.max(.5,this._curSpeedMult||1)')
);
check(
  'portarul folosește același pas de simulare ca restul echipei',
  !html.includes('te=n/Math.max(.5,this._curSpeedMult||1)')
);

// 8. Salvarea carierei: o singură cheie localStorage
check(
  'autosalvarea nu mai scrie în dublu în localStorage',
  !html.includes('setItem("supermanager_26_27_pro2d_v2",s)') && html.includes('setItem(`sm2627_career_slot_${e}`,s)')
);
check('carierele vechi sunt migrate la pornire', html.includes('sm2627_career_slot_";let _raw=localStorage.getItem(gv)'));

// 9. Accesibilitate
check(
  'clasele de font mici sunt ridicate la minimum 12px',
  html.includes('.text-\\[8px\\],.text-\\[9px\\],.text-\\[10px\\],.text-\\[11px\\]{font-size:12px')
);
check('stratul de accesibilitate (aria-label pentru iconițe) e prezent', html.includes('id="sm-a11y-js"'));
check('mișcarea redusă e respectată', html.includes('prefers-reduced-motion:reduce'));

// 10. Offline: nicio resursă externă (fonturi, CDN, imagini)
const resurseExterne = [
  ...html.matchAll(/(?:src|href)=["'](https?:\/\/[^"']+)/g),
  ...html.matchAll(/url\(\s*["']?(https?:\/\/[^)"']+)/g),
].map((m) => m[1]);
check('nicio resursă încărcată de pe alt domeniu', resurseExterne.length === 0, resurseExterne.slice(0, 3).join(', '));

// 11. Text și flux de meci
check('nu mai apare greșeala „kamere”', !/kamere/i.test(html) && html.includes('camerele noastre'));
check(
  'meciul nu mai întrerupe jocul cu decizii',
  html.includes('_triggerTouchlineDilemma(e,t,n,s,l={}){return null}')
);
check('pauza nu mai cere corecții tactice sau dialog 1-la-1', !html.includes('Corecții Tactice pe Tablă') && !html.includes('Dialog 1-la-1 la Pauză'));
check('reacția jucătorului din știri e generată din rezultat', html.includes('Ee.unshift({id:`react-${fe}`'));

const ok = results.filter((r) => r.ok).length;
console.log(`${ok}/${results.length} verificări de date OK`);
process.exit(ok === results.length ? 0 : 1);
