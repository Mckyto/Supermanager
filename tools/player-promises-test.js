const resolveSupercup=require('./resolve-supercup-fixture');
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('public/index.html','utf8'),start=html.indexOf('function _smPlayerPromiseResult('),end=html.indexOf('function _smRotationOptions(',start);
const resolve=new Function(html.slice(start,end)+';return _smPlayerPromiseResult')();
const c={round:5,exists:true,available:true,started:false,minutes:20};
assert.equal(resolve({kind:'minutes',dueRound:5},c).status,'fulfilled');
assert.equal(resolve({kind:'start',dueRound:5},c).status,'broken');
assert.equal(resolve({kind:'start',dueRound:6},c).status,'pending');
assert.equal(resolve({promiseText:'Titularizare promisă',dueRound:5},{...c,started:true}).status,'fulfilled');
assert.equal(resolve({kind:'minutes',dueRound:5},{...c,available:false}).status,'postponed');
assert.equal(resolve({kind:'minutes',dueRound:5},{...c,exists:false}).status,'cancelled');
assert.equal(resolve({kind:'minutes',dueRound:5},{...c,minutes:0}).status,'broken');
console.log('  ✓ promisiunile disting minutele de titularizare și amână indisponibilitatea');
const {launch}=require('./dom-harness');const KEY='sm2627_career_slot_1';
(async()=>{let app=await launch();try{
 assert(app.click(/Semnează Contractul/));await resolveSupercup(app);await app.sleep(800);const base=JSON.parse(app.window.localStorage.getItem(KEY));base.manager.clubSharesPct=100;
 const club=base.clubs.find(c=>c.id===base.userClubId),starter=base.lineupIds.starters.find(id=>club.players.find(p=>p.id===id)),bench=base.lineupIds.bench.find(id=>club.players.find(p=>p.id===id&&p.injuredWeeks===0&&p.suspendedMatches===0));
 assert(starter&&bench);const sp=club.players.find(p=>p.id===starter),bp=club.players.find(p=>p.id===bench);
 base.playerPromises=[{id:'test-start',playerId:starter,playerName:sp.name,promiseText:'Titularizare',kind:'start',dueRound:base.currentRound},{id:'test-bench',playerId:bench,playerName:bp.name,promiseText:'Minute',kind:'minutes',dueRound:base.currentRound}];
 app.close();app=await launch({seed:{[KEY]:JSON.stringify(base)}});await app.sleep(500);const input=app.document.querySelector('input[aria-label="Etapa până la care simulezi"]');assert(input);
 Object.getOwnPropertyDescriptor(app.window.HTMLInputElement.prototype,'value').set.call(input,String(base.currentRound));input.dispatchEvent(new app.window.Event('input',{bubbles:true}));await app.sleep(150);assert(app.click(label=>label==='▶'));
 for(let i=0;i<100;i++){await app.sleep(100);const current=JSON.parse(app.window.localStorage.getItem(KEY));if(current.currentRound>base.currentRound)break}
 await app.sleep(600);const saved=JSON.parse(app.window.localStorage.getItem(KEY));assert(saved.currentRound>base.currentRound);
 assert(!saved.playerPromises.some(p=>['test-start','test-bench'].includes(p.id)));
 assert(saved.newsFeed.some(n=>n.id==='prom-kept-test-start-'+base.currentRound));assert(saved.newsFeed.some(n=>n.id==='prom-broken-test-bench'));
 assert.deepEqual(app.errors,[]);console.log('  ✓ simularea rapidă consemnează distinct promisiunea respectată și încălcată');
 }finally{app.close()}})().then(()=>process.exit(0),e=>{console.error(e);process.exit(1)});
