/** Teste de carieră în DOM: simulare în bloc, final de sezon și demitere. */
const assert = require('node:assert/strict');
const { launch } = require('./dom-harness');
const KEY = 'sm2627_career_slot_1';
const read = app => JSON.parse(app.window.localStorage.getItem(KEY) || 'null');
async function waitUntil(app, predicate, label, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (predicate()) return;
    if (app.errors.length) throw new Error(app.errors.join('\n'));
    await app.sleep(100);
  }
  throw new Error(`Timeout: ${label}`);
}
async function simulate(app, button) {
  const before = read(app).currentRound;
  assert(app.click(label => label === button), `butonul ${button}`);
  await waitUntil(app, () => app.labels().includes('Stop') || read(app)?.currentRound !== before, 'pornire simulare');
  await waitUntil(app, () => !app.labels().includes('Stop'), 'sfârșit simulare');
  await app.sleep(600);
}
(async () => {
  let app = await launch();
  try {
    assert(app.click(/Semnează Contractul/));
    await waitUntil(app, () => !!read(app), 'salvare inițială');
    const initial = read(app);
    initial.manager.clubSharesPct = 100; // pragul de demitere de 8, fără a dezactiva mecanica
    initial.difficulty = "normal";
    initial.clubs.forEach(c => c.players.forEach(p => { p.ovr = c.id === initial.userClubId ? 99 : 30; }));
    app.close();
    app = await launch({ seed: { [KEY]: JSON.stringify(initial) } });
    await waitUntil(app, () => /Centru Comandă/.test(app.text()), 'carieră încărcată');
    // Cu echipele controlate, fixează generatorul: testul sezonului nu depinde de noroc sau demitere.
    app.window.Math.random = () => .8;
    await simulate(app, 'Tur');
    let career = read(app);
    assert.equal(career.currentRound, 16);
    assert(career.calendar.slice(0, 15).every(r => r.fixtures.every(f => f.played)));
    console.log('  ✓ turul include etapa 15');
    const input = app.document.querySelector('input[aria-label="Etapa până la care simulezi"]');
    assert(input);
    // Ținta inițială se actualizează la etapa curentă; testăm inclusiv această etapă.
    assert.equal(Number(input.value), 16);
    await simulate(app, '▶');
    career = read(app);
    assert.equal(career.currentRound, 17);
    assert(career.calendar.find(r => r.roundNumber === 16).fixtures.every(f => f.played));
    console.log('  ✓ ținta numerică include etapa curentă');
    await simulate(app, 'Sezon');
    career = read(app);
    assert.equal(career.currentRound, 41);
    assert.equal(career.calendar.length, 40);
    assert(career.playoffSplitDone);
    assert(career.calendar.every(r => r.fixtures.every(f => f.played && Number.isFinite(f.homeGoals) && Number.isFinite(f.awayGoals))));
    assert.equal(career.careerStats.matches, 40);
    assert.match(app.text(), /Final de Sezon/);
    console.log('  ✓ sezonul include faza finală și toate rezultatele');
    assert(app.click(/Începe Sezonul Următor/));
    await waitUntil(app, () => read(app)?.season !== initial.season, 'sezon nou');
    await app.sleep(500);
    career = read(app);
    assert.equal(career.currentRound, 1);
    assert.equal(career.calendar.length, 30);
    assert(!career.playoffSplitDone);
    const saved = app.window.localStorage.getItem(KEY);
    app.close();
    app = await launch({ seed: { [KEY]: saved } });
    await waitUntil(app, () => /Centru Comandă/.test(app.text()), 'reîncărcare sezon nou');
    assert.equal(read(app).season, career.season);
    assert.equal(read(app).currentRound, 1);
    console.log('  ✓ tranziția și reîncărcarea carierei funcționează');
    app.close();
    initial.boardConfidence = 0;
    initial.difficulty = 'hardcore';
    initial.manager.clubSharesPct = 0;
    app = await launch({ seed: { [KEY]: JSON.stringify(initial) } });
    await waitUntil(app, () => /Centru Comandă/.test(app.text()), 'carieră pentru demitere');
    await simulate(app, 'Sezon');
    career = read(app);
    assert.equal(career.currentRound, 2, 'simularea se oprește imediat la demitere');
    assert.match(app.text(), /demitere/i);
    assert.match(app.text(), /rezili|demis|concediat/i);
    console.log('  ✓ demiterea oprește simularea și afișează decizia');
    assert.deepEqual(app.errors, []);
  } finally { app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
