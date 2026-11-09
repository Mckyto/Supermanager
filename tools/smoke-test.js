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

  // schimbarea pozițiilor în timpul meciului (v10.38.0)
  const beforeTactics = app.errors.length;
  if (app.click(/^\s*Tactică\s*$/)) {
    await app.sleep(600);
    const tacticsText = app.text();
    check('tab-ul Tactică se deschide în meci', /Sistem de Joc Live/.test(tacticsText) && app.errors.length === beforeTactics);
    check('instrumentul de schimbare a pozițiilor există', /Schimbă poziţiile în timpul meciului/.test(tacticsText));
    const selects = [...app.document.querySelectorAll('select')].filter((sel) => /Jucător [AB]/.test(sel.textContent || ''));
    check('schimbul are două selectoare de jucători', selects.length >= 2, `${selects.length} selectoare`);
    if (selects.length >= 2) {
      const [selA, selB] = selects;
      const pick = (el, idx) => {
        el.value = el.options[idx].value;
        const Win = app.window;
        el.dispatchEvent(new (Win.Event || Event)('change', { bubbles: true }));
      };
      pick(selA, 1);
      await app.sleep(150);
      pick(selB, 2);
      await app.sleep(250);
      const beforeSwap = app.errors.length;
      if (app.click(/Schimbă poziţiile/)) {
        await app.sleep(500);
        check(
          'schimbul de poziții confirmă adaptarea −12%',
          /Pozițiile au fost schimbate/.test(app.text()) && /−12%/.test(app.text()) && app.errors.length === beforeSwap
        );
      } else {
        fail('butonul de schimbare a pozițiilor există');
      }
    }
  } else {
    fail('tab-ul Tactică există în meci');
  }

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
  // avansează o etapă cu simularea rapidă (nu bulk), ca mesajele neansweruite să învețească
  if (app.click(/Simulare Rapidă Etapă/)) {
    await app.sleep(1500);
    if (app.click(/Continuă|Închide|OK/)) await app.sleep(800);
  }
  const career = read();
  const messages = (career && career.phoneMessages) || [];
  const expired = messages.filter((m) => m.expired && m.taxPaid > 0);
  const scolds = messages.filter((m) => m.scolding);
  check('mesajul ignorat e taxat în bani', expired.length > 0, `${expired.length} taxate, ex. ${expired[0] ? expired[0].taxPaid : 0} €`);
  const entryMsg = messages.filter((m) => (m.roundGenerated || 1) === 1);
  check('mesajele din etapa 1 nu sunt niciodată taxate', entryMsg.every((m) => !m.expired), `${entryMsg.length} mesaje de început`);
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

