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

  // 3. migrare portret: o carieră care are deja photoId a consumat schimbarea
  const oldSave = JSON.parse(raw);
  oldSave.manager = { ...(oldSave.manager || {}), avatar: { skin: 1, hair: 1, hairStyle: 2, outfit: 0, accessory: 1, beard: 0, photoId: 'coach-07', updatedAt: 1 } };
  const photoApp = await launch({ seed: { [slotKey(1)]: JSON.stringify(oldSave) } });
  await photoApp.sleep(900);
  for (let i = 0; i < 20 && !/Centru Comandă/.test(photoApp.text()); i += 1) await photoApp.sleep(100);
  photoApp.click(/Profil Antrenor/);
  await photoApp.sleep(700);
  const locked = [...photoApp.document.querySelectorAll('button')].some((b) => /Portret blocat/.test(b.textContent || '') && b.disabled);
  check('portretul deja ales într-o salvare veche e marcat ca folosit', locked);
  await photoApp.sleep(1200);
  let migratedPhoto = null;
  try {
    migratedPhoto = JSON.parse(photoApp.window.localStorage.getItem(slotKey(1)) || 'null');
  } catch {}
  const migAv = migratedPhoto && migratedPhoto.manager && migratedPhoto.manager.avatar;
  check(
    'migrarea scrie photoChangeUsed, nu pierde portretul',
    !!(migAv && migAv.photoChangeUsed === true && migAv.photoId === 'coach-07'),
    migAv ? `photoId ${migAv.photoId}, folosit ${migAv.photoChangeUsed}` : 'fără avatar'
  );
  await photoApp.close();

  // Salvările vechi primesc posturile corectate, dar nu sunt rearanjate automat.
  const oldFcsb = JSON.parse(raw);
  const squad = oldFcsb.clubs.find(c => c.id === 'fcsb').players;
  const legacy = { 'Meriton Korenica':['RW','FW'], 'David Miculescu':['LW','FW'], 'Joao Paulo Fernandes':['AM','MF'], 'Ofri Arad':['CB','DF'], 'Mihai Toma':['AM','MF'], 'Luca Stancu':['CM','MF'] };
  for (const player of squad) if (legacy[player.name]) {
    [player.pos, player.linePos] = legacy[player.name]; player.role = player.pos;
    if (player.name === 'Meriton Korenica') player.number = 9;
  }
  const originalLineup = JSON.stringify(oldFcsb.lineupIds);
  const migratedApp = await launch({ seed: { [slotKey(1)]: JSON.stringify(oldFcsb) } });
  await migratedApp.sleep(1300);
  const migrated = JSON.parse(migratedApp.window.localStorage.getItem(slotKey(1)));
  const migratedSquad = migrated.clubs.find(c => c.id === 'fcsb').players;
  const corrected = { 'Meriton Korenica':'LW', 'David Miculescu':'RW', 'Joao Paulo Fernandes':'DM', 'Ofri Arad':'DM', 'Mihai Toma':'LW', 'Luca Stancu':'RB' };
  check('salvarea FCSB veche primește posturile corectate', Object.entries(corrected).every(([name,pos]) => migratedSquad.find(p => p.name === name)?.pos === pos));
  check('numărul lui Korenica se corectează când este liber', migratedSquad.find(p => p.name === 'Meriton Korenica')?.number === 7);
  check('migrarea păstrează selecția manuală de titulari și rezerve', JSON.stringify(migrated.lineupIds) === originalLineup);
  check('migrarea lotului nu produce erori', migratedApp.errors.length === 0, migratedApp.errors[0]);
  migratedApp.close();

  const collision = JSON.parse(raw);
  const cs = collision.clubs.find(c => c.id === 'fcsb').players;
  cs.find(p => p.name === 'Meriton Korenica').number = 9;
  cs.find(p => p.name === 'Luca Stancu').number = 7;
  const collisionApp = await launch({seed:{[slotKey(1)]:JSON.stringify(collision)}});
  await collisionApp.sleep(1300);
  const after = JSON.parse(collisionApp.window.localStorage.getItem(slotKey(1))).clubs.find(c => c.id === 'fcsb').players;
  check('numărul existent nu este duplicat în salvările personalizate', after.find(p => p.name === 'Meriton Korenica').number === 9 && after.find(p => p.name === 'Luca Stancu').number === 7);
  collisionApp.close();

  console.log(`\n${passed} verificări OK, ${failed} eșuate`);
  process.exit(failed === 0 ? 0 : 1);
})();
