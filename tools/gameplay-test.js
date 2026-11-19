/** Meciuri complete ale motorului real în DOM; nu înlocuiește verificarea graficii 3D. */
const assert = require('node:assert/strict');
const { launch } = require('./dom-harness');
(async () => {
  const app = await launch();
  try {
    assert(app.click(/Semnează Contractul/));
    assert(await app.waitFor(/Intră în Meci/, 10000));
    assert(app.click(/Intră în Meci/));
    assert(await app.waitFor(/Adrenalină pe Gazon|LIVE/, 10000));
    const source = app.window.__smEngine;
    assert(source);
    const make = () => new source.constructor({
      homeClub:source.homeClub, awayClub:source.awayClub,
      homeStarters:source.homePlayers.map(p => ({...p})), awayStarters:source.awayPlayers.map(p => ({...p})),
      homeBench:source.homeBench.map(p => ({...p})), awayBench:source.awayBench.map(p => ({...p})),
      weather:source.weather, homeFormation:source.homeFormation, awayFormation:source.awayFormation,
      homeTactics:{...source.homeTactics}, awayTactics:{...source.awayTactics}
    });
    const sub = make(), out = sub.homePlayers[1], incoming = sub.homeBench[0];
    assert(incoming, 'există rezervă');
    sub.ball.owner = out;
    assert(sub.makeSubstitution('home', out.id, incoming.id));
    assert.equal(sub.homePlayers[1].id, incoming.id);
    assert.equal(sub.ball.owner.id, incoming.id);
    assert.equal(sub.subsUsed.home, 1);
    assert(!sub.homeBench.some(p => p.id === incoming.id));
    assert(!sub.makeSubstitution('home', incoming.id, out.id));
    sub.homePlayers[2].redCard = true;
    assert(!sub.makeSubstitution('home', sub.homePlayers[2].id, sub.homeBench[0].id));
    sub.subsUsed.home = sub.maxSubs;
    assert(!sub.makeSubstitution('home', incoming.id, sub.homeBench[0].id));
    console.log('  ✓ schimbări: posesie, bancă, eliminare și limită');
    const timing = make(), starter = timing.homePlayers[1], reserve = timing.homeBench[0];
    starter.goalsMatch=1; starter.yellowCards=1; timing.half=2; timing.minute=60;
    assert(timing.makeSubstitution('home',starter.id,reserve.id));
    timing.minute=93; const report=timing._smParticipationReport('home');
    assert.equal(report.length,12);
    assert.equal(report.find(p=>p.id===starter.id).minutesPlayed,60);
    assert.equal(report.find(p=>p.id===starter.id).goals,1);
    assert.equal(report.find(p=>p.id===starter.id).yellowCards,1);
    assert.equal(report.find(p=>p.id===reserve.id).minutesPlayed,30);
    assert.equal(report.find(p=>p.id===reserve.id).started,false);
    assert.equal(report.find(p=>p.id===starter.id).started,true);
    const dismissed=timing.homePlayers[2];dismissed.redCard=true;dismissed._smSentOffAt=30;
    assert.equal(timing._smParticipationReport('home').find(p=>p.id===dismissed.id).minutesPlayed,30);
    console.log('  ✓ raportul include titularii înlocuiți, rezervele și minutele până la eliminare');

    const stats = make();
    stats._countShotOnTarget('home', {side:'home',source:'CORNER'});
    assert.equal(stats.stats.homeShots, 1); assert.equal(stats.stats.homeOnTarget, 1);
    stats.stats.homeShots += 1;
    stats._countShotOnTarget('home', {side:'home',source:'CORNER',countedShot:true});
    assert.equal(stats.stats.homeShots, 2); assert.equal(stats.stats.homeOnTarget, 2);
    stats._countShotOnTarget('away', null);
    assert.equal(stats.stats.awayShots, 1); assert.equal(stats.stats.awayOnTarget, 1);
    console.log('  ✓ șuturile pe poartă includ fazele necontorizate, fără dublarea unui șut din corner');
    const goals = make(); goals.minute=27; goals.phase="LIVE";
    for(let i=0;i<20;i++) goals._recordReplayFrame(.05,.1);
    goals._pendingPlayContext={side:'away',source:'CORNER',shooter:goals.awayPlayers[10]};
    goals._registerGoal('away');
    assert.equal(goals.getSnapshot().goalLedger[0].source,'CORNER');
    assert.equal(goals.getSnapshot().goalLedger[0].side,'away');
    assert.equal(goals._replay.context.source,'CORNER');assert.equal(goals._replay.context.minute,27);
    goals._tickReplay(1);assert.equal(goals.getSnapshot().replay.context.source,'CORNER');
    goals._pendingPlayContext=null;goals._registerGoal('home');
    assert.equal(goals.goalLedger[1].source,null);assert.equal(goals._replay.context.source,null);
    goals._pendingPlayContext={side:'away',source:'PENALTY'};goals._registerGoal('home');assert.equal(goals._replay.context.source,null);
    console.log('  ✓ registrul golurilor păstrează sursa reală sau necunoscută');

    for (let i=0;i<(process.argv.includes('--stress')?4:1);i++) {
      const match = make();
      let halftime = false, ticks = 0;
      while (match.phase !== 'FULLTIME' && ticks++ < 6000) {
        if (match.phase === 'HALFTIME') { halftime = true; match.startSecondHalf(); }
        match.step(.05, 8);
        if (ticks % 40 === 0) {
          for (const p of [...match.homePlayers,...match.awayPlayers]) {
            assert(Number.isFinite(p.x) && Number.isFinite(p.y), 'coordonate jucător finite');
          }
          for (const k of ['x','y','z','vx','vy']) assert(Number.isFinite(match.ball[k]), `minge ${k} finită`);
          assert(match.subsUsed.home <= match.maxSubs && match.subsUsed.away <= match.maxSubs);
        }
      }
      assert(halftime && match.phase === 'FULLTIME', `meciul ${i+1} se încheie în ${ticks} pași`);
      assert.equal(match.half,2);
      const goals = match.events.filter(e => e.type === 'goal');
      assert.equal(goals.filter(e => e.side === 'home').length, match.score.home);
      assert.equal(goals.filter(e => e.side === 'away').length, match.score.away);
      const snap = match.getSnapshot();
      assert.equal(snap.possession.home + snap.possession.away, 100);
      assert(snap.stats.homeOnTarget <= snap.stats.homeShots && snap.stats.awayOnTarget <= snap.stats.awayShots);
      console.log(`  ✓ meci ${i+1}: pauză, final, scor ${match.score.home}-${match.score.away}, fizică și statistici`);
    }
    assert.deepEqual(app.errors, []);
  } finally { app.close(); }
})().then(() => process.exit(0), e => { console.error(e); process.exit(1); });
