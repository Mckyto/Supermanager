const resolveSupercup=require('./resolve-supercup-fixture');
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
    assert(app.click(/Semnează Contractul/));await resolveSupercup(app);
    await waitUntil(app, () => !!read(app), 'salvare inițială');
    const initial = read(app);
    initial.manager.isRomaniaSelector=true;initial.manager.ntFixtures=[{id:"nt-1",homeId:"romania_nt",awayId:"nt_suedia",played:true,homeGoals:2,awayGoals:1},{id:"nt-2",homeId:"nt_elvetia",awayId:"romania_nt",played:false}];
    initial.manager.clubSharesPct = 100; // pragul de demitere de 8, fără a dezactiva mecanica
    initial.difficulty = "normal";
    initial.calendarDomesticCup = false; // Acest test acoperă simularea campionatului fără opriri de cupă.
    const otherClub=initial.clubs.find(c=>c.id!==initial.userClubId);initial.loanedOutPlayers=[{id:'test-loan-return',name:'Împrumut Altfel',age:20,isU21:true,ovr:70,contractYears:0,loanOriginalContractYears:3,onLoan:true,originClubId:otherClub.id,loanFromClubId:otherClub.id},{id:'test-loan-expire',name:'Contract Expirat',age:25,ovr:75,contractYears:0,loanOriginalContractYears:1,onLoan:true,originClubId:initial.userClubId,loanFromClubId:initial.userClubId}];
    initial.clubs.forEach(c => c.players.forEach(p => { p.ovr = c.id === initial.userClubId ? 99 : 30; }));
    const growthPlayer=initial.clubs.find(c=>c.id===initial.userClubId).players.find(p=>p.id===initial.lineupIds.starters[1]);Object.assign(growthPlayer,{age:19,isU21:true,ovr:70,contractYears:4,potential:95});
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
    assert(career.calendar.every(r => r.fixtures.every(f => /^\d{4}-\d{2}-\d{2}$/.test(f.scheduledDate))), "date persistente pentru tur, retur și play-off/play-out");
    assert.equal(career.careerStats.matches, 40);
    const finalPlayers=career.clubs.find(c=>c.id===career.userClubId).players.map(p=>({id:p.id,name:p.name,ovr:p.ovr}));
    const growthFinal=finalPlayers.find(p=>p.id===growthPlayer.id);assert(growthFinal.ovr<=74);
    assert.match(app.text(), /Final de Sezon/);
    console.log('  ✓ sezonul include faza finală și toate rezultatele');
    // Scenariu separat: clubul utilizatorului nu participă; trofeul se simulează o singură dată.
    const aiCase=JSON.parse(JSON.stringify(career)),aiTeams=aiCase.clubs.filter(c=>c.league==='RO'&&c.id!==aiCase.userClubId).slice(0,2);
    aiCase.playoffBonusPoints[aiTeams[0].id]={startPts:1000,roundedUp:false,group:'playoff'};
    aiCase.nationalCup.winnerId=aiTeams[1].id;
    let aiApp=await launch({seed:{[KEY]:JSON.stringify(aiCase)}});
    try{await waitUntil(aiApp,()=>/Final de Sezon/.test(aiApp.text()),'final pentru Supercupa AI');
      assert(aiApp.click(/Începe Sezonul Următor/));await waitUntil(aiApp,()=>read(aiApp)?.season!==aiCase.season,'Supercupa AI');await aiApp.sleep(300);
      const nextAI=read(aiApp),sc=nextAI.supercupa;assert.deepEqual([sc.homeId,sc.awayId],aiTeams.map(c=>c.id));assert(sc.played&&sc.winnerId);assert(sc.scheduledDate);assert(![sc.homeId,sc.awayId].includes(nextAI.userClubId));
      assert(nextAI.clubs.find(c=>c.id===sc.homeId).players.some(p=>p.competitionStats?.[nextAI.season]?.Supercupa));assert.deepEqual(aiApp.errors,[]);
    }finally{aiApp.close()}
    console.log('  ✓ Supercupa fără clubul utilizatorului se simulează și salvează statisticile AI');
    const aiStar=career.clubs.find(c=>c.id!==career.userClubId).players[0];Object.assign(aiStar,{age:31,ovr:85,contractYears:1});
    app.close();app=await launch({seed:{[KEY]:JSON.stringify(career)}});await waitUntil(app,()=>/Final de Sezon/.test(app.text()),'final pentru expirări');app.window.Math.random=()=>.8;
    assert(app.click(/Începe Sezonul Următor/));
    await waitUntil(app, () => read(app)?.season !== initial.season, 'sezon nou');
    await app.sleep(500);
    career = read(app);
    assert.equal(career.currentRound, 1);
    assert.equal(career.manager.ntFixtures.length,4);assert(career.manager.ntFixtures.every(f=>!f.played));assert.equal(career.ntSeasonHistory.length,1);assert.equal(career.ntSeasonHistory[0].season,initial.season);assert.equal(career.ntSeasonHistory[0].matches.length,1);assert.equal(career.ntSeasonHistory[0].matches[0].homeGoals,2);assert.equal(career.ntSeasonHistory[0].matches[0].played,true);
    const growthNext=career.clubs.find(c=>c.id===career.userClubId).players.find(p=>p.id===growthPlayer.id);assert(growthNext);assert(growthNext.ovr<=74,'tranziția nu depășește limita sezonului precedent');
    const renewed=career.clubs.flatMap(c=>c.players).find(p=>p.id===aiStar.id);assert(renewed);assert(renewed.contractYears>=2);assert(!career.marketPool.some(p=>p.id===aiStar.id),'starul AI rămâne sub contract');
    assert.equal(career.calendar.length, 30);
    assert(!career.playoffSplitDone);
    const other=career.clubs.find(c=>c.id===otherClub.id),returned=other.players.find(p=>p.id==='test-loan-return');assert(returned);assert.equal(returned.contractYears,2);assert.equal(returned.onLoan,false);assert(!career.clubs.find(c=>c.id===career.userClubId).players.some(p=>p.id==='test-loan-return'));assert(!career.lineupIds.bench.includes('test-loan-return'));assert(career.marketPool.some(p=>p.id==='test-loan-expire'&&p.freeAgent));assert.equal(career.loanedOutPlayers.length,0);
    assert.equal(career.seasonArchive.length,1);
    const archive=career.seasonArchive[0];assert(archive.matchHistory.every(m=>m.scheduledDate), "datele programate sunt arhivate");assert.equal(archive.season,initial.season);assert.equal(archive.clubId,initial.userClubId);assert.equal(archive.standings.length,16);assert.deepEqual(archive.squad.map(p=>({id:p.id,name:p.name,ovr:p.ovr})),finalPlayers);

    const saved = app.window.localStorage.getItem(KEY);
    app.close();
    app = await launch({ seed: { [KEY]: saved } });
    await waitUntil(app, () => /Centru Comandă/.test(app.text()), 'reîncărcare sezon nou');
    assert.equal(read(app).season, career.season);
    assert.equal(read(app).currentRound, 1);
    const archivePanel=app.document.querySelector('[data-sm-season-archive]');assert(archivePanel);archivePanel.querySelector('summary').click();assert.match(archivePanel.textContent,/Clasament final/);assert.match(archivePanel.textContent,/Lot la finalul sezonului/);assert.match(archivePanel.textContent,/2026\/2027/);assert.equal(read(app).seasonArchive.length,1);

    console.log('  ✓ tranziția și reîncărcarea carierei funcționează');
    const comparisonState=read(app);comparisonState.seasonArchive.unshift({...comparisonState.seasonArchive[0],season:'2025/2026'});
    app.close();app=await launch({seed:{[KEY]:JSON.stringify(comparisonState)}});await waitUntil(app,()=>/Centru Comandă/.test(app.text()),'comparație arhivă');
    const records=app.document.querySelector('[data-sm-season-records]');assert(records);assert.match(records.textContent,/Recorduri ale clubului/);assert.match(records.textContent,/exclusiv rezultatele antrenorului/);
    const comparison=app.document.querySelector('[data-sm-season-comparison]');assert(comparison);assert.match(comparison.textContent,/2025\/2026/);assert.match(comparison.textContent,/2026\/2027/);assert.match(comparison.textContent,/puncte finale/);
    console.log('  ✓ comparația afișează două sezoane din aceeași ligă și club');
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
