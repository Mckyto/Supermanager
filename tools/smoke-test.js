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

  const descs = [...app.document.querySelectorAll('button p')].filter((p) =>
    /Jucătorii te respectă|Începi cu reputație|Deblochezi opțiuni|Conducerea și suporterii/.test(p.textContent || '')
  );
  const clipped = descs.filter((p) => /line-clamp-2/.test(p.className));
  check('cele 4 arhetipuri au descriere proprie', descs.length === 4, `${descs.length} descrieri`);
  check(
    'descrierea arhetipului selectat e afișată integral',
    descs.length === 4 && clipped.length === 3,
    `${clipped.length} trunchiate din ${descs.length}`
  );

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

async function scenarioFacilities() {
  console.log('\n4. Facilități, șantiere și costul deciziilor');
  const before = app.errors.length;
  const { window } = app;

  const fac = window.__smFac;
  check('funcțiile de cost sunt expuse în bundle', !!fac);
  if (fac) {
    const cost = [1, 2, 3].map((l) => fac.cost('hybridTurf', l, 'RO', 'realistic'));
    check('gazonul costă ×2, ×6, ×16 pe niveluri', cost.join('/') === '280000/840000/2240000', cost.join('/'));
    const total = ['hybridTurf', 'cryoClinic', 'vipStands', 'videoLab']
      .map((id) => [1, 2, 3].map((l) => fac.cost(id, l, 'RO', 'realistic')).reduce((a, b) => a + b, 0))
      .reduce((a, b) => a + b, 0);
    check('toate facilitățile la maxim costă peste 13 milioane', total > 13e6, `${(total / 1e6).toFixed(2)} mil. €`);
    check(
      'mentenanța e 2% din investiție (toate la nivel 4)',
      fac.upkeep({ hybridTurf: 4, cryoClinic: 4, vipStands: 4, videoLab: 4 }) === 266000,
      `${fac.upkeep({ hybridTurf: 4, cryoClinic: 4, vipStands: 4, videoLab: 4 })} €/lună`
    );
    const overrun = fac.plan('hybridTurf', 1, { leagueCode: 'RO', difficulty: 'realistic' }, () => 0.05);
    const delayed = fac.plan('hybridTurf', 1, { leagueCode: 'RO', difficulty: 'realistic' }, () => 0.15);
    const clean = fac.plan('hybridTurf', 1, { leagueCode: 'RO', difficulty: 'realistic' }, () => 0.9);
    check('20% din șantiere au depășire sau întârziere', overrun.cost > overrun.rounds * 0 && overrun.overrun && delayed.delay && !clean.overrun && !clean.delay);
    check('șantierul durează 7 etape (10 cu întârziere)', clean.rounds === 7 && delayed.rounds === 10, `${clean.rounds}/${delayed.rounds}`);
    const ticked = fac.tick({ hybridTurf: { to: 2, readyRound: 5 } }, { hybridTurf: 1, cryoClinic: 1, vipStands: 1, videoLab: 1 }, 5, []);
    check('nivelul crește doar la recepție', ticked.facilities.hybridTurf === 2 && !ticked.facilityWorks.hybridTurf);
    const early = fac.tick({ hybridTurf: { to: 2, readyRound: 5 } }, { hybridTurf: 1 }, 4, []);
    check('șantierul nu avansează nivelul înainte de termen', early.facilities.hybridTurf === 1);
    const career = {
      leagueCode: 'RO',
      userClubId: 'u',
      clubs: ['u', 'a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, name: id.toUpperCase(), league: 'RO', shortName: id.toUpperCase() })),
      calendar: [],
    };
    check('nivelul 4 e blocat fără loc de cupe europene', /top 3/.test(String(fac.gate(career, 4))), String(fac.gate(career, 4)).slice(0, 48));
  }

  if (!app.click(/Academie & Club/)) return fail('tab-ul Academie & Club există');
  await app.sleep(500);
  if (!app.click(/Stadion & Bilete/)) return fail('sub-tab-ul Stadion & Bilete există');
  await app.sleep(600);

  const panel = app.text();
  check('panoul afișează mentenanța lunară', /Mentenanță:/.test(panel));
  check('butonul arată costul și durata șantierului', /⬆️ Nivelul 2 • [\d.]+ € • 7 etape/.test(panel));
  check('riscul de șantier e anunțat', /12% depășire/.test(panel));

  const storage = window.localStorage;
  const readBudget = () => {
    for (let i = 0; i < storage.length; i += 1) {
      const raw = storage.getItem(storage.key(i));
      if (!raw || !/userClubId/.test(raw)) continue;
      try {
        const career = JSON.parse(raw);
        const club = (career.clubs || []).find((c) => c.id === career.userClubId);
        if (club) return club.budget;
      } catch { /* cheie care nu e carieră */ }
    }
    return null;
  };
  const budgetBefore = readBudget();
  check('butonul de modernizare e apăsat', app.click(/⬆️ Nivelul 2 • /));
  await app.sleep(700);
  const panelAfter = app.text();
  check('șantierul e anunțat în panou', /Șantier la Nivelul 2/.test(panelAfter), (panelAfter.match(/Șantier[^.]{0,70}/) || [])[0]);
  const budgetAfter = readBudget();
  check(
    'costul lucrării se scade din buget',
    budgetBefore === null || budgetAfter === null || budgetAfter <= budgetBefore - 220000,
    `${budgetBefore} → ${budgetAfter}`
  );
  check('al doilea șantier e blocat', /Un singur șantier activ/.test(app.text()));
  check('fără erori în panoul de facilități', app.errors.length === before, app.errors[before]);

  const tixBefore = readBudget();
  app.click(/Bilete Populare/);
  await app.sleep(600);
  const tixAfter = readBudget();
  check(
    'schimbarea politicii de bilete costă bani',
    tixBefore === null || tixAfter === null || tixAfter < tixBefore,
    `${tixBefore} → ${tixAfter}`
  );
  check('fără erori după schimbarea biletelor', app.errors.length === before, app.errors[before]);

  app.click(/Centru Comandă/);
  await app.sleep(400);
}

async function scenarioMatch() {
  console.log('\n5. Meci live');
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

  // meciul trebuie să curgă fără popup-uri de decizie
  const DECIZII = /Corecții Tactice pe Tablă|Dialog 1-la-1|Analiza Secundului|Pericol de Eliminare|Ultimele 15 Minute|Gestionare Efort|Protejarea Avantajului/;
  let decizieInMeci = null;
  let halftimeText = null;
  for (let i = 0; i < 20 && !halftimeText; i += 1) {
    await app.sleep(1000);
    const t = app.text();
    if (!decizieInMeci && DECIZII.test(t)) decizieInMeci = (t.match(DECIZII) || [])[0];
    if (/Vestiar la Pauză/.test(t)) halftimeText = t;
  }
  check('pauza de la 45\' apare', !!halftimeText);
  check('nicio decizie în timpul meciului', !decizieInMeci, decizieInMeci || 'curat');
  check('pauza nu cere decizii', !!halftimeText && !DECIZII.test(halftimeText));
  if (halftimeText) {
    if (app.click(/Începe Repriza a Doua/)) {
      await app.sleep(2500);
      const afterResume = liveMinute();
      check('repriza a doua reia jocul', afterResume === null || afterResume >= 45, `${afterResume}'`);

      // până la fluierul final, ca să verificăm reacția jucătorului
      let finalText = null;
      for (let i = 0; i < 60 && !finalText; i += 1) {
        await app.sleep(400);
        const t = app.text();
        if (!decizieInMeci && DECIZII.test(t)) decizieInMeci = (t.match(DECIZII) || [])[0];
        if (/Fluier Final/.test(t)) finalText = t;
      }
      check('meciul ajunge la fluierul final', !!finalText);
      if (finalText) {
        app.click(/Continuă în Carieră/);
        await app.sleep(2500);
        const reaction = (app.text().match(/🗣️[^]{0,220}/) || [])[0] || '';
        check('după meci apare reacția unui jucător', /🗣️/.test(reaction), reaction.slice(0, 60));
        // scorul e scris în chiar textul reacției: „după FCSB 1-0 CSI:”
        const score = reaction.match(/după\s+(\S+)\s+(\d+)\s*-\s*(\d+)\s+(\S+?):/);
        if (score) {
          const [home, away] = [Number(score[2]), Number(score[3])];
          const userIsHome = /^FCSB$/i.test(score[1]);
          const mine = userIsHome ? home : away;
          const theirs = userIsHome ? away : home;
          const expected = mine === theirs
            ? /Un punct luat|Am controlat jocul|Echilibru pe tabelă/
            : mine > theirs
            ? /Am dat totul pentru culori|Așa arată o echipă|Vestiarul e sudat/
            : /Ne asumăm înfrângerea|Am greșit în momentele-cheie|Durere mare în vestiar/;
          check(
            'reacția se potrivește cu rezultatul',
            expected.test(reaction),
            `${score[1]} ${home}-${away} → ${expected.source.slice(0, 40)}`
          );
        } else {
          fail('scorul apare în reacție', reaction.slice(0, 80));
        }
      }
    } else {
      fail('butonul „Începe Repriza a Doua" există');
    }
  }

  check('fără erori în timpul meciului', app.errors.length === before, app.errors[before]);
}

async function scenarioAccessibility() {
  console.log('\n9. Accesibilitate');
  const { document, window } = app;

  // fontul minim: clasele utilitare mici nu mai coboară sub 12px
  const probe = document.createElement('span');
  probe.className = 'text-[10px]';
  document.body.appendChild(probe);
  const small = parseFloat(window.getComputedStyle(probe).fontSize) || 0;
  probe.className = 'text-[9px]';
  const smallest = parseFloat(window.getComputedStyle(probe).fontSize) || 0;
  probe.remove();
  check('niciun text sub 12px', small >= 12 && smallest >= 12, `${smallest}px / ${small}px`);

  const buttons = [...document.querySelectorAll('button')];
  const accName = (b) => (b.getAttribute('aria-label') || (b.textContent || '').trim() || b.getAttribute('title') || '');
  check(
    'fiecare buton are nume accesibil',
    buttons.length > 0 && buttons.every(accName),
    `${buttons.filter((b) => !accName(b)).length} fără nume din ${buttons.length}`
  );
  check(
    'butoanele doar cu iconiță au aria-label',
    buttons.filter((b) => !(b.textContent || '').trim()).every((b) => b.getAttribute('aria-label')),
    'lipsă aria-label'
  );

  const images = [...document.querySelectorAll('img')];
  check(
    'fiecare imagine are atribut alt',
    images.length > 0 && images.every((i) => i.hasAttribute('alt')),
    `${images.filter((i) => !i.hasAttribute('alt')).length} fără alt din ${images.length}`
  );

  const css = [...document.querySelectorAll('style')].map((s) => s.textContent || '').join('\n');
  check('mișcarea redusă e respectată (prefers-reduced-motion)', /prefers-reduced-motion/.test(css));
  check('limba documentului e română', document.documentElement.lang === 'ro', document.documentElement.lang);
}

async function scenarioPhone() {
  console.log('\n6. Telefon: taxe, ceartă și expirare');
  const KEY = 'sm2627_career_slot_1';
  const read = () => {
    try {
      const raw = app.window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };
  const before = app.errors.length;
  const career = read();
  const messages = (career && career.phoneMessages) || [];
  const expired = messages.filter((m) => m.expired && m.taxPaid > 0);
  const scolds = messages.filter((m) => m.scolding);
  check('mesajul ignorat e taxat în bani', expired.length > 0, `${expired.length} taxate, ex. ${expired[0] ? expired[0].taxPaid : 0} €`);
  check('expeditorul te ceartă după ignorare', scolds.length > 0, (scolds[0] && scolds[0].senderName) || '');
  check('taxa e reținută pe expeditor', Object.keys((career && career.ignoreStrikes) || {}).length > 0);
  const ph = app.window.__smPhone;
  check('funcțiile de taxare sunt expuse în bundle', !!ph);
  if (ph) {
    const t1 = ph.tax('Patronat & Consiliu', 1);
    const t2 = ph.tax('Patronat & Consiliu', 2);
    const t3 = ph.tax('Patronat & Consiliu', 3);
    check(
      'taxa patronului escaladează ×1,5 apoi ×2,5',
      t1.club === 80000 && t2.club === 120000 && t3.club === 200000,
      `${t1.club} / ${t2.club} / ${t3.club}`
    );
    const ag = ph.tax('Agent & Impresar', 2);
    check('agentul ia și din contul personal al managerului', ag.club === 52500 && ag.personal === 4500, `${ag.club} / ${ag.personal}`);
    check(
      'textele de reproș diferă pe trepte',
      ph.scold('patron', 1) !== ph.scold('patron', 3) && /taxă|consiliul/i.test(ph.scold('patron', 3))
    );
    check('vestiarul e taxat mai blând decât patronul', ph.tax('Vestiar & Căpitan', 1).club === 25000);
  }

  check(
    'reproșul conține suma taxată',
    scolds.length > 0 && /Te-a taxat cu/.test(scolds[0].outcomeNote || ''),
    scolds[0] ? String(scolds[0].outcomeNote).slice(0, 48) : ''
  );

  if (!app.click(/Telefon/)) return fail('butonul Telefon există');
  await app.sleep(600);
  const panel = app.text();
  check('telefonul arată mesajul expirat cu suma', /Expirat — taxat/.test(panel));
  check('telefonul afișează reproșul primit', /Te-a taxat cu/.test(panel));
  check('fără erori în telefon', app.errors.length === before, app.errors[before]);

  const close = [...app.document.querySelectorAll('button')].find((b) => {
    if ((b.textContent || '').trim()) return false;
    const root = b.closest('.fixed');
    return root && /Telefonul lui Mister/.test(root.textContent || '');
  });
  if (close) close.dispatchEvent(new app.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await app.sleep(400);
}

async function scenarioBulkSim() {
  console.log('\n7. Simulare rapidă (tur / până la etapa X)');
  const KEY = 'sm2627_career_slot_1';
  const read = () => {
    try {
      const raw = app.window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };
  const before = app.errors.length;
  const start = read();
  check('bara de simulare e vizibilă', app.labels().some((l) => l === 'Tur') && app.labels().some((l) => l === 'Sezon'));

  if (!app.click((l) => l === 'Tur')) return fail('butonul Tur există');
  let career = null;
  for (let i = 0; i < 60; i += 1) {
    await app.sleep(500);
    career = read();
    if (career && career.currentRound >= 15) break;
  }
  check(
    'simularea avansează etapele până la tur',
    !!career && career.currentRound >= 15,
    `${start ? start.currentRound : '?'} → ${career ? career.currentRound : '?'}`
  );
  const news = ((career && career.newsFeed) || []).map((n) => n.text).join(' | ');
  check('raportul simulării apare în știri', /SIMULARE ETAPE/.test(news), (news.match(/SIMULARE ETAPE[^|]{0,60}/) || [''])[0]);
  check(
    'în simulare mesajele sunt rezolvate neutru, fără taxe noi',
    ((career && career.phoneMessages) || []).some((m) => m.autoNeutral)
  );
  check('fără erori în timpul simulării', app.errors.length === before, app.errors[before]);
}

async function scenarioPersistence() {
  console.log('\n8. Salvare');
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
    await scenarioFacilities();
    if (!SKIP_MATCH) await scenarioMatch();
    if (!SKIP_MATCH) {
      await scenarioPhone();
      await scenarioBulkSim();
    }
    await scenarioPersistence();
    await scenarioAccessibility();
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
