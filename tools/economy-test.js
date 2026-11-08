/**
 * Teste pentru economia cluburilor, pe cariera generată de joc.
 *
 * Verifică două lucruri pe care le-am calibrat:
 *  1. masa salarială a lotului e o fracțiune realistă din bugetul de salarii
 *     (înainte: 33–65% în România și ~2% la cluburile europene, unde bugetul
 *     era de fapt un buget de transferuri — 14–19 milioane/lună);
 *  2. antrenorul nu mai câștigă de peste două ori cât cel mai bine plătit jucător.
 */
const { launch } = require('./dom-harness');

const MIN_SHARE = 0.55;
const MAX_SHARE = 0.9;
const MAX_MANAGER_RATIO = 1.5;

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

(async () => {
  console.log('Economie: masa salarială vs buget');
  const app = await launch();
  await app.sleep(700);
  app.click(/Semnează Contractul/);
  await app.waitFor(/Centru Comandă/);
  await app.sleep(1500);

  const raw = app.window.localStorage.getItem('sm2627_career_slot_1');
  const career = raw ? JSON.parse(raw) : null;
  check('cariera generată conține cluburi', !!career && Array.isArray(career.clubs) && career.clubs.length > 10);

  const rows = (career?.clubs || [])
    .map((club) => {
      const players = club.players || [];
      const wageBill = players.reduce((sum, p) => sum + (p.wage || 0), 0);
      const topWage = players.reduce((max, p) => Math.max(max, p.wage || 0), 0);
      return {
        id: club.id,
        league: club.league,
        players: players.length,
        missingWage: players.filter((p) => !(p.wage > 0)).length,
        wageBill,
        topWage,
        manager: club.managerSalary || 0,
        budget: club.wageBudgetMonthly || 0,
        share: club.wageBudgetMonthly ? wageBill / club.wageBudgetMonthly : 0,
      };
    })
    .filter((r) => r.players > 0);

  check('există loturi pentru toate cluburile', rows.length >= 24, `${rows.length} cluburi`);

  const outOfRange = rows.filter((r) => r.share < MIN_SHARE || r.share > MAX_SHARE);
  const worst = outOfRange
    .slice(0, 4)
    .map((r) => `${r.id} ${(r.share * 100).toFixed(0)}%`)
    .join(', ');
  check(
    `masa salarială e între ${Math.round(MIN_SHARE * 100)}% și ${Math.round(MAX_SHARE * 100)}% din buget la fiecare club`,
    outOfRange.length === 0,
    worst
  );

  const eu = rows.filter((r) => r.league === 'EU');
  check(
    'cluburile europene nu au buget de salarii absurd (sub 1 milion/lună)',
    eu.length > 0 && eu.every((r) => r.budget > 0 && r.budget < 1e6),
    eu.map((r) => `${r.id} ${r.budget}`).join(', ')
  );

  const greedy = rows.filter((r) => r.manager > r.topWage * MAX_MANAGER_RATIO);
  check(
    `antrenorul câștigă cel mult ${MAX_MANAGER_RATIO}× cât cel mai bine plătit jucător`,
    greedy.length === 0,
    greedy.map((r) => `${r.id} ${r.manager} vs ${r.topWage}`).join(', ')
  );

  const noWage = rows.filter((r) => r.missingWage > 0);
  check('fiecare jucător are salariu', noWage.length === 0, noWage.map((r) => r.id).join(', '));

  await app.close();
  console.log(`\n${passed} verificări OK, ${failed} eșuate`);
  process.exit(failed === 0 ? 0 : 1);
})();
