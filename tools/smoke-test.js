#!/usr/bin/env node
/**
 * Smoke test pentru SuperManager 26/27.
 *
 * Încarcă public/index.html într-un DOM real (jsdom) și verifică fluxul
 * principal: boot → onboarding → tab-uri → meci live (cu pauza de la 45').
 *
 *   node tools/smoke-test.js            # tot (≈40s)
 *   node tools/smoke-test.js --no-match # fără meci (≈8s)
 *
 * Nu testează grafica/WebGL/audio — doar că jocul pornește și logica rulează.
 */
const { launch } = require('./dom-harness.js');

const SKIP_MATCH = process.argv.includes('--no-match');

const results = [];
let app;

function pass(name, extra = '') {
  results.push({ ok: true, name, extra });
  console.log(`  ✓ ${name}${extra ? ` — ${extra}` : ''}`);
}

function fail(name, extra = '') {
  results.push({ ok: false, name, extra });
  console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ''}`);
}

function check(name, condition, extra = '') {
  if (condition) pass(name, extra);
  else fail(name, extra);
}

/** Minutul curent din banda live ("📺 LIVE 39'"). */
function liveMinute() {
  const match = app.text().match(/LIVE\s+(\d{1,3})\s*'/);
  return match ? Number(match[1]) : null;
}

async function scenarioBoot() {
  console.log('\n1. Boot');
  const { root, text, errors } = app;
  check('#root are conținut', root.childElementCount > 0, `${root.childElementCount} noduri`);
  check('ecranul de titlu e randat', /SUPERMANAGER 26\/27/i.test(text()));
  check('fără erori la boot', errors.length === 0, errors[0]);
}

async function scenarioOnboarding() {
  console.log('\n2. Onboarding & start carieră');
  const { click, text } = app;

  check('lista de cluburi e vizibilă', /FCSB/.test(text()) && /Universitatea Craiova/.test(text()));
  check('arhetipuri de manager prezente', /Fost Internațional/.test(text()));

  if (!click(/Semnează Contractul/)) return fail('butonul „Semnează Contractul" există');
  pass('butonul „Semnează Contractul" apăsat');

  const ok = await app.waitFor(/Pulsul SuperLigii/, 10000);
  check('dashboard-ul se încarcă', ok);
  check('fără erori la intrarea în carieră', app.errors.length === 0, app.errors[0]);
}

async function scenarioTabs() {
  console.log('\n3. Secțiunile principale');
  const tabs = [
    { label: /Lot, Tabla XI/, expect: /Titulari|Tabla XI|Formație|Portar/i, name: 'Lot / Tabla XI' },
    { label: /Clasament & Etape/, expect: /Etapa|Sezon Regular|Puncte|Loc/i, name: 'Clasament & Etape' },
    { label: /Cupe, Europa/, expect: /Cupa|Europa|UEFA|Sezon/i, name: 'Cupe & Europa' },
    { label: /Mercato & Scouting/, expect: /Transfer|Jucători|Buget|Ofert/i, name: 'Mercato & Scouting' },
    { label: /Academie & Club/, expect: /Academie|Club|Stadion|Staff|Facilită/i, name: 'Academie & Club' },
    { label: /Viață &/, expect: /Viaț|Relați|Casă|Mașin/i, name: 'Viață & Relații' },
    { label: /^Centru Comandă/, expect: /Pulsul SuperLigii/i, name: 'Centru Comandă' },
  ];

  for (const tab of tabs) {
    const before = app.errors.length;
    if (!app.click(tab.label)) {
      fail(`${tab.name} — tab găsit`);
      continue;
    }
    await app.sleep(600);
    const rendered = tab.expect.test(app.text());
    const newErrors = app.errors.length - before;
    check(`${tab.name} se randează`, rendered && newErrors === 0, newErrors ? `erori: ${app.errors[before]}` : '');
  }
}

async function scenarioMatch() {
  console.log('\n4. Meci live');
  const before = app.errors.length;
  if (!app.click(/Intră în Meci/)) return fail('butonul „Intră în Meci" există');
  pass('intrare în meci');
  await app.sleep(1200);

  check('panoul de meci e afișat', /Adrenalină pe Gazon|LIVE/.test(app.text()));

  // viteză maximă ca testul să dureze puțin
  app.click(/^8x$/);

  const startMinute = liveMinute();
  await app.sleep(3000);
  const laterMinute = liveMinute();
  check(
    'ceasul meciului avansează',
    startMinute !== null && laterMinute !== null && laterMinute > startMinute,
    `${startMinute}' → ${laterMinute}'`
  );

  // pauza de la 45' are nevoie de o decizie ca să continue
  let halftime = false;
  for (let i = 0; i < 20 && !halftime; i += 1) {
    await app.sleep(1000);
    if (/Vestiar la Pauză/.test(app.text())) halftime = true;
  }
  check('pauza de la 45\' apare', halftime);
  if (halftime) {
    if (app.click(/Începe Repriza a Doua/)) {
      await app.sleep(2500);
      const afterResume = liveMinute();
      check('repriza a doua reia jocul', afterResume === null || afterResume >= 45, `${afterResume}'`);
    } else {
      fail('butonul „Începe Repriza a Doua" există');
    }
  }

  check('fără erori în timpul meciului', app.errors.length === before, app.errors[before]);
}

async function scenarioPersistence() {
  console.log('\n5. Salvare');
  const storage = app.window.localStorage;
  const keys = [];
  for (let i = 0; i < storage.length; i += 1) keys.push(storage.key(i));
  const careerKeys = keys.filter((k) => /supermanager|sm2627/i.test(k));
  check('cariera se salvează în localStorage', careerKeys.length > 0, careerKeys.join(', '));
  const raw = careerKeys.map((k) => storage.getItem(k)).find(Boolean) || '';
  check('salvarea conține date de carieră', /userClubId|season|clubs/.test(raw), `${Math.round(raw.length / 1024)} KB`);
}

(async () => {
  console.log('SuperManager 26/27 — smoke test' + (SKIP_MATCH ? ' (fără meci)' : ''));
  const started = Date.now();

  app = await launch();
  try {
    await scenarioBoot();
    await scenarioOnboarding();
    await scenarioTabs();
    if (!SKIP_MATCH) await scenarioMatch();
    await scenarioPersistence();
  } catch (err) {
    fail('testul a rulat fără excepții', String(err && err.message));
  } finally {
    app.close();
  }

  const failed = results.filter((r) => !r.ok);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n${results.length - failed.length}/${results.length} verificări OK în ${seconds}s`);
  if (failed.length) {
    console.log('EȘECURI:');
    for (const f of failed) console.log(`  - ${f.name}${f.extra ? ` (${f.extra})` : ''}`);
  }
  process.exit(failed.length ? 1 : 0);
})();
