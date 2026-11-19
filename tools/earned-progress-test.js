const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('public/index.html','utf8');
const start=html.indexOf('function vA('),end=html.indexOf('const yA=',start);
assert(start>=0&&end>start);
const train=new Function('iv','sv','bA',html.slice(start,end)+';return vA')({balanced:{},shoot:{id:'shoot',attribute:'sho'}},{sho:['shooting']},{sho:['ST']});
let p={age:23,ovr:70,pos:'ST',sho:70,individualTrainingSessions:23,individualTrainingProgress:5,individualTrainingImprovements:3};
let result=train(p,'shoot',1);assert.equal(result.overallDelta,1);assert.equal(result.player.sho,71);
p=result.player;for(let i=0;i<5;i++){result=train(p,'shoot',1);assert.equal(result.overallDelta,0);assert.equal(result.player.ovr,71);p=result.player;}
const facStart=html.indexOf('function _smFacGate('),facEnd=html.indexOf('function _smFacPlan(',facStart);
const gate=new Function('_smFacRank',html.slice(facStart,facEnd)+';return _smFacGate')(()=>1);
const state={userClubId:'a',calendar:[{fixtures:Array.from({length:5},(_,i)=>({homeId:'a',awayId:'b',played:i<4}))}]};
assert.match(gate(state,3),/4\/5/);state.calendar[0].fixtures[4].played=true;assert.equal(gate(state,3),null);
assert(html.includes('minimum 3 întâlniri, 80 afecțiune și 75 încredere'));
assert(html.includes('ai evitat discuția')&&html.includes('ai ascultat și ați discutat sincer'));
assert(html.includes('data-sm-3d-possession')&&html.includes('_smOwnerRing.visible=!!Zs&&!qa'));
console.log('  ✓ antrenamentul acordă OVR doar la îmbunătățire; criterii relație și repere 3D prezente');