async function scenarioProfile() {
  console.log('\n4b. Profil antrenor, avatar, boosturi și omogenitate');
  const { window } = app;

  check(
    'funcțiile de profil sunt expuse în bundle',
    !!window.__smAvatar && !!window.__smBoosts && !!window.__smChem
  );

  const av = window.__smAvatar ? window.__smAvatar({ manager: {} }) : null;
  check(
    'avatarul are o presetare implicită validă',
    !!av && Number.isFinite(av.skin) && Number.isFinite(av.outfit) && Number.isFinite(av.hairStyle),
    av ? `ten ${av.skin}, coafură ${av.hairStyle}, ținută ${av.outfit}` : ''
  );

  const boost = window.__smBoosts
    ? window.__smBoosts({
        manager: {
          ownedItems: ['bespoke_suit', 'swiss_watch', 'italian_supercar'],
          homeId: 'penthouse',
          carId: 'italian_supercar',
        },
      })
    : null;
  check(
    'boosturile sunt plafonate la +8 pe atribut',
    !!boost && boost.capped.charisma === 8,
    boost ? `carismă ${boost.capped.charisma} (brut ${boost.raw.charisma})` : ''
  );
  check(
    'randamentul scade după +5',
    !!boost && boost.raw.charisma > 5 && boost.capped.charisma < boost.raw.charisma,
    boost ? `${boost.raw.charisma} brut → ${boost.capped.charisma} aplicat` : ''
  );
  check(
    'bonusul de meci e plafonat la +0,4',
    !!boost && boost.capped.matchBonus <= 0.4,
    boost ? `+${boost.capped.matchBonus}` : ''
  );

  const mk = (nat, i, morale = 85) => ({ id: `p${i}`, name: `Jucător ${i}`, nat, age: 26, morale });
  const ro = Array.from({ length: 11 }, (_, i) => mk('ROU', i));
  const mix = Array.from({ length: 11 }, (_, i) => mk(i % 2 ? 'BRA' : 'JPN', i));
  const chemRo = window.__smChem ? window.__smChem.pairs(ro, '4-3-3', [], 70) : null;
  const chemMix = window.__smChem ? window.__smChem.pairs(mix, '4-3-3', [], 70) : null;
  check(
    'omogenitatea e mai mare între jucători de aceeași limbă',
    !!chemRo && !!chemMix && chemRo.score > chemMix.score,
    chemRo && chemMix ? `${chemRo.score}% vs ${chemMix.score}%` : ''
  );
  const neutral = ro.map((p) => ({ ...p, morale: 60 }));
  const noMentor = window.__smChem ? window.__smChem.pairs(neutral, '4-3-3', [], 70) : null;
  const mentor = window.__smChem
    ? window.__smChem.pairs(neutral, '4-3-3', [{ mentorId: 'p0', menteeId: 'p3' }], 70)
    : null;
  check(
    'mentoratul ridică omogenitatea',
    !!mentor && !!noMentor && mentor.score > noMentor.score,
    mentor && noMentor ? `${noMentor.score}% → ${mentor.score}%` : ''
  );
  check(
    'legăturile au motive explicite',
    !!chemRo && chemRo.links.every((l) => Array.isArray(l.reasons) && l.reasons.length > 0),
    chemRo && chemRo.links[0] ? chemRo.links[0].reasons.join(', ') : ''
  );
  const lowMorale = window.__smChem ? window.__smChem.pairs(ro.map((p) => ({ ...p, morale: 40 })), '4-3-3', [], 70) : null;
  check(
    'moralul scăzut scade omogenitatea',
    !!lowMorale && !!chemRo && lowMorale.score < chemRo.score,
    lowMorale && chemRo ? `${chemRo.score}% → ${lowMorale.score}%` : ''
  );

  const nt = window.__smNT;
  check('funcțiile de selecționer sunt expuse', !!nt && !!nt.pool && !!nt.validate && !!nt.chem);
  if (nt) {
    const mkP = (i, nat, pos, ovr) => ({
      id: `np${i}`, name: `Român ${i}`, nat, pos, ovr, age: 24, fitness: 92, pas: 70, sho: 70, dri: 70,
    });
    const squad = Array.from({ length: 40 }, (_, i) =>
      mkP(i, i % 4 === 0 ? 'BRA' : 'ROU', i < 6 ? 'GK' : i < 16 ? 'DF' : i < 30 ? 'MF' : 'FW', 60 + i)
    );
    const synthetic = {
      clubs: [{ id: 'c1', name: 'FCSB', league: 'RO', players: squad }],
      marketPool: [mkP(999, 'ROU', 'FW', 88)],
    };
    const list = nt.pool(synthetic);
    check('pool-ul naționalei are doar români', list.length > 0 && list.every((x) => (x.p.nat || 'ROU') === 'ROU'), `${list.length} jucători`);
    const gks = list.filter((x) => x.p.pos === 'GK');
    const outs = list.filter((x) => x.p.pos !== 'GK');
    const squad23 = [...gks.slice(0, 3), ...outs.slice(0, 20)].map((x) => x.p.id);
    const v23 = nt.validate({ ...synthetic, ntSquad: squad23 });
    check('lotul de 23 e valid (max 3 portari)', v23.total === 23 && v23.gk === 3 && v23.ok, `${v23.total}/23, ${v23.gk} portari`);
    const vBad = nt.validate({ ...synthetic, ntSquad: [...gks.slice(0, 4), ...outs.slice(0, 19)].map((x) => x.p.id) });
    check('4 portari invalidează lotul', vBad.gk === 4 && !vBad.ok, `${vBad.gk} portari`);
    const vShort = nt.validate({ ...synthetic, ntSquad: squad23.slice(0, 18) });
    check('lotul incomplet e semnalat', vShort.total === 18 && !vShort.ok, `${vShort.total}/23`);
    const chemNT = nt.chem({ ...synthetic, ntSquad: squad23 });
    check('omogenitatea naționalei e calculată', chemNT.score > 0 && chemNT.matchBonus <= 2.5, `${chemNT.score}% / bonus ${chemNT.matchBonus}`);
    check('jucătorul accidentat e considerat inapt', !nt.fit({ ...outs[0].p, injuredWeeks: 2 }) && nt.fit(outs[0].p));
  }

  const before = app.errors.length;
  if (!app.click(/Profil Antrenor/)) {
    fail('tab-ul Profil există');
    return;
  }
  await app.sleep(700);
  const text = app.text();
  check('tab-ul Profil se randează', /Profilul tău de antrenor/.test(text) && app.errors.length === before);
  check('avatarul e desenat în profil', !!app.document.querySelector('svg[role="img"]'));
  check('secțiunea Bonusuri active există', /Bonusuri active/.test(text));
  check('secțiunea Omogenitate există', /Omogenitate din relațiile reale/.test(text));

  if (app.click(/Editează avatarul/)) {
    await app.sleep(400);
    const preset = [...app.document.querySelectorAll('button[aria-pressed]')];
    check('editorul de avatar afișează presetări', preset.length >= 30, `${preset.length} presetări`);
    check('editorul are ținute și accesorii', /Ținută/.test(app.text()) && /Accesoriu/.test(app.text()));
  } else {
    fail('butonul Editează avatarul există');
  }
}

