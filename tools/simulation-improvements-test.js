const resolveSupercup=require('./resolve-supercup-fixture');
/** Teste pentru simulare rapidă, variația tactică și comenzile live. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {launch}=require('./dom-harness');
const html=fs.readFileSync('public/index.html','utf8');
function extract(a,b){const start=html.indexOf(a),end=html.indexOf(b,start);assert(start>=0&&end>start);return html.slice(start,end)}
const slots=['GK','RB','CB','CB','LB','DM','CM','AM','RW','LW','ST'];
const Qi={'4-3-3':{slots:slots.map(role=>({role}))}};
const Fn=p=>!(p.injuredWeeks>0||p.suspendedMatches>0);
const Zi=(players)=>({starters:players.slice(0,11).map(p=>p.id)});
const fit=(p,role)=>p.pos===role?'primary':'out';
const style=()=>({tactics:{mentality:'balanced',pressing:'medium',defLine:'normal',passing:'mixed',width:'normal'}});
const Nx=(club,bonus=0)=>club.players.slice(0,11).reduce((s,p)=>s+p.ovr,0)/Math.max(1,Math.min(11,club.players.length))+bonus;
let seed=123;const math=Object.create(Math);math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const api=new Function('Qi','Fn','Zi','_smPositionFit','_smOpponentStyle','_smPreparedOpponent','Nx','Math','_smQuickPartnershipBonus',extract('function _smQuickTeam(', 'function J2(')+';return {team:_smQuickTeam,context:_smQuickContext,rates:_smQuickRates,match:_smQuickMatch}') (Qi,Fn,Zi,fit,style,style,Nx,math,()=>0);
const club=(id,ovr)=>({id,league:'EU',preferredFormation:'4-3-3',players:[...slots,'ST'].map((pos,i)=>({id:id+i,name:id+i,pos,ovr:i===11?ovr-15:ovr,fitness:90,morale:80,linePos:pos==='GK'?'GK':'FW'}))});
const home=club('h',75),away=club('a',75),career={userClubId:'h',formation:'4-3-3',lineupIds:{starters:home.players.slice(0,11).map(p=>p.id)},tactics:{mentality:'balanced'}};
const before=JSON.stringify(home);const first=api.context(career,home,away);assert.equal(first.home.selectedIds.length,11);assert.equal(first.home.misfit,0);assert.equal(JSON.stringify(home),before);
const tired=JSON.parse(JSON.stringify(home));tired.players.forEach(p=>{p.fitness=45;p.morale=45;p.formMomentum=-50});assert(api.context(career,tired,away).home.condition<first.home.condition);
const changed=JSON.parse(JSON.stringify(home));changed.players[0].injuredWeeks=2;const replacement=api.context(career,changed,away);assert(!replacement.home.selectedIds.includes('h0'));assert(replacement.home.selectedIds.includes('h11'));
const swap={...career,lineupIds:{starters:[...career.lineupIds.starters.slice(0,10),'h11']}};assert(api.context(swap,home,away).home.selectedIds.includes('h11'));
const attacking=api.rates({mentality:'attacking',passing:'direct'},{defLine:'high'}),defensive=api.rates({mentality:'defensive'},{});assert(attacking.attack>defensive.attack&&attacking.risk>defensive.risk);
let strong=0,weak=0;seed=99;for(let i=0;i<1500;i++)strong+=api.match(career,home,away).homeGoals;seed=99;for(let i=0;i<1500;i++)weak+=api.match(career,tired,away).homeGoals;assert(strong>weak,`${strong} vs ${weak}`);
const cross=new Function(extract('function _smCrossRate(', 'class hM{')+';return _smCrossRate')();assert(cross(18,{width:'wide'})>cross(18,{width:'normal'}));assert(cross(18,{width:'narrow'})<cross(18,{width:'normal'}));
const moment=new Function(extract('function _smKeyMoment(', 'function Qb(')+';return _smKeyMoment')();assert.equal(moment([{type:'pass',text:'Pasă'},{type:'goal',text:'Gol',min:9}]).text,'Gol');assert.equal(moment([{type:'pass',text:'Pasă'}]),null);
console.log('  ✓ simularea rapidă respectă titularii, disponibilitatea, condiția și tactica; faze pe flancuri');
(async()=>{const app=await launch();try{
 assert(app.click(/Semnează Contractul/));await resolveSupercup(app);assert(await app.waitFor(/Intră în Meci/,10000));assert(app.document.querySelector('[data-sm-quick-explanation]'));
 assert(app.click(/Intră în Meci/));assert(await app.waitFor(/Adrenalină pe Gazon|LIVE/,10000));const engine=app.window.__smEngine;engine.phase='LIVE';
 assert(app.click(label=>label==='Tactică'));await app.sleep(150);const panel=app.document.querySelector('[data-sm-live-instructions]');assert(panel);
 const select=panel.querySelector('select');assert(select.options.length>1);select.value=select.options[1].value;select.dispatchEvent(new app.window.Event('change',{bubbles:true}));await app.sleep(100);
 const target=engine[engine.userSide==='home'?'homePlayers':'awayPlayers'].find(p=>String(p.id)===select.value);assert(target&&!target.redCard&&target.pos!=='GK');
 const btn=[...panel.querySelectorAll('button')].find(b=>b.textContent==='Apasă');assert(btn);btn.click();await app.sleep(100);assert.equal(target.matchInstruction,'press');assert.equal(btn.getAttribute('aria-pressed'),'true');
 engine.phase='GOAL_CELEBRATION';engine.phaseTimer=30;engine._replay=null;engine.events=[{min:engine.minute,type:'goal',text:'Gol de test'}];await app.sleep(550);assert(app.document.querySelector('[data-sm-key-moment]')?.textContent.includes('Gol de test'));
 assert(app.click(/Radio Live/));await app.sleep(100);assert(!app.document.querySelector('[data-sm-key-moment]'));assert(app.document.querySelector('[data-sm-radio]'));
 assert.deepEqual(app.errors,[]);console.log('  ✓ instrucțiune individuală live, moment real și radio doar cu subtitrare');
 }finally{app.close()}})().then(()=>process.exit(0),e=>{console.error(e);process.exit(1)});
