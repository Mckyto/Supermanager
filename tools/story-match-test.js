/** Regresii pentru scenarii înainte de primul meci și comenzile responsive. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const extract = (start, end) => {
  const i = html.indexOf(start), j = html.indexOf(end, i);
  assert(i >= 0 && j > i, `${start} / ${end}`);
  return html.slice(i, j);
};
const eligible = new Function(extract('function Iv(', 'function H2(') + ';return Iv')();
const loss = {allowedResults:['LOSS']}, victory = {allowedResults:['WIN'],isResultDedicated:true};
for (const context of [null, {}, {result:null}]) {
  assert.equal(eligible(loss,context),false, 'niciun scenariu de înfrângere înainte de meci');
  assert.equal(eligible(victory,context),false);
}
assert(eligible(loss,{result:'LOSS'}));
assert(!eligible(loss,{result:'WIN'}));
assert(eligible(victory,{result:'WIN'}));
assert(eligible({},null), 'scenariile independente rămân disponibile');
const actors = new Function(extract('function _smPreviousMatchActors(', 'function Cx(') + ';return _smPreviousMatchActors')();
const club={players:[{id:'neplayed',name:'Rezervă',pos:'ST',ovr:99},{id:'played',name:'Titular',pos:'CM',ovr:75},{id:'played2',name:'Alt titular',pos:'ST',ovr:70}]};
const event={previousMatchActors:['starPlayer']};
assert.equal(actors(event,club,null),null);
assert.equal(actors(event,club,{result:'LOSS'}),null, 'salvările vechi fără participanți nu inventează');
assert.equal(actors(event,club,{participantIds:['played']}).starPlayer.id,'played');
assert.equal(actors({previousMatchActors:['starPlayer','secondStar']},club,{participantIds:['played']}),null);
assert.equal(actors({previousMatchActors:['starPlayer','secondStar']},club,{participantIds:['played','played2']}).secondStar.id,'played2');
assert(html.includes('participantIds:[...ti.keys()]'));
assert(html.includes('!_smPreviousMatchActors(Kt,k,Ee)'));
assert(html.includes('id:"patron_tv_explosion",allowedResults:["LOSS"],previousMatchActors:["starPlayer"]'));

const phone = new Function('_smCaptainPick','Xs','qy','_smConflictMessages','lt',extract('function tE(', 'function Hd(')+';return tE')(()=>null,[],()=>false,()=>[],String);
for(let i=0;i<100;i++) {
  const messages=phone({currentRound:1,lineupIds:{roles:{}},phoneMessages:[]},{players:[],shortName:'Club'},{name:'Rival'});
  assert.equal(messages.length,1);
  assert(!/un punct|am pierdut|victorie/i.test(messages[0].text),messages[0].text);
}
const oldMessage={id:'msg-patron-1-123',roundGenerated:1,replied:false,text:'„Un punct, tată, dar parcă prea puțin. Cu Rival vreau să văd altceva în atac.”'};
const oldCareer={currentRound:1,lineupIds:{roles:{}},phoneMessages:[oldMessage]};
assert.match(phone(oldCareer,{players:[]},{name:'Rival'})[0].text,/Începem campionatul/);
assert.equal(phone({...oldCareer,lastMatchContext:{result:'DRAW'}},{players:[]},{name:'Rival'})[0].text,oldMessage.text);
console.log('  ✓ scenariile după meci cer rezultat real și jucători participanți; mesajele inițiale sunt neutre');

assert(html.includes('.sm-desktop-score,.sm-desktop-pause,.sm-desktop-speed{display:none}@media(min-width:1024px){.sm-desktop-score,.sm-desktop-speed{display:flex}.sm-desktop-pause{display:block}}'));
assert(html.includes('.lg\\:hidden{display:none}'));
assert(html.includes('"data-sm-compact-controls":"1",className:"lg:hidden sticky'));
assert(html.includes('className:"sm-desktop-score '));
assert(html.includes('className:"sm-desktop-pause '));
assert(html.includes('className:"sm-desktop-speed '));
console.log('  ✓ mobil: scor și comenzi compacte; desktop: un singur set de comenzi');