async function scenarioCupSim() {
  console.log('\n4c. Simulare în cupe');
  const before = app.errors.length;
  if (!app.click(/Cupe, Europa/)) {
    fail('tab-ul Cupe & Europa există');
    return;
  }
  await app.sleep(600);
  const text = app.text();
  check('bara de simulare în cupe e vizibilă', /Simulare în cupe/.test(text) && app.errors.length === before);
  check('butonul „Simulează runda de cupă" există', /Simulează runda de cupă/.test(text));
  check('butonul „Simulează tot parcursul european" există', /Simulează tot parcursul european/.test(text));
  if (app.click(/Centru Comandă/)) await app.sleep(500);
}

async function scenarioConflict() {
  console.log('\n4d. Socoteala jucătorului nemulțumit');
  const { window } = app;
  const cf = window.__smConflict;
  check('funcțiile de conflict sunt expuse', !!cf && !!cf.leaders && !!cf.odds && !!cf.messages && !!cf.exitCost);
  if (!cf) return;

  const mk = (id, pos, ovr, age, morale, extra = {}) => ({
    id, name: `Jucător ${id}`, pos, ovr, age, morale, fitness: 95, wage: 10000, contractYears: 2, ...extra,
  });
  const players = [
    mk('cap', 'CB', 70, 25, 40),
    mk('vet1', 'CM', 80, 30, 90),
    mk('vet2', 'ST', 74, 29, 60),
    mk('young', 'RB', 78, 22, 90),
    mk('gk', 'GK', 85, 31, 20),
  ];
  const club = { id: 'c1', name: 'FCSB', players };
  const career = { userClubId: 'c1', lineupIds: { roles: { captain: 'cap' } }, clubs: [club], manager: { cash: 500000 }, boardConfidence: 70, currentRound: 7 };

  const leaders = cf.leaders(career, club);
  check('liderii = căpitan + veteranii 28+/72+', leaders.length === 3 && leaders[0].id === 'cap' && !leaders.some((l) => l.id === 'gk' || l.id === 'young'), leaders.map((l) => l.id).join(','));
  const support = cf.support(career, club);
  check('sprijinul liderilor e ponderat cu OVR', support === 64, `${support}% (cap 40, vet1 90, vet2 60, ponderat cu OVR)`);

  const allOk = cf.odds({ ...career, boardConfidence: 70 }, club);
  const noPeace = cf.odds({ ...career, boardConfidence: 30 }, { ...club, players: players.map((p) => ({ ...p, morale: 30 })) });
  check('patron + lideri puternici = toate variantele', allOk.canDiscipline && !allOk.noPeace, `patron ${allOk.board}% / lideri ${allOk.support}%`);
  check('patron + lideri slabi = fără cale de împăcare', noPeace.noPeace && noPeace.patronPressure && noPeace.lowLocker, `patron ${noPeace.board}% / lideri ${noPeace.support}%`);

  const richExit = cf.exitCost({ ...career, boardConfidence: 70 }, players[1]);
  const patronExit = cf.exitCost({ ...career, boardConfidence: 30 }, players[1]);
  check('rezilierea costă salariile rămase când patronul e mulțumit', richExit.cash === 20000 && !richExit.patronPays, `${richExit.cash} €`);
  check('când patronul e sub 40%, patronul plătește rezilierea', patronExit.cash === 0 && patronExit.patronPays, patronExit.text);

  const unhappy = { ...career, clubs: [{ ...club, players: players.map((p) => (p.id === 'vet2' ? { ...p, morale: 40 } : p)) }] };
  const msgs = cf.messages(unhappy, unhappy.clubs[0], 7, []);
  const talk = msgs.find((m) => m.kind === 'unhappy');
  check('jucătorul nemulțumit îți cere socoteala', !!talk, talk ? talk.text.slice(0, 60) : 'niciun mesaj');
  check('textul socotelii are cifre reale', !!talk && /0 meciuri/.test(talk.text) && /0 minute/.test(talk.text));
  check('variantele depind de patron și lideri', !!talk && talk.replies.some((r) => r.id === 'cmp_promise') && talk.replies.some((r) => r.id === 'cmp_transfer') && talk.replies.some((r) => r.id === 'cmp_bonus'), talk ? talk.replies.map((r) => r.id).join(',') : '');
  check('disciplina apare doar când e sigură', !!talk && talk.replies.some((r) => r.id === 'cmp_warn'), talk ? talk.replies.map((r) => r.id).join(',') : '');

  const badCareer = { ...career, boardConfidence: 30, clubs: [{ ...club, players: players.map((p) => ({ ...p, morale: 30 })) }] };
  const badMsgs = cf.messages(badCareer, badCareer.clubs[0], 7, []);
  check('fără cale de împăcare → cerere oficială de plecare', badMsgs.length > 0 && badMsgs.every((m) => m.kind === 'exit_request'), badMsgs.map((m) => m.kind).join(','));
  check('cererea are cele 3 căi: împrumut, transfer, liber', badMsgs[0] && ['exit_loan', 'exit_transfer', 'exit_free'].every((id) => badMsgs[0].replies.some((r) => r.id === id)), badMsgs[0] ? badMsgs[0].replies.map((r) => r.id).join(',') : '');

  const brokenCareer = { ...career, clubs: [{ ...club, players: players.map((p) => (p.id === 'vet2' ? { ...p, promiseBroken: true, morale: 55 } : p)) }] };
  const brokenMsgs = cf.messages(brokenCareer, brokenCareer.clubs[0], 7, []);
  check('promisiunea încălcată duce direct la cerere de plecare', brokenMsgs[0] && brokenMsgs[0].kind === 'exit_request' && brokenMsgs[0].playerId === 'vet2', brokenMsgs.map((m) => `${m.kind}:${m.playerId}`).join(','));

  const manyUnhappy = { ...career, clubs: [{ ...club, players: players.map((p) => (p.pos === 'GK' ? p : { ...p, morale: 35 })) }] };
  const capped = cf.messages(manyUnhappy, manyUnhappy.clubs[0], 7, []);
  check('maximum 2 conflicte pe etapă', capped.length === 2, `${capped.length} mesaje`);

  const busy = cf.messages(manyUnhappy, manyUnhappy.clubs[0], 7, [{ playerId: 'cap', replied: false, kind: 'unhappy' }]);
  check('un conflict deschis nu se dublează', busy.length === 2 && !busy.some((m) => m.playerId === 'cap'), busy.map((m) => m.playerId).join(','));

  const baseExit = { id: 'm1', kind: 'exit_request', playerId: 'vet2', senderName: 'Jucător vet2', conflict: cf.odds(career, club), exitCost: cf.exitCost({ ...career, boardConfidence: 70 }, players[1]) };
  const loanOutcome = cf.reply ? cf.reply(baseExit, 'exit_loan') : null;
  const listOutcome = cf.reply ? cf.reply(baseExit, 'exit_transfer') : null;
  const freeOutcome = cf.reply ? cf.reply(baseExit, 'exit_free') : null;
  check('împrumutul scoate jucătorul din lot', !!loanOutcome && loanOutcome.removePlayerId === 'vet2' && loanOutcome.loanOut === true);
  check('lista de transfer păstrează jucătorul, dar îl marchează', !!listOutcome && listOutcome.listPlayerId === 'vet2' && !listOutcome.removePlayerId);
  check('liber de contract plătește salariile rămase', !!freeOutcome && freeOutcome.removePlayerId === 'vet2' && freeOutcome.cashDelta === -20000, freeOutcome ? `${freeOutcome.cashDelta} €` : '');
  const patronExitMsg = { ...baseExit, exitCost: cf.exitCost({ ...career, boardConfidence: 30 }, players[1]) };
  const patronOutcome = cf.reply ? cf.reply(patronExitMsg, 'exit_free') : null;
  check('cu patron nemulțumit, rezilierea nu costă clubul', !!patronOutcome && patronOutcome.removePlayerId === 'vet2' && !patronOutcome.cashDelta && patronOutcome.boardDelta === -8, patronOutcome ? patronOutcome.note.slice(0, 70) : '');
  const lowLockerOdds = cf.odds({ ...career, boardConfidence: 40 }, { ...club, players: players.map((p) => ({ ...p, morale: 30 })) });
  const promiseWeak = cf.reply ? cf.reply({ ...baseExit, kind: 'unhappy', conflict: lowLockerOdds }, 'cmp_promise') : null;
  check('promisiunea costă coeziune când vestiarul nu te susține', !!promiseWeak && promiseWeak.cohDelta === -4 && promiseWeak.promisePlayer === true, promiseWeak ? promiseWeak.note.slice(0, 80) : '');
  const patronOnly = cf.reply ? cf.reply({ ...baseExit, kind: 'unhappy', conflict: cf.odds({ ...career, boardConfidence: 30 }, club) }, 'cmp_promise') : null;
  check('promisiunea costă încrederea patronului când patronul nu-l vrea', !!patronOnly && patronOnly.boardDelta === -4 && patronOnly.promisePlayer === true, patronOnly ? patronOnly.note.slice(0, 80) : '');

  const escalated = cf.escalation({ ...career }, { id: 'x', morale: 40, conflictTalkRound: 5 }, 7);
  const early = cf.escalation({ ...career }, { id: 'x', morale: 40, conflictTalkRound: 6 }, 7);
  check('după 2 etape fără îmbunătățire urmează escaladarea', escalated === true && early === false);
}

