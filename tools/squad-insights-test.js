const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('public/index.html','utf8'),start=html.indexOf('function _smRotationOptions('),end=html.indexOf('function _SmSquadInsights(',start);
const fn=new Function('Fn','_smPositionFit','_smPositionScore',html.slice(start,end)+';return _smRotationOptions')(p=>!p.injuredWeeks,(p,role)=>p.pos===role?'primary':'out',p=>p.ovr);
const starters=[{id:1,name:'Tânăr',pos:'ST',isU21:true,fitness:60,ovr:75}],bench=[{id:2,name:'Senior',pos:'ST',fitness:95,ovr:80},{id:3,name:'Junior',pos:'ST',isU21:true,fitness:88,ovr:70}];
let result=fn(starters,bench,[{role:'ST'}],'RO');assert.equal(result[0].replacement.id,3);assert.equal(fn(starters,bench,[{role:'ST'}],'EU')[0].replacement.id,2);
assert.equal(fn([{...starters[0],fitness:90}],bench,[{role:'ST'}],'RO').length,0);
assert.equal(fn(starters,[{...bench[1],injuredWeeks:2}],[], 'RO')[0].replacement,null);
assert.equal(starters[0].fitness,60);
console.log('  ✓ rotația respectă disponibilitatea, postul și U21 fără a modifica lotul');
