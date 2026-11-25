const resolveSupercup=require('./resolve-supercup-fixture');
const assert=require('node:assert/strict'),fs=require('node:fs'),{launch}=require('./dom-harness');
const html=fs.readFileSync('public/index.html','utf8');function extract(a,b){const i=html.indexOf(a),j=html.indexOf(b,i);assert(i>=0&&j>i);return html.slice(i,j)}
const api=new Function(extract('function _smOpponentStyle(','function _SmLiveInstruction(')+';return {base:_smOpponentStyle,prepare:_smPreparedOpponent}')();
const club={id:'opponent',name:'Adversar'},neutral=api.base(club),tactic={defLine:'high',pressing:'high',width:'wide',mentality:'ultra_attacking'},original=JSON.stringify(tactic),prepared=api.prepare(club,tactic);
assert.equal(JSON.stringify(tactic),original);assert.equal(prepared.tactics.passing,'direct');assert.equal(prepared.tactics.width,'wide');assert.equal(prepared.tactics.mentality,'defensive');assert.equal(prepared.tactics.defLine,'deep');assert.equal(prepared.preparation.length,3);assert.deepEqual(api.prepare(club,{}).tactics,neutral.tactics);assert.notEqual(prepared.tactics,neutral.tactics);
const quick=new Function('_smQuickTeam','_smOpponentStyle','_smPreparedOpponent',extract('function _smQuickContext(','function _smQuickRates(')+';return _smQuickContext')((club,formation,starters,tactics)=>({id:club.id,tactics}),api.base,api.prepare);
const user={id:'user'},career={userClubId:'user',tactics:tactic};for(const [home,away,side] of [[user,club,'away'],[club,user,'home']])assert.deepEqual(quick(career,home,away)[side].tactics,prepared.tactics);
assert.deepEqual(quick({userClubId:'other',tactics:tactic},club,user).home.tactics,neutral.tactics);
console.log('  ✓ pregătirea e deterministă, nu modifică tactica managerului și se aplică în rapid acasă/deplasare');
const KEY='sm2627_career_slot_1';
(async()=>{let app=await launch();try{
 assert(app.click(/Semnează Contractul/));await resolveSupercup(app);await app.sleep(800);const career=JSON.parse(app.window.localStorage.getItem(KEY));career.tactics={...career.tactics,...tactic};
 app.close();app=await launch({seed:{[KEY]:JSON.stringify(career)}});await app.sleep(500);const panel=app.document.querySelector('[data-sm-opponent-profile]');assert(panel);assert.match(panel.textContent,/pase directe/);assert.match(panel.textContent,/linie retrasă/);assert.match(panel.textContent,/poate reacționa limitat la unele schimbări/);
 assert(app.click(/Intră în Meci/));assert(await app.waitFor(/Adrenalină pe Gazon|LIVE/,10000));const engine=app.window.__smEngine,enemy=engine.userSide==='home'?engine.awayTactics:engine.homeTactics;assert.equal(enemy.passing,'direct');assert.equal(enemy.width,'wide');assert.equal(enemy.mentality,'defensive');assert.equal(enemy.defLine,'deep');assert.deepEqual(app.errors,[]);
 console.log('  ✓ pregătirea anunțată premeci este folosită de motorul live');
 }finally{app.close()}})().then(()=>process.exit(0),e=>{console.error(e);process.exit(1)});
