/**
 * Teste pentru salvarea carierei (localStorage).
 *
 * Verifică două lucruri pe care le-am reparat:
 *  1. autosalvarea scrie într-o singură cheie (`sm2627_career_slot_N`), nu în două —
 *     înainte se dubla ~419 KB la fiecare salvare și umplea cota de 5 MB;
 *  2. o carieră veche, salvată doar sub cheia legacy `supermanager_26_27_pro2d_v2`,
 *     e migrată automat în cheia pe slot și cheia veche e ștearsă.
 */
const { launch } = require('./dom-harness');

const LEGACY = 'supermanager_26_27_pro2d_v2';
const slotKey = (n = 1) => `sm2627_career_slot_${n}`;

let passed = 0;
let failed = 0;

function check(label, ok, details) {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label}${details ? ` — ${details}` : ''}`);
  }
}

async function newCareer(seed) {
  const app = await launch(seed ? { seed } : {});
  await app.sleep(700);
  app.click(/Semnează Contractul/);
  await app.waitFor(/Centru Comandă/);
  return app;
}

(async () => {
  console.log('Storage: autosalvare + migrare');

  // 1. o carieră nouă se salvează într-o singură cheie
  const app = await newCareer();
  await app.sleep(1200);
  const store = app.window.localStorage;
  const raw = store.getItem(slotKey(1));
  check('cariera se salvează sub cheia pe slot', !!raw, `chei: ${Object.keys(store).join(', ')}`);
  check('cheia legacy nu se mai scrie', store.getItem(LEGACY) === null);
  check('salvarea conține clubul ales', !!raw && JSON.parse(raw).userClubId === 'fcsb');
  check('salvarea conține timestamp de autosalvare', !!raw && Number.isFinite(JSON.parse(raw)._autosaveTimestamp));
  await app.close();

  // 2. migrare: pornim cu o salvare doar sub cheia legacy
  const legacyApp = await launch({ seed: { [LEGACY]: raw } });
  await legacyApp.sleep(900);
  const text = legacyApp.text();
  check('cariera veche e încărcată la pornire', /FCSB/.test(text) && /Centru Comandă/.test(text), text.slice(0, 80));
  await legacyApp.sleep(600);
  const migratedStore = legacyApp.window.localStorage;
  check('cariera veche e copiată în cheia pe slot', !!migratedStore.getItem(slotKey(1)));
  check('cheia legacy e ștearsă după migrare', migratedStore.getItem(LEGACY) === null);
  await legacyApp.close();

  console.log(`\n${passed} verificări OK, ${failed} eșuate`);
  process.exit(failed === 0 ? 0 : 1);
})();
