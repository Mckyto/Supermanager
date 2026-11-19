const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('public/index.html','utf8'),start=html.indexOf('function _smMedicalOdds('),end=html.indexOf('function pv(',start);assert(start>=0&&end>start);
const random=Object.create(Math);let roll=0;random.random=()=>roll;
const {odds,treat}=new Function('Math','el',html.slice(start,end)+';return {odds:_smMedicalOdds,treat:ZA}')(random,(x,min,max)=>Math.max(min,Math.min(max,x)));
const player={name:'Test',fitness:70,injuredWeeks:2};
for(let level=1;level<=4;level++){
 const o=odds(level);assert(Math.abs(o.positive+o.mixed+o.relapse-1)<1e-12);
 roll=o.positive/2;assert.equal(treat(player,'infiltration',level).tone,'positive');
 roll=o.positive+o.mixed/2;assert.equal(treat(player,'infiltration',level).tone,'mixed');
 roll=1-o.relapse/2;assert.equal(treat(player,'infiltration',level).injuredWeeks,4);
 roll=o.clinicTwo/2;assert.equal(treat({...player,injuredWeeks:3},'private_clinic',level).injuredWeeks,1);
 roll=(1+o.clinicTwo)/2;assert.equal(treat({...player,injuredWeeks:3},'private_clinic',level).injuredWeeks,2);
}
assert.equal(treat({...player,injuredWeeks:0},'protect_rest').injuredWeeks,0);
assert.equal(treat(player,'protect_rest').injuredWeeks,2);
console.log('  ✓ probabilitățile și efectele corespund clinicii; protecția nu inventează accidentări');
const {launch}=require('./dom-harness'),KEY='sm2627_career_slot_1';
(async()=>{let app=await launch();try{
 assert(app.click(/Semnează Contractul/));await app.sleep(800);const career=JSON.parse(app.window.localStorage.getItem(KEY));const club=career.clubs.find(c=>c.id===career.userClubId),injured=club.players[0],tired=club.players[1];Object.assign(injured,{name:'Accidentat Test',injuredWeeks:2,suspendedMatches:1,fitness:70});Object.assign(tired,{name:'Obosit Test',injuredWeeks:0,suspendedMatches:0,fitness:65});career.facilities={...career.facilities,cryoClinic:1};
 app.close();app=await launch({seed:{[KEY]:JSON.stringify(career)}});await app.sleep(500);assert(app.click(/Academie & Club/));await app.sleep(150);assert(app.click(/Sponsori, Nume Arenă & Infirmerie/));await app.sleep(200);
 const note=app.document.querySelector('[data-sm-medical-explanation]');assert(note);assert.match(note.textContent,/50% rezultat bun, 28% revenire.*22% accidentare/);assert.match(note.textContent,/55% șanse/);assert.match(note.textContent,/nu scoate automat/);
 const cards=[...app.document.querySelectorAll('div')].filter(el=>el.textContent.includes('Obosit Test')&&el.querySelector('button')&&el.className.includes('space-y-2.5'));const card=cards.find(el=>el.querySelector('button')?.textContent.includes('Protecție'));assert(card);assert.match(app.text(),/Accidentat Test/);assert.match(app.text(),/Suspendare 1 meci/);card.querySelector('button').click();await app.sleep(600);
 const saved=JSON.parse(app.window.localStorage.getItem(KEY));const p=saved.clubs.find(c=>c.id===saved.userClubId).players.find(x=>x.id===tired.id);assert.equal(p.injuredWeeks,0);assert.equal(p.fitness,75);assert.deepEqual(app.errors,[]);
 console.log('  ✓ explicațiile și suspendarea apar în infirmerie; recuperarea blândă persistă fără accidentare nouă');
 }finally{app.close()}})().then(()=>process.exit(0),e=>{console.error(e);process.exit(1)});
