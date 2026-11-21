const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('public/index.html','utf8'),start=html.indexOf('function _smNotificationItems('),end=html.indexOf('function _SmNotificationCenter(',start);
const items=new Function('_smPhoneStale','_smFacName','Xs','_smPersonalCalendarState','_smTrialView',html.slice(start,end)+';return _smNotificationItems')((m,r)=>!m.replied&&!m.expired&&!m.scolding&&m.roundGenerated<r,id=>id,[{id:'s',name:'Sofia'}],()=>null,c=>c.testTrial||null);
const state={currentRound:5,phoneMessages:[{id:'now',roundGenerated:5,senderName:'Patron'},{id:'old',roundGenerated:4},{id:'replied',roundGenerated:5,replied:true},{id:'future',roundGenerated:6}],playerPromises:[{id:'p',playerName:'Alex',dueRound:6}],relationships:{s:{initiated:true,datePromiseDeadlineRound:5},end:{initiated:false,datePromiseDeadlineRound:5}},facilityWorks:{turf:{readyRound:12}}};
const snapshot=JSON.stringify(state),result=items(state);assert.equal(JSON.stringify(state),snapshot);assert.deepEqual(result.map(x=>x.id),['date-s','phone-now','player-p','facility-turf']);assert.equal(result[0].group,'urgent');assert.equal(result[2].group,'soon');assert.equal(result[3].group,'info');assert.match(result.find(x=>x.id==='phone-now').description,/expiră/);assert.equal(items({}).length,0);
for(const status of ['pending','ready','unavailable']){const res=items({...state,freeAgentTrial:{},testTrial:{trial:{startRound:5,playerName:'Test'},status}}).find(x=>x.id==='free-agent-trial');assert.equal(res.group,'info');assert.equal(res.action,'transfers');assert.match(res.description,status==='pending'?/avansarea unei etape/:status==='ready'?/disponibil pentru colectare/:/nu mai este disponibil/)}assert(!items({...state,freeAgentTrial:{}}).some(x=>x.id==='free-agent-trial'));
console.log('  ✓ centrul grupează doar elementele active și nu schimbă datele carierei');
const {launch}=require('./dom-harness');const KEY='sm2627_career_slot_1';
(async()=>{let app=await launch();try{
 assert(app.click(/Semnează Contractul/));await app.sleep(800);const data=JSON.parse(app.window.localStorage.getItem(KEY));const round=data.currentRound;
 data.phoneMessages=[{id:'notice-test',roundGenerated:round,replied:false,senderRole:'Patronat',senderName:'Test Patron',text:'Mesaj de test',replies:[]}];
 data.playerPromises=[{id:'notice-player',playerId:data.lineupIds.starters[0],playerName:'Jucător Test',promiseText:'Titularizare',dueRound:round+1}];
 data.relationships.sofia={...data.relationships.sofia,initiated:true,affection:45,trust:50,datePromiseDeadlineRound:round+1,pendingDateMessageId:null};
 data.facilityWorks={hybridTurf:{to:2,startedRound:round,readyRound:round+4,cost:1000}};
 async function load(){app.close();app=await launch({seed:{[KEY]:JSON.stringify(data)}});await app.sleep(500);const panel=app.document.querySelector('[data-sm-notification-center]');assert(panel);panel.querySelector('summary').click();return panel}
 let panel=await load();assert.match(panel.textContent,/Necesită atenție acum/);assert.match(panel.textContent,/Etapa următoare/);assert.match(panel.textContent,/Informativ/);
 panel.querySelector('[aria-label^="Deschide telefonul:"]').click();await app.sleep(200);assert(app.document.querySelector('[data-sm-phone-id="notice-test"]'));
 panel=await load();panel.querySelector('[aria-label^="Deschide relația:"]').click();await app.sleep(300);assert.match(app.document.querySelector('[data-sm-relationship-journal]').textContent,/Sofia Munteanu/);
 panel=await load();panel.querySelector('[aria-label^="Deschide promisiunile:"]').click();await app.sleep(300);assert.match(app.text(),/Negocierea Obiectivului cu Patronul/);assert.match(app.text(),/Jucător Test/);
 panel=await load();panel.querySelector('[aria-label^="Deschide stadionul:"]').click();await app.sleep(300);assert.match(app.text(),/Gazon Hibrid/i);
 assert(app.click(/^Centru Comandă/));await app.sleep(200);assert(app.click(/Academie & Club/));await app.sleep(200);assert.match(app.text(),/Rețea Națională & Internațională de Scouting/);
 assert.deepEqual(app.errors,[]);console.log('  ✓ notificările deschid telefonul, partenera și secțiunile clubului potrivite');
 }finally{app.close()}})().then(()=>process.exit(0),e=>{console.error(e);process.exit(1)});
