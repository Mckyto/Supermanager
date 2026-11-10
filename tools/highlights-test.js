const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const start = html.indexOf('function _smHighlightSpeed(');
const end = html.indexOf('function Qb(', start);
assert(start >= 0 && end > start);
const speed = new Function(html.slice(start,end) + ';return _smHighlightSpeed')();
const base = {phase:'LIVE',ball:{x:52.5}};
function check(name, fn) { fn(); console.log('  ✓ '+name); }
check('faza neutră se accelerează, atacul periculos se vede la viteză normală', () => {
  assert.equal(speed(base,0,100),8);
  assert.equal(speed({...base,ball:{x:20}},0,100),1);
  assert.equal(speed({...base,ball:{x:85}},0,100),1);
});
check('penalty, lovitură liberă și corner rămân la viteză normală', () => {
  for (const type of ['PENALTY','FREE_KICK','CORNER']) assert.equal(speed({...base,phase:'SET_PIECE',setPiece:{type}},0,100),1);
});
check('șutul, parada, VAR și golul nu sunt accelerate', () => {
  for (const change of [{_activeShotWindup:{}},{activeShotLine:{}},{_shotShowcaseTimer:1},{phase:'OUT_BEAT'},{phase:'VAR_CHECK'},{phase:'GOAL_CELEBRATION'},{replayActive:true},{_replay:{}}]) assert.equal(speed({...base,...change},0,100),1);
});
check('un eveniment detectat păstrează ritmul normal patru secunde', () => {
  assert.equal(speed(base,4100,100),1);assert.equal(speed(base,4100,4099),1);assert.equal(speed(base,4100,4100),8);
});
check('modul folosește același motor și aceleași date de fază, fără simulare separată', () => {
  assert(html.includes('Le==="highlights"?_smHighlightSpeed(pe,_hl.current.until,ee):A'));
  assert(html.includes('_hl.current.last=pe.highlights?.[0]||null'));
  assert(html.includes('pe.step(ve,_speed)'));
  assert(html.includes('children:"🎬 Highlights 3D"'));
});
check('radarul mobil rămâne comutabil și desenează datele jocului', () => {
  assert(html.includes('className:"sm-3d-radar", "data-sm-radar":"1"'));
  assert(html.includes('.sm-3d-radar{top:auto!important;bottom:10px;width:110px;max-width:32%}'));
  assert(html.includes('v.current&&y.current&&Et-yt>66'));
  assert(html.includes('onClick:()=>_(E=>!E)'));
});
console.log('6/6 verificări highlights și radar OK');
