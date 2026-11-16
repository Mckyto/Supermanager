const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('public/index.html', 'utf8');
function slice(a,b) {const i=html.indexOf(a),j=html.indexOf(b,i);assert(i>=0&&j>i);return html.slice(i,j)}
const code = 'const ' + slice('Qi={','const X2=') + '\n' + slice('const _SM_KNOWN_POSITIONS=', 'function Tx(') + '\nconst ' + slice('Yp={','function or(') + '\nthis.test={Qi,Zi,Ex,Dx,_smPositionFit,_smPositionScore,_smSecondaryPositions,_smOrderBench,_smPositionWarnings};';
const context={};vm.runInNewContext(code,context);const {Qi,Zi,Ex,Dx,_smPositionFit,_smPositionScore,_smSecondaryPositions,_smOrderBench,_smPositionWarnings}=context.test;
let count=0;function check(name,fn){fn();count++;console.log('  ✓ '+name)}
const right=['RB','RWB','RM','RW'],left=['LB','LWB','LM','LW'];
check('toate formațiile: flancurile corespund tablei și terenului live',()=>{
 for(const [formation,def] of Object.entries(Qi)) {
  assert.equal(def.slots.length,11,formation); const match=Dx(formation);assert.equal(match.length,11,formation);
  def.slots.forEach((slot,i)=>{if(right.includes(slot.role)){assert(slot.y>0,`${formation}: ${slot.role} tabla`);assert(match[i].y>34,`${formation}: ${slot.role} teren`)} if(left.includes(slot.role)){assert(slot.y<0,`${formation}: ${slot.role} tabla`);assert(match[i].y<34,`${formation}: ${slot.role} teren`)}});
 }
});
check('rolurile tuturor formațiilor sunt identice pe tablă și în motor',()=>{
 for(const [formation,def] of Object.entries(Qi))def.slots.forEach((slot,i)=>{
  const normalize=r=>({CDM:'DM',CAM:'AM'}[r]||r);
  assert.equal(normalize(Dx(formation)[i].slot),normalize(slot.role),formation+' '+i);
 });
});
check('4-2-3-1: CAM, RW și LW corespund între selecție și motor',()=>{
 const slots=Qi['4-2-3-1'].slots, match=Dx('4-2-3-1');for(let i=7;i<=9;i++)assert.equal(slots[i].role === 'CAM' ? 'AM' : slots[i].role,match[i].slot);
});
const rawStart=html.indexOf('const L2=[{id:"fcsb"');// Parse the complete club array, including nested squads.
function getArray(start){let depth=0,inString=false,escape=false;for(let i=start;i<html.length;i++){let c=html[i];if(inString){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')inString=false;continue}if(c==='"'){inString=true;continue}if(c==='[')depth++;if(c===']'&&--depth===0)return html.slice(start,i+1)}throw Error('unclosed')}
const clubs=vm.runInNewContext('('+getArray(html.indexOf('[',rawStart))+')');const fcsb=clubs.find(c=>c.id==='fcsb');
const players=fcsb.players.map((p,i)=>({...p,id:String(i),linePos:p.pos,pos:({CDM:'DM',CAM:'AM'}[p.role]||p.role||p.pos),role:({CDM:'DM',CAM:'AM'}[p.role]||p.role||p.pos),fitness:95,morale:80,isU21:!!p.u21,shooting:p.ovr,passing:p.ovr}));
check('FCSB: posturi principale și secundare documentate',()=>{
 const byName=name=>players.find(p=>p.name===name);
 for(const [name,pos] of Object.entries({'Ștefan Târnovanu':'GK','Valentin Crețu':'RB','Joyskim Dawa':'CB','André Duarte':'CB','Ricardo Pădurariu':'LB','Karlo Muhar':'DM','Juri Cisotti':'CM','Joao Paulo Fernandes':'DM','Meriton Korenica':'LW','David Miculescu':'RW','Denis Drăguș':'ST','Ofri Arad':'DM','Luca Stancu':'RB','Mihai Toma':'LW'})) assert.equal(byName(name).pos,pos,name);
 assert.equal(byName('Meriton Korenica').number,7);
 for(const [name,positions] of Object.entries({'Meriton Korenica':['AM','CM','RW'],'David Miculescu':['ST','LW'],'Joao Paulo Fernandes':['LB','CM'],'Luca Stancu':['LB'],'Ofri Arad':['CB']})) for(const pos of positions) assert.equal(_smPositionFit(byName(name),pos),'secondary',name+' '+pos);
});
check('FCSB 4-2-3-1: formula de start din 7 noiembrie, pe sloturile corecte',()=>{
 const result=Zi(players,'4-2-3-1',true,'fcsb');
 assert.equal(fcsb.preferredFormation,'4-2-3-1');
 assert.deepEqual(Array.from(result.starters,id=>players.find(p=>p.id===id).name), ['Ștefan Târnovanu','Ronny Labonne','Joyskim Dawa','André Duarte','Luca Stancu','Karlo Muhar','Risto Radunović','Aymen Boutoutaou','David Miculescu','Meriton Korenica','Denis Drăguș']);
 assert(result.starters.some(id=>players.find(p=>p.id===id).isU21));
});
check('formula FCSB înlocuiește accidentați, suspendați și jucători plecați fără să încalce U21',()=>{
 const variants=[players.map(p=>p.name==='Meriton Korenica'?{...p,injuredWeeks:2}:p),players.map(p=>p.name==='Luca Stancu'?{...p,suspendedMatches:1}:p),players.filter(p=>p.name!=='Denis Drăguș')];
 for(const squad of variants){const pick=Zi(squad,'4-2-3-1',true,'fcsb'), starters=pick.starters.map(id=>squad.find(p=>p.id===id));assert.equal(starters.length,11);assert.equal(new Set(pick.starters).size,11);assert(starters.every(p=>!(p.injuredWeeks>0)&&!(p.suspendedMatches>0)));assert(starters.some(p=>p.isU21));}
});
check('referința FCSB nu fixează jucători obosiți sau inferiori unui nou transfer și nu afectează alte cluburi',()=>{
 const tired=players.map(p=>p.name==='Ronny Labonne'?{...p,fitness:55}:p);
 assert.notEqual(tired.find(p=>p.id===Zi(tired,'4-2-3-1',true,'fcsb').starters[1]).name,'Ronny Labonne');
 const withStar=[...players,{id:'new-star',name:'Transfer Nou',pos:'RB',linePos:'DF',ovr:95,fitness:95,morale:80,age:25}];
 assert.equal(Zi(withStar,'4-2-3-1',true,'fcsb').starters[1],'new-star');
 assert.deepEqual(Array.from(Zi(players,'4-2-3-1',true,'other').starters),Array.from(Zi(players,'4-2-3-1',true).starters));
});
check('FCSB: auto-selecția 4-3-3 pune extremele pe flancurile lor și păstrează U21',()=>{
 const slots=Qi['4-3-3'].slots, pick=Zi(players,'4-3-3',true);
 const at=role=>players.find(p=>p.id===pick.starters[slots.findIndex(s=>s.role===role)]);
 assert.equal(at('LW').name,'Meriton Korenica');assert.equal(at('RW').name,'David Miculescu');
 assert.equal(at('ST').name,'Denis Drăguș');assert(pick.starters.some(id=>players.find(p=>p.id===id).isU21));
});
check('autoselecție FCSB: fundași laterali pe flancul lor în 4-2-1-3',()=>{
 const form=Qi['4-2-1-3'].slots, pick=Zi(players,'4-2-1-3',true);const playerAt=role=>players.find(p=>p.id===pick.starters[form.findIndex(s=>s.role===role)]);
 assert.equal(playerAt('RB').name,'Valentin Crețu');assert.equal(playerAt('LB').pos,'LB');
});
check('schimbarea formației păstrează titularii și îi ordonează după post',()=>{
 const pick=Zi(players,'4-2-1-3',true);const starters=pick.starters.map(id=>players.find(p=>p.id===id));const reordered=Ex(starters,'4-3-3');assert.equal(reordered.length,11);assert.equal(new Set(reordered).size,11);
 const slots=Qi['4-3-3'].slots;const playerAt=role=>players.find(p=>p.id===reordered[slots.findIndex(s=>s.role===role)]);assert.equal(playerAt('RB').name,'Valentin Crețu');assert.equal(playerAt('LB').pos,'LB');
});
check('regula U21 înlocuiește un jucător de pe postul potrivit, nu fundașul dreapta',()=>{
 const slots=Qi['4-2-3-1'].slots;
 const squad=slots.map((slot,i)=>({id:'s'+i,name:'Titular '+i,pos:({CDM:'DM',CAM:'AM'}[slot.role]||slot.role),role:({CDM:'DM',CAM:'AM'}[slot.role]||slot.role),linePos:slot.pos,ovr:i===1?73:80,fitness:95,morale:80,age:28,shooting:70,passing:70}));
 squad.push({id:'junior',name:'Junior',pos:'CM',role:'CM',linePos:'MF',ovr:65,fitness:95,morale:80,age:19,isU21:true,shooting:65,passing:65});
 const result=Zi(squad,'4-2-3-1',true);const index=result.starters.indexOf('junior');
 assert(index>=0);assert.equal(slots[index].pos,'MF');assert.equal(result.starters[1],'s1');
});
check('posturile secundare sunt recunoscute, dar postul principal are prioritate',()=>{
 const p={name:'Test',pos:'RB',linePos:'DF',secondaryPositions:['CB','GK'],ovr:75};
 assert.equal(_smPositionFit(p,'RB'),'primary');assert.equal(_smPositionFit(p,'CB'),'secondary');
 assert.equal(_smPositionFit(p,'GK'),'out');assert(_smPositionScore(p,{role:'RB',pos:'DF'})>_smPositionScore(p,{role:'CB',pos:'DF'}));
 assert(_smPositionScore(p,{role:'CB',pos:'DF'})>_smPositionScore(p,{role:'LB',pos:'DF'}));
 assert(_smSecondaryPositions({name:'Kylian Mbappé',pos:'ST'}).includes('LW'));
});
check('selecția preferă un post secundar documentat unui post nepotrivit',()=>{
 const def=Qi['4-2-3-1'].slots, squad=def.map((slot,i)=>({id:'q'+i,name:'Test '+i,pos:({CDM:'DM',CAM:'AM'}[slot.role]||slot.role),linePos:slot.pos,ovr:75,age:27,fitness:95,morale:80,shooting:70,passing:70}));
 squad[1].pos='CB';squad[1].secondaryPositions=['RB'];squad.push({id:'extra',pos:'CB',linePos:'DF',ovr:95,age:27,fitness:95,morale:80});
 const result=Zi(squad,'4-2-3-1',false);assert.equal(result.starters[1],'q1');assert(result.starters.includes('extra'));
});
check('banca prioritizată acoperă posturile și păstrează toate rezervele',()=>{
 const squad=['GK','GK','CB','RB','LB','DM','CM','AM','RW','LW','ST'].map((pos,i)=>({id:String(i),pos,ovr:90-i,fitness:95}));
 squad[0].injuredWeeks=2; const ordered=_smOrderBench(squad,7);
 assert.equal(ordered.length,squad.length);assert.equal(new Set(ordered.map(p=>p.id)).size,squad.length);
 assert.equal(ordered[0].id,'1');assert(!ordered.slice(0,7).some(p=>p.injuredWeeks));
 assert(ordered.slice(0,7).some(p=>p.pos==='CB'));assert(ordered.slice(0,7).some(p=>p.pos==='ST'));
});
check('avertismentul propune doar rezerve apte și respectă U21',()=>{
 const starters=[{id:'j',pos:'CM',isU21:true}],slots=[{role:'RB',pos:'DF'}];
 const bench=[{id:'adult',pos:'RB',ovr:80},{id:'injured',pos:'RB',isU21:true,ovr:90,injuredWeeks:1},{id:'young',pos:'CB',secondaryPositions:['RB'],isU21:true,ovr:65}];
 const warnings=_smPositionWarnings(starters,bench,slots,true);
 assert.equal(warnings.length,1);assert.equal(warnings[0].suggestion.id,'young');
 assert.equal(_smPositionWarnings([{...starters[0],secondaryPositions:['RB']}],bench,slots,true).length,0);
 assert.equal(_smPositionWarnings(starters,bench.filter(p=>p.id!=='young'),slots,true)[0].suggestion,null);
});
check('autoselecția evită efectul de cascadă și exclude indisponibilii',()=>{
 const slots=Qi['4-2-3-1'].slots;
 const squad=slots.map((slot,i)=>({id:'p'+i,pos:({CDM:'DM',CAM:'AM'}[slot.role]||slot.role),linePos:slot.pos,ovr:i===1?60:80,fitness:95,morale:80,age:28,shooting:70,passing:70}));
 squad.push({id:'unavailable',pos:'RB',linePos:'DF',ovr:99,injuredWeeks:2,age:26});
 const pick=Zi(squad,'4-2-3-1',false),chosen=pick.starters.map(id=>squad.find(p=>p.id===id));
 assert(chosen.every((p,i)=>p.pos===({CDM:'DM',CAM:'AM'}[slots[i].role]||slots[i].role)));
 assert(!pick.starters.includes('unavailable'));assert(pick.bench.includes('unavailable'));
});
check('tabla folosește rolul și coordonata aceluiași slot, inclusiv după rocada jucătorilor',()=>{assert(html.includes('Ge=(Qi[e]?.slots||Qi["4-3-3"].slots).map(I=>({role:I.role,x:50+(I.y||0)*1.45'));assert(html.includes('children:$e.role}),_smPositionFit(I,$e.role)'));});
// Audit independent: bipartite matching computes the maximum number of natural
// positions, including the constraint that Romanian teams start a U21 player.
const extraStart=html.indexOf('const yh=['), extraEnd=html.indexOf('];',extraStart)+2;
const generated=vm.runInNewContext(slice('const _SM_KNOWN_POSITIONS=', 'function Fn(')+slice('function hr(', 'const yh=[')+html.slice(extraStart,extraEnd)+';[...yh,hc,...If]');
const european=vm.runInNewContext('('+getArray(html.indexOf('[',html.indexOf('B2=[{id:"realmadrid"')))+')');
const allTeams=[...clubs,...european].map(club=>({...club,players:club.players.map((p,i)=>({...p,id:club.id+'-'+i,linePos:p.pos,pos:({CDM:'DM',CAM:'AM'}[p.role]||p.role||p.pos),role:({CDM:'DM',CAM:'AM'}[p.role]||p.role||p.pos),fitness:95,morale:80,isU21:typeof p.u21==='boolean'?p.u21:p.nat==='ROU'&&p.age<=21,shooting:p.ovr,passing:p.ovr}))})).concat(generated);
const role=r=>({CDM:'DM',CAM:'AM'}[r]||r);
function maxNatural(squad,slots,forceU21){
 function match(pinPlayer=-1,pinSlot=-1){
  const owner=Array(squad.length).fill(-1);let count=pinPlayer>=0&&role(squad[pinPlayer].pos)===role(slots[pinSlot].role)?1:0;
  function augment(si,seen){for(let j=0;j<squad.length;j++){if(j===pinPlayer||seen[j]||role(squad[j].pos)!==role(slots[si].role))continue;seen[j]=true;if(owner[j]<0||augment(owner[j],seen)){owner[j]=si;return true}}return false}
  for(let i=0;i<slots.length;i++)if(i!==pinSlot&&augment(i,[]))count++;
  return count;
 }
 if(!forceU21||!squad.some(p=>p.isU21))return match();
 let best=0; squad.forEach((p,j)=>{if(p.isU21)slots.forEach((s,i)=>{if((role(s.role)==='GK')===(p.pos==='GK'))best=Math.max(best,match(j,i))})});return best;
}
check('toate echipele și formațiile: număr maxim posibil de posturi naturale, inclusiv U21',()=>{
 for(const club of allTeams)for(const [formation,def] of Object.entries(Qi)){
  const squad=club.players, needU21=club.league==='RO', result=Zi(squad,formation,needU21);
  assert.equal(result.starters.length,11,club.name+' '+formation);assert.equal(new Set(result.starters).size,11);
  const selected=result.starters.map(id=>squad.find(p=>p.id===id));
  assert(selected.every(Boolean),club.name+' identificatori');assert.equal(selected[0].pos,'GK',club.name+' portar');
  if(needU21&&squad.some(p=>p.isU21))assert(selected.some(p=>p.isU21),club.name+' U21');
  const actual=selected.filter((p,i)=>role(p.pos)===role(def.slots[i].role)).length;
  assert.equal(actual,maxNatural(squad,def.slots,needU21),club.name+' '+formation);
 }
 console.log(`    auditate ${allTeams.length} echipe × ${Object.keys(Qi).length} formații`);
});
check('loturi generate: fiecare jucător are poziție de referință',()=>{
 const known=vm.runInNewContext(slice('const _SM_KNOWN_POSITIONS=', 'function Fn(')+';_SM_KNOWN_POSITIONS');
 for(const team of generated) for(const p of team.players) assert(Object.prototype.hasOwnProperty.call(known,p.name),p.name);
});
check('loturi generate: titulari verificați nu mai primesc poziția după indice',()=>{
 for(const [name,pos] of [['Edoardo Bove','CM'],['Krzysztof Piątek','ST'],['Romano Schmid','AM'],['Christoph Baumgartner','AM'],['Andrea Colpani','AM'],['Fredrik Aursnes','CM'],['Piotr Zieliński','CM']]){
  const player=generated.flatMap(c=>c.players).find(p=>p.name===name);assert(player,name);assert.equal(player.pos,pos,name);
 }
});
check('schimbarea formației și corecția lotului folosesc aceeași repartizare',()=>{
 assert(html.includes('if(previous!==t&&players.length===11)'));assert(html.includes('ordered=Ex(players,t).map(id=>byId.get(id))'));
 assert(html.includes('const me=Ex(J.map(Fe=>N.get(Fe.id)||Fe),d.formation),fe=new Set(me)'));
});
console.log(`${count}/${count} verificări formații OK (${Object.keys(Qi).length} sisteme)`);
