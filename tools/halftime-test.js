/** Test UI în deplasare, cu Radio Live și situații limită pe tabla de pauză. */
const assert = require('node:assert/strict');
const { launch } = require('./dom-harness');
const KEY = 'sm2627_career_slot_1';
(async () => {
  let app = await launch();
  try {
    assert(app.click(/Semnează Contractul/));
    assert(await app.waitFor(/Intră în Meci/, 10000));
    await app.sleep(800);
    const career=JSON.parse(app.window.localStorage.getItem(KEY));
    const fixture=career.calendar.find(r=>r.roundNumber===career.currentRound).fixtures.find(f=>f.homeId===career.userClubId||f.awayId===career.userClubId);
    if(fixture.homeId===career.userClubId) [fixture.homeId,fixture.awayId]=[fixture.awayId,fixture.homeId];
    app.close(); app=await launch({seed:{[KEY]:JSON.stringify(career)}});
    assert(await app.waitFor(/Intră în Meci/,10000));
    assert(app.click(/Intră în Meci/));
    assert(await app.waitFor(/Adrenalină pe Gazon|LIVE/,10000));
    const engine=app.window.__smEngine; assert.equal(engine.userSide,'away');
    assert(app.click(/Radio Live/));
    const team=engine.awayPlayers;
    const red=team.find(p=>p.pos!=='GK'); red.redCard=true;
    engine.subsUsed.away=engine.maxSubs;
    engine.minute=45.5; engine.addedTimeFirst=0; engine.phase='LIVE';
    assert(await app.waitFor(/Vestiar la Pauză/,10000));
    const board=app.document.querySelector('[data-sm-halftime-board]'); assert(board);
    assert.equal(app.document.querySelector('[data-sm-radio]')!==null,true);
    const lb=team.find(p=>p.slotRole==='LB'),rb=team.find(p=>p.slotRole==='RB');
    assert(lb&&rb);
    const get=p=>board.querySelector(`[data-sm-halftime-player="${p.id}"]`);
    assert(parseFloat(get(lb).style.left)<50 && parseFloat(get(rb).style.left)>50,'flancurile în deplasare');
    assert(get(red).disabled,'eliminatul nu poate fi selectat');
    const valid=team.find(p=>!p.redCard&&p.pos!=='GK'); get(valid).click(); await app.sleep(100);
    assert([...board.querySelectorAll('[data-sm-halftime-bench]')].every(b=>b.disabled),'nu poate depăși limita de schimbări');
    assert(app.click(/Începe Repriza a Doua/)); await app.sleep(300);
    assert.equal(engine.half,2); assert(!app.document.querySelector('[data-sm-halftime-board]'));
    assert.deepEqual(app.errors,[]);
    console.log('  ✓ pauză în deplasare: Radio, flancuri, eliminare, limita schimbărilor și repriza a doua');
  } finally { app.close(); }
})().then(()=>process.exit(0),e=>{console.error(e);process.exit(1)});
