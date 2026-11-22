const resolveSupercup=require('./resolve-supercup-fixture');
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('public/index.html','utf8'),start=html.indexOf('function _smOvrGrowth('),end=html.indexOf('function _smResetSeasonPlayer(',start);
const {record,apply,quick}=new Function(html.slice(start,end)+';return {record:_smRecordPlayerCompetition,apply:_smApplyPlayerReports,quick:_smQuickPlayerReport}')();
let p={id:'a',ovr:70,age:24};
const report={id:'a',minutesPlayed:90,goals:1,assists:2,matchRating:8,source:'live'};
for(let i=0;i<5;i++)p=record(p,2026,'Campionat',report,true);
assert.equal(p.ovr,71);assert.deepEqual(p.competitionStats[2026].Campionat,{apps:5,minutes:450,goals:5,assists:10,cleanSheets:5,rated:5,ratingSum:40,live:5,simulated:0});
p=record(p,2026,'Cupă',{...report,minutesPlayed:30,matchRating:6},true);assert.equal(p.competitionStats[2026]['Cupă'].cleanSheets,0);assert.equal(p.competitionStats[2026].Campionat.apps,5);
assert.equal(record(p,2026,'Cupă',{minutesPlayed:0}),p);
let state=apply({clubs:[{players:[p]}],marketPool:[],u21Squad:[]},2027,'Campionat',[report],false);assert.equal(state.clubs[0].players[0].competitionStats[2027].Campionat.apps,1);assert.equal(p.competitionStats[2027],undefined);
let declining={id:'d',age:29,ovr:70};for(let i=0;i<5;i++)declining=record(declining,2026,'Cupă',{minutesPlayed:90,matchRating:5},false);assert.equal(declining.ovr,69);
let capped={id:'c',age:29,ovr:72,ovrGrowth:{season:2026,limit:2,gained:2}};for(let i=0;i<5;i++)capped=record(capped,2026,'Cupă',{minutesPlayed:90,matchRating:9},false);assert.equal(capped.ovr,72);
let unrated={id:'u',age:25,ovr:70};for(let i=0;i<5;i++)unrated=record(unrated,2026,'Cupă',{minutesPlayed:90},false);assert.equal(unrated.ovr,70);assert.equal(unrated.competitionStats[2026]['Cupă'].rated,0);
for(let year=2000;year<2015;year++)unrated=record(unrated,year,'Cupă',{minutesPlayed:1},false);assert(unrated.competitionStats[2000]);
let r=quick([{id:'a',pos:'ST'},{id:'b',pos:'CM'}],[{type:'GOAL',teamId:'x',scorerId:'a',assistId:'b'}],'x',1,0);assert.equal(r[0].goals,1);assert.equal(r[1].assists,1);
const youthStart=html.indexOf('function $A('),youthEnd=html.indexOf('function VA(',youthStart);assert(youthStart>=0&&youthEnd>youthStart);const simulateYouth=new Function('zA','jA','dv','vh','GA','_smOvrGrowth','_smRecordPlayerCompetition',html.slice(youthStart,youthEnd)+';return $A')(()=>()=>0.5,()=>({homeGoals:3,awayGoals:0}),()=>70,(v,min,max)=>Math.max(min,Math.min(max,v)),x=>x,(x)=>({player:x,delta:0}),record);
const youth=[{id:'g',pos:'GK',ovr:70},{id:'d1',pos:'CB',ovr:70},{id:'d2',pos:'CB',ovr:70}];const yr=simulateYouth({calendar:[{roundNumber:1,fixtures:[{id:'y',homeId:'a',awayId:'b'}]}],roundNumber:1,userClubId:'a',userSquad:youth,clubs:[{id:'a'},{id:'b'}],season:2026});assert.equal(yr.userSquad.reduce((n,p)=>n+(p.competitionStats?.[2026]?.['Campionat U21']?.goals||0),0),3);assert.equal(yr.userSquad[0].competitionStats[2026]['Campionat U21'].cleanSheets,1);
console.log('  ✓ statistici pe competiții, minute, note, OVR și rapoarte simulate');

const {launch}=require('./dom-harness'),KEY='sm2627_career_slot_1',read=app=>JSON.parse(app.window.localStorage.getItem(KEY));
(async()=>{let app=await launch();try{
 assert(app.click(/Semnează Contractul/));await resolveSupercup(app);await app.sleep(600);let seed=read(app);seed.calendarDomesticCup=false;seed.boardConfidence=100;seed.manager.clubSharesPct=100;const user=seed.clubs.find(c=>c.id===seed.userClubId);for(const c of seed.clubs)for(const p of c.players)p.ovr=c.id===seed.userClubId?90:30;app.close();app=await launch({seed:{[KEY]:JSON.stringify(seed)}});await app.sleep(500);app.window.Math.random=()=>.3;assert(app.click(x=>x==='Tur'));
 let state;for(let i=0;i<300;i++){await app.sleep(100);state=read(app);if(state.currentRound>=16&&!app.labels().includes('Stop'))break}assert.equal(state.currentRound,16);
 const round=state.calendar.find(r=>r.roundNumber===1),fixture=round.fixtures.find(f=>f.homeId===state.userClubId||f.awayId===state.userClubId);assert(Array.isArray(fixture.events));
 for(const c of state.clubs){for(const p of c.players){const stats=p.competitionStats?.[state.season]?.Campionat;if(!stats)continue;assert(Number.isFinite(p.fitness));assert(stats.apps>0);}}
 const goals=new Map();for(const rd of state.calendar)for(const f of rd.fixtures||[])if(f.played&&Array.isArray(f.events))for(const e of f.events)if(e.type==='GOAL')goals.set(e.scorerId,(goals.get(e.scorerId)||0)+1);
 for(const [id,count] of goals){const player=state.clubs.flatMap(c=>c.players).find(p=>p.id===id);if(player)assert.equal(player.competitionStats?.[state.season]?.Campionat?.goals,count,`marcator ${id}`)}
 const junior=state.u21Squad.find(p=>p.competitionStats?.[state.season]?.['Campionat U21']);assert(junior,'statisticile U21 sunt salvate');assert.deepEqual(app.errors,[]);const saved=app.window.localStorage.getItem(KEY);app.close();app=await launch({seed:{[KEY]:saved}});await app.sleep(500);assert(read(app).clubs.some(c=>c.players.some(p=>p.competitionStats?.[state.season]?.Campionat)));console.log('  ✓ simularea rapidă păstrează marcatorii, statisticile AI și U21 la reîncărcare');
 }finally{app.close()}})().then(()=>process.exit(0),e=>{console.error(e);process.exit(1)});
