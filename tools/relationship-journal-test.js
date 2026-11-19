const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('public/index.html','utf8');
const start=html.indexOf('function _smRelationshipLog('),end=html.indexOf('function Yy(',start);
const {log,resolve}=new Function(html.slice(start,end)+';return {log:_smRelationshipLog,resolve:Xy}')();
const relationship={initiated:true,affection:60,trust:70,lastDateRound:1,datePromiseDeadlineRound:4,pendingDateMessageId:null};
const replied={id:'old',roundGenerated:3,replyDeadlineRound:4,replied:true};
assert.equal(resolve(relationship,replied,4).breakup,false);
const failed=resolve(relationship,replied,5);assert.equal(failed.breakup,true);assert.equal(failed.relationship.trust,52);assert.equal(failed.relationship.affection,48);assert.equal(failed.relationship.relationshipJournal.length,1);
assert.equal(resolve(failed.relationship,replied,6).breakup,false);assert.equal(resolve({...relationship,datePromiseDeadlineRound:null},replied,5).breakup,false);
assert.equal(resolve({...relationship,datePromiseDeadlineRound:null,pendingDateMessageId:'old'}, {...replied,replied:false},5).breakup,true);
assert.equal(resolve({...relationship,datePromiseDeadlineRound:null,pendingDateMessageId:'old',lastDateRound:4}, {...replied,replied:false},5).breakup,false);
assert.equal(log({relationshipJournal:Array.from({length:20},(_,i)=>({i}))},{i:20}).length,20);
assert(html.includes('data-sm-relationship-journal')&&html.includes('relationshipJournal:_smRelationshipLog(At'));
console.log('  ✓ jurnalul păstrează momentele, iar promisiunile expiră o singură dată după termen');
const {launch}=require('./dom-harness');
const KEY='sm2627_career_slot_1';
(async()=>{
 let app=await launch();
 try{
  assert(app.click(/Semnează Contractul/));await app.sleep(800);
  const base=JSON.parse(app.window.localStorage.getItem(KEY));assert(base);
  base.relationships.andreea={...base.relationships.andreea,initiated:true,affection:60,trust:70,datesCount:2,sceneIdx:2,lastDateRound:1,datePromiseDeadlineRound:2,datePromiseKind:'promise',pendingDateMessageId:null};
  app.close();app=await launch({seed:{[KEY]:JSON.stringify(base)}});await app.sleep(500);
  assert(app.click(/Viață &/));await app.sleep(250);
  const journal=app.document.querySelector('[data-sm-relationship-journal]');assert(journal&&journal.textContent.includes('etapei 2'));
  assert(app.click(/Invită la Întâlnire pe/));await app.sleep(250);
  for(let i=0;i<12;i++){if(!app.click(/Continuă dialogul|Afișează tot/))break;await app.sleep(80)}
  assert(app.click(/Întreab-o ce are nevoie/));await app.sleep(600);
  const saved=JSON.parse(app.window.localStorage.getItem(KEY)),rel=saved.relationships.andreea;
  assert.equal(rel.datePromiseDeadlineRound,null);assert.equal(rel.relationshipJournal.at(-1).kind,'fulfilled');assert.match(rel.relationshipJournal.at(-1).text,/Promisiune respectată/);
  app.close();
  const expired={...base,currentRound:3,phoneMessages:[...(base.phoneMessages||[]),{id:'new-message',roundGenerated:3,replied:false,senderName:'Test',senderRole:'Presă'}]};
  app=await launch({seed:{[KEY]:JSON.stringify(expired)}});await app.sleep(1000);
  let broken=JSON.parse(app.window.localStorage.getItem(KEY)).relationships.andreea;
  assert.equal(broken.initiated,false);assert.equal(broken.trust,52);assert.equal(broken.relationshipJournal.at(-1).kind,'broken');
  app.close();app=await launch({seed:{[KEY]:app.window.localStorage.getItem(KEY)}});await app.sleep(700);
  broken=JSON.parse(app.window.localStorage.getItem(KEY)).relationships.andreea;assert.equal(broken.trust,52);assert.equal(broken.relationshipJournal.filter(e=>e.kind==='broken').length,1);
  assert.deepEqual(app.errors,[]);console.log('  ✓ întâlnirea respectă promisiunea; termenul expirat și reîncărcarea sunt procesate corect');
 }finally{app.close()}
})().then(()=>process.exit(0),e=>{console.error(e);process.exit(1)});