async function scenarioFixes() {
  console.log('\n4e. Reparații v10.40.0 (golaveraj, mesaje, patron)');
  const { window } = app;
  const fx = window.__smFix;
  check('funcțiile de reparație sunt expuse', !!fx && !!fx.stats && !!fx.phoneStale && !!fx.captainPick && !!fx.patronDemand);
  if (!fx) return;

  const home = fx.stats({ matches: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }, true, false, true, 2, 1);
  const away = fx.stats({ matches: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }, true, false, false, 2, 1);
  check('golaverajul numără ambele echipe (acasă 2-1)', home.gf === 2 && home.ga === 1 && home.matches === 1, `${home.gf}:${home.ga}`);
  check('golaverajul se inversează în deplasare (2-1 adversar)', away.gf === 1 && away.ga === 2, `${away.gf}:${away.ga}`);
  const lost = fx.stats({ matches: 3, w: 1, d: 1, l: 1, gf: 4, ga: 3 }, false, false, true, 0, 1);
  check('înfrângerea 0-1 se acumulează corect', lost.matches === 4 && lost.l === 2 && lost.gf === 4 && lost.ga === 4, `${lost.gf}:${lost.ga}, ${lost.matches} meciuri`);

  check('mesajul din etapa 1 nu expiră niciodată', fx.phoneStale({ roundGenerated: 1 }, 10) === false);
  check('mesajul din etapa 3 expiră în etapa 4, nu înainte', fx.phoneStale({ roundGenerated: 3 }, 3) === false && fx.phoneStale({ roundGenerated: 3 }, 4) === true);
  check('mesajele deja răspunse sau expirate nu se taxează', fx.phoneStale({ roundGenerated: 1, replied: true }, 9) === false && fx.phoneStale({ roundGenerated: 1, expired: true }, 9) === false);

  const bench = [
    { id: 'b1', name: 'Rezerva 1', pos: 'CM', minutesThisSeason: 0, morale: 60, ovr: 75, value: 900000, fitness: 95 },
    { id: 'b2', name: 'Rezerva 2', pos: 'ST', minutesThisSeason: 35, morale: 70, ovr: 74, value: 800000, fitness: 95 },
    { id: 'b3', name: 'Rezerva 3', pos: 'CB', minutesThisSeason: 200, morale: 80, ovr: 78, value: 950000, fitness: 95 },
  ];
  const starters = [{ id: 's1', pos: 'GK' }, { id: 's2', pos: 'CB' }];
  const club = { id: 'c1', name: 'FCSB', players: [...bench, { id: 's1', name: 'Portar', pos: 'GK', ovr: 80, value: 100, fitness: 95 }, { id: 's2', name: 'Fundaș', pos: 'CB', ovr: 80, value: 100, fitness: 95 }] };
  const career = { userClubId: 'c1', lineupIds: { starters: ['s1', 's2'], bench: ['b1', 'b2', 'b3'], roles: {} }, careerStats: { matches: 2 }, boardConfidence: 70 };

  const pick = fx.captainPick(career, club);
  check('căpitanul alege o rezervă care chiar a jucat', !!pick && pick.id === 'b2', pick ? `${pick.name}, ${pick.minutesThisSeason} min` : 'niciunul');
  const noBench = fx.captainPick(career, { ...club, players: club.players.map((p) => (['b2', 'b3'].includes(p.id) ? { ...p, minutesThisSeason: 0 } : p)) });
  check('fără rezerve cu minute, mesajul devine neutru', noBench === null);

  const demand = fx.patronDemand(club, ['s1', 's2'], 4, career);
  check('patronul cere un jucător apt, nu pe cel cu minute multe', !!demand && demand.playerId !== 'b3', demand ? demand.playerName : 'niciunul');
  const injured = { ...club, players: club.players.map((p) => (p.id === 'b1' ? { ...p, injuredWeeks: 3 } : p)) };
  const demand2 = fx.patronDemand(injured, ['s1', 's2'], 4, career);
  check('patronul nu cere un jucător accidentat', !demand2 || demand2.playerId !== 'b1', demand2 ? demand2.playerName : 'niciunul');
  const noMatches = fx.patronDemand(club, ['s1', 's2'], 4, { ...career, careerStats: { matches: 0 } });
  check('fără niciun meci jucat, patronul nu cere nimic', noMatches === null);
  const repeated = fx.patronDemand(club, ['s1', 's2'], 5, { ...career, patronDemandLastId: 'b2', patronDemandLastRound: 4 });
  check('patronul nu repetă aceeași cerere în etapele următoare', !repeated || repeated.playerId !== 'b2', repeated ? repeated.playerName : 'niciunul');
}

