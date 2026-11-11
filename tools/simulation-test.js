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

const radioStart = html.indexOf('Le==="radio"?r.jsx("section",{"data-sm-radio"');
const radioEnd = html.indexOf(':r.jsx(Ix,{engine:De.current', radioStart);
assert(radioStart >= 0 && radioEnd > radioStart);
const radio = html.slice(radioStart, radioEnd);
assert(radio.includes('se.liveCommentary.text'));
assert(radio.includes('"aria-live":"polite"'));
assert(!radio.includes('se.events') && !radio.includes('button'));
assert(html.includes('Le!=="radio"&&Pe&&se.liveCommentary?.text'));
console.log('radio: doar subtitrarea live, fără listă de evenimente OK');

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
