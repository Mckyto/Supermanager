const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('public/index.html', 'utf8');
function slice(a,b) {const i=html.indexOf(a),j=html.indexOf(b,i);assert(i>=0&&j>i);return html.slice(i,j)}
const code = 'const ' + slice('Qi={','const X2=') + '\n' + slice('function Fn(', 'function Tx(') + '\nconst ' + slice('Yp={','function or(') + '\nthis.test={Qi,Zi,Ex,Dx};';
const context={};vm.runInNewContext(code,context);const {Qi,Zi,Ex,Dx}=context.test;
let count=0;function check(name,fn){fn();count++;console.log('  ✓ '+name)}
const right=['RB','RWB','RM','RW'],left=['LB','LWB','LM','LW'];
check('toate formațiile: flancurile corespund tablei și terenului live',()=>{
 for(const [formation,def] of Object.entries(Qi)) {
  assert.equal(def.slots.length,11,formation); const match=Dx(formation);assert.equal(match.length,11,formation);
  def.slots.forEach((slot,i)=>{if(right.includes(slot.role)){assert(slot.y>0,`${formation}: ${slot.role} tabla`);assert(match[i].y>34,`${formation}: ${slot.role} teren`)} if(left.includes(slot.role)){assert(slot.y<0,`${formation}: ${slot.role} tabla`);assert(match[i].y<34,`${formation}: ${slot.role} teren`)}});
 }
});
check('4-2-3-1: CAM, RW și LW corespund între selecție și motor',()=>{
 const slots=Qi['4-2-3-1'].slots, match=Dx('4-2-3-1');for(let i=7;i<=9;i++)assert.equal(slots[i].role === 'CAM' ? 'AM' : slots[i].role,match[i].slot);
});
const rawStart=html.indexOf('const L2=[{id:"fcsb"');// Parse the complete club array, including nested squads.
function getArray(start){let depth=0,inString=false,escape=false;for(let i=start;i<html.length;i++){let c=html[i];if(inString){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')inString=false;continue}if(c==='"'){inString=true;continue}if(c==='[')depth++;if(c===']'&&--depth===0)return html.slice(start,i+1)}throw Error('unclosed')}
const clubs=vm.runInNewContext('('+getArray(html.indexOf('[',rawStart))+')');const fcsb=clubs.find(c=>c.id==='fcsb');
const players=fcsb.players.map((p,i)=>({...p,id:String(i),linePos:p.pos,pos:({CDM:'DM',CAM:'AM'}[p.role]||p.role||p.pos),role:({CDM:'DM',CAM:'AM'}[p.role]||p.role||p.pos),fitness:95,morale:80,isU21:!!p.u21,shooting:p.ovr,passing:p.ovr}));
check('autoselecție FCSB: Crețu RB și Radunović LB în 4-2-1-3',()=>{
 const form=Qi['4-2-1-3'].slots, pick=Zi(players,'4-2-1-3',true);const playerAt=role=>players.find(p=>p.id===pick.starters[form.findIndex(s=>s.role===role)]);
 assert.equal(playerAt('RB').name,'Valentin Crețu');assert.equal(playerAt('LB').name,'Risto Radunović');
});
check('schimbarea formației păstrează titularii și îi ordonează după post',()=>{
 const pick=Zi(players,'4-2-1-3',true);const starters=pick.starters.map(id=>players.find(p=>p.id===id));const reordered=Ex(starters,'4-3-3');assert.equal(reordered.length,11);assert.equal(new Set(reordered).size,11);
 const slots=Qi['4-3-3'].slots;const playerAt=role=>players.find(p=>p.id===reordered[slots.findIndex(s=>s.role===role)]);assert.equal(playerAt('RB').name,'Valentin Crețu');assert.equal(playerAt('LB').name,'Risto Radunović');
});
check('regula U21 înlocuiește un jucător de pe postul potrivit, nu fundașul dreapta',()=>{
 const slots=Qi['4-2-3-1'].slots;
 const squad=slots.map((slot,i)=>({id:'s'+i,name:'Titular '+i,pos:({CDM:'DM',CAM:'AM'}[slot.role]||slot.role),role:({CDM:'DM',CAM:'AM'}[slot.role]||slot.role),linePos:slot.pos,ovr:i===1?73:80,fitness:95,morale:80,age:28,shooting:70,passing:70}));
 squad.push({id:'junior',name:'Junior',pos:'CM',role:'CM',linePos:'MF',ovr:65,fitness:95,morale:80,age:19,isU21:true,shooting:65,passing:65});
 const result=Zi(squad,'4-2-3-1',true);const index=result.starters.indexOf('junior');
 assert(index>=0);assert.equal(slots[index].pos,'MF');assert.equal(result.starters[1],'s1');
});
check('tabla folosește rolul și coordonata aceluiași slot, inclusiv după rocada jucătorilor',()=>{assert(html.includes('Ge=(Qi[e]?.slots||Qi["4-3-3"].slots).map(I=>({role:I.role,x:50+(I.y||0)*1.45'));assert(html.includes('children:$e.role}),SA(I.name)'));});
console.log(`${count}/${count} verificări formații OK (${Object.keys(Qi).length} sisteme)`);