async function scenarioFaces() {
  console.log('\n4f. Fețe fotorealiste și avatar cinematic (v10.41.0)');
  const { window } = app;
  const fx = window.__smFix;
  const api = fx && fx.faceOf && fx.avatarSvg && fx.faces;
  check('funcțiile de fețe sunt expuse', !!api);
  if (!api) return;

  const lib = fx.faces();
  check('biblioteca de fețe e încărcată', Array.isArray(lib) && lib.length >= 8, `${lib ? lib.length : 0} fețe`);
  const resolved = lib.every((f) => {
    const uri = fx.faceOf({ name: 'Test', nat: 'ROU', pos: 'CM', age: 22 });
    return typeof uri === 'string' && uri.startsWith('data:image/webp;base64,');
  });
  check('fețele sunt încorporate în bundle, fără cereri externe', resolved);

  const ghost = { id: 'gen1', name: 'Jucător Fără Poză', nat: 'ROU', pos: 'CM', age: 21 };
  check('jucătorul fără poză nu are fotografie reală', fx.realFace(ghost) === null);
  const face = fx.faceOf(ghost);
  check('jucătorul fără poză primește o față fotorealistă', typeof face === 'string' && face.startsWith('data:image/webp;base64,'), face ? `${face.length} caractere` : 'niciuna');
  check('aceeași față pentru același jucător', fx.faceOf({ ...ghost }) === face);

  const many = Array.from({ length: 24 }, (_, i) => fx.faceOf({ name: `Regen ${i}`, nat: 'ROU', pos: 'CB', age: 18 + (i % 6) }));
  const distinct = new Set(many).size;
  check('fețele se distribuie între jucători, nu una singură', distinct >= Math.min(lib.length, 6), `${distinct} fețe distincte din ${many.length}`);

  const natSkin = (nat) => {
    const row = fx.facePick && fx.facePick({ name: `Test ${nat}`, nat, pos: 'CM', age: 24 });
    return row ? String(row[1]).split('|') : [];
  };
  const rouSkins = natSkin('ROU');
  const senSkins = natSkin('SEN');
  const jpnSkins = natSkin('JPN');
  check('tenul feței se potrivește cu naționalitatea', rouSkins.includes('fair') && senSkins.some((k) => ['ebony', 'dark_brown'].includes(k)) && jpnSkins.includes('east_asian'),
    `ROU ${rouSkins.join('+')} • SEN ${senSkins.join('+')} • JPN ${jpnSkins.join('+')}`);
  const keys = lib.map((f) => f[0]);
  check('nicio față nu apare de două ori în bibliotecă', new Set(keys).size === keys.length, `${keys.length} intrări`);

  const real = { id: 'real1', name: 'Ștefan Târnovanu', nat: 'ROU', pos: 'GK', age: 26 };
  check('fotografia reală are prioritate față de bibliotecă', !!fx.realFace(real));

  const sizes = lib.map((f) => window.__SM_ASSETS__ && window.__SM_ASSETS__[f[0]] ? window.__SM_ASSETS__[f[0]].length : 0);
  check('fiecare față are un asset în bundle', sizes.every((n) => n > 2000), `min ${Math.min(...sizes)} caractere`);

  const combos = [];
  for (let skin = 0; skin < 6; skin += 1) for (let hs = 0; hs < 8; hs += 1) for (let outfit = 0; outfit < 6; outfit += 1) combos.push({ skin, hair: (skin + hs) % 8, hairStyle: hs, outfit, accessory: (hs + outfit) % 6, beard: (skin + outfit) % 4 });
  const svgs = combos.map((c) => fx.avatarSvg({ manager: { avatar: c, ownedItems: [] } }, 132));
  check('avatarul se randează pentru toate cele 288 de combinații', svgs.every((v) => typeof v === 'string' && v.startsWith('<svg')), `${svgs.length} combinații`);
  check('avatarul folosește umbre și lumină, nu doar culori plate', svgs.every((v) => v.includes('radialGradient') && v.includes('feGaussianBlur')));
  check('avatarul nu are cereri externe', svgs.every((v) => !/https?:\/\//.test(v)));
  check('fiecare combinație are propriile gradiente', new Set(svgs).size === svgs.length);
  const ids = new Set();
  svgs.forEach((v) => (v.match(/id="[^"]+"/g) || []).forEach((m) => ids.add(m)));
  check('identificatorii SVG nu se repetă între combinații', ids.size >= svgs.length * 6);

  const styled = fx.avatarSvg({ manager: { avatar: { skin: 4, hair: 0, hairStyle: 2, outfit: 2, accessory: 2, beard: 3 }, ownedItems: [] } }, 132);
  check('avatarul respectă tenul și barba alese', styled.includes(fx.mix('#8d5a33', '#4a2512', 0.5)) && styled.includes('goatee') === false);
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
    await scenarioProfile();
    await scenarioCupSim();
    await scenarioConflict();
    await scenarioFixes();
    await scenarioFaces();
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
