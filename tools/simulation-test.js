// Radarul rămâne accesibil pe mobil în modul 3D Live.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('public/index.html', 'utf8');
assert(html.includes('className:"sm-3d-radar", "data-sm-radar":"1"'));
assert(html.includes('.sm-3d-radar{top:auto!important;bottom:10px;width:110px;max-width:32%}'));
assert(html.includes('v.current&&y.current&&Et-yt>66'));
assert(html.includes('onClick:()=>_(E=>!E)'));
assert(html.includes('children:"📻 Radio Live"'));
assert(!html.includes('children:"🎬 Highlights 3D"'));
assert(html.includes('pe.step(ve,A)'));
console.log('7/7 verificări radio și radar OK');

const start = html.indexOf('function _smRadioImportant('), end = html.indexOf('function Qb(', start);
assert(start >= 0 && end > start);
const important = new Function(html.slice(start,end) + ';return _smRadioImportant')();
for (const type of ['goal','chance','save','red_card','yellow_card','card']) assert(important({type}), type);
assert(important({type:'shot', emotion:'big_chance'}));
assert(!important({type:'shot', text:'Șut de la distanță'}));
assert(!important({type:'pass'}));
assert(html.includes('children:"Faze importante"'));
console.log('filtru radio: categorii și pase OK');

const coachStart = html.indexOf('function _smScoldDetail('), coachEnd = html.indexOf('typeof window<"u"&&(window.__smPhone=',coachStart);
assert(coachStart >= 0 && coachEnd > coachStart);
const detail = new Function('_smScoldText',html.slice(coachStart,coachEnd)+';return _smScoldDetail')((kind,streak)=>`${kind}:${streak}`);
const offer = detail({kind:'transfer_offer',playerName:'Udrea'}, {}, 'agent',1);
assert.equal(offer.importance,'urgent'); assert(offer.text.includes('Udrea'));
const warm = detail({partnerId:'x',relationshipReminder:true},{trust:80},'press',1);
const strained = detail({partnerId:'x',relationshipReminder:true},{trust:20},'press',2);
assert.notEqual(warm.text,strained.text);assert(strained.text.includes('prima dată'));
assert(detail({kind:'unhappy'}, {}, 'locker',1).text.includes('nemulțumit'));
assert.equal(detail({}, {}, 'patron',2).text,'patron:2');
console.log('reproșuri personalizate: context, relație și importanță OK');

const phoneStart = html.indexOf('function _smPhoneStale('), phoneEnd = html.indexOf('window.__smFix=',phoneStart);
assert(phoneStart >= 0 && phoneEnd > phoneStart);
let called = 0, note = '', answer = false;
const confirmation = new Function('window',html.slice(phoneStart,phoneEnd)+';return _smConfirmSim')({confirm: text => {called++; note=text; return answer}});
const pending = {roundGenerated:3,replied:false};
assert(confirmation([],3));assert.equal(called,0);
assert(confirmation([{roundGenerated:2,expired:true}],3));assert.equal(called,0);
assert.equal(confirmation([pending],3),false);assert.match(note,/1 mesaj fără răspuns/);
answer=true;assert(confirmation([pending],3,true));assert.match(note,/mesajele noi apărute/);
console.log('avertisment simulare: gol, expirat, anulare și continuare OK');
