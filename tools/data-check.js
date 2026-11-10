#!/usr/bin/env node
/**
 * Verificări de integritate a datelor din public/index.html.
 *
 * Bundle-ul e minificat, deci „datele” sunt obiecte JS în interiorul lui.
 * Le extragem și le validăm: antrenori, loturi, flag-uri U21, stadioane,
 * referințe de imagini. Rulează cu `npm test` (înaintea smoke test-ului).
 */
const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', 'public', 'index.html');
const html = fs.readFileSync(FILE, 'utf8');

const results = [];
const check = (name, condition, detail = '') => {
  results.push({ name, ok: Boolean(condition), detail });
  if (!condition) console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
};

/** Găsește array-ul care începe imediat după `marker` (paranteze echilibrate). */
function arrayAfter(marker) {
  const at = html.indexOf(marker);
  if (at < 0) throw new Error(`Nu găsesc markerul: ${marker}`);
  return readArray(html.indexOf('[', at));
}

/** Găsește array-ul care ÎNCADREAZĂ obiectul de la `marker` (ex. lista de cluburi EU). */
function arrayEnclosing(marker) {
  const at = html.indexOf(marker);
  if (at < 0) throw new Error(`Nu găsesc markerul: ${marker}`);
  let depth = 0;
  for (let i = at; i >= 0; i -= 1) {
    if (html[i] === ']') depth += 1;
    else if (html[i] === '[') {
      if (depth === 0) return readArray(i);
      depth -= 1;
    }
  }
  throw new Error(`Nu găsesc array-ul părinte pentru ${marker}`);
}

/** Citește array-ul JS care începe la `start` și îl evaluează ca date. */
function readArray(start) {
  let depth = 0;
  for (let i = start; i < html.length; i += 1) {
    if (html[i] === '[') depth += 1;
    else if (html[i] === ']') {
      depth -= 1;
      if (depth === 0) return eval(`(${html.slice(start, i + 1)})`); // eslint-disable-line no-eval
    }
  }
  throw new Error('Array neînchis');
}

const roClubs = arrayAfter('const L2=[{id:"fcsb"');
const euClubs = arrayEnclosing('{id:"realmadrid",name:"Real Madrid"');
const clubs = [...roClubs, ...euClubs];
const squads = clubs.flatMap((club) => (club.players || []).map((p) => ({ ...p, club: club.shortName })));

console.log('Integritate date');

// 1. Cluburi + antrenori
check('16 cluburi în SuperLiga', roClubs.length === 16, `${roClubs.length}`);
check('8 cluburi europene', euClubs.length === 8, `${euClubs.length}`);
const faraAntrenor = clubs.filter((c) => !c.coach || !String(c.coach).trim()).map((c) => c.shortName);
check('fiecare club are antrenor', faraAntrenor.length === 0, `lipsă: ${faraAntrenor.join(', ')}`);

// 2. Regula U21: flag-ul trebuie să respecte limita de vârstă a jocului
const u21PreaBatrani = squads.filter((p) => p.u21 && p.age > 21);
check('niciun jucător U21 peste 21 de ani', u21PreaBatrani.length === 0,
  u21PreaBatrani.map((p) => `${p.name} (${p.age})`).join(', '));
const u21Straini = squads.filter((p) => p.u21 && p.nat !== 'ROU');
check('flag-ul U21 doar pe jucători români', u21Straini.length === 0,
  u21Straini.map((p) => `${p.name} (${p.nat})`).join(', '));

// 3. Loturi
const nume = squads.map((p) => p.name);
const duplicate = nume.filter((n, i) => nume.indexOf(n) !== i);
check('niciun jucător în două loturi', duplicate.length === 0, duplicate.join(', '));

const numereDuble = [];
for (const club of clubs) {
  const seen = new Set();
  for (const p of club.players || []) {
    if (seen.has(p.number)) numereDuble.push(`${club.shortName} #${p.number}`);
    seen.add(p.number);
  }
}
check('numere de tricou unice în fiecare club', numereDuble.length === 0, numereDuble.join(', '));

const potGresit = squads.filter((p) => p.pot < p.ovr).map((p) => p.name);
check('potențial ≥ OVR la toți jucătorii', potGresit.length === 0, potGresit.join(', '));

const varste = squads.map((p) => p.age);
check('vârste plauzibile (16–42)', Math.min(...varste) >= 16 && Math.max(...varste) <= 42,
  `${Math.min(...varste)}–${Math.max(...varste)}`);

// 4. Identificatori de club
const shortNames = clubs.map((c) => c.shortName);
const shortDuble = shortNames.filter((n, i) => shortNames.indexOf(n) !== i);
check('shortName unic pentru fiecare club', shortDuble.length === 0, shortDuble.join(', '));
const coduriCompetitii = ['UCL', 'UEL', 'UECL'];
const coliziuni = shortNames.filter((n) => coduriCompetitii.includes(n));
check('shortName nu se confundă cu un cod de competiție', coliziuni.length === 0, coliziuni.join(', '));

// 5. Referințe de imagini
const assetsBlock = html.slice(html.indexOf('window.__SM_ASSETS__={'));
const assetKeys = new Set([...assetsBlock.matchAll(/"([^"/]+(?:\/[^"/]+)*\.(?:jpg|jpeg|png|webp))":"data:/g)].map((m) => m[1]));
const referinte = new Set([...html.matchAll(/["'](?:\.?\/)?assets\/([^"']+\.(?:jpg|jpeg|png|webp))["']/g)].map((m) => m[1]));
const lipsa = [...referinte].filter((r) => !assetKeys.has(r));
check('toate imaginile referite există în bundle', lipsa.length === 0, lipsa.slice(0, 5).join(', '));
check('bundle-ul are un set de imagini', assetKeys.size > 500, `${assetKeys.size} imagini`);

// 6. Meta / accesibilitate
check('viewport-ul permite zoom', !/user-scalable=no/.test(html) && !/maximum-scale=1/.test(html));

// 7. Motor live: pasul de simulare trebuie să avanseze cu ceasul meciului
// (înainte se împărțea încă o dată la viteza de joc, așa că la 8x se jucau
// de 8 ori mai puține faze fotbalistice pe minut — meciuri fără șuturi).
check(
  'motorul live nu mai împarte pasul de simulare la viteza de joc',
  html.includes('_stepSubtick(e){const t=e;') && !html.includes('t=e/Math.max(.5,this._curSpeedMult||1)')
);
check(
  'portarul folosește același pas de simulare ca restul echipei',
  !html.includes('te=n/Math.max(.5,this._curSpeedMult||1)')
);

// 8. Salvarea carierei: o singură cheie localStorage
check(
  'autosalvarea nu mai scrie în dublu în localStorage',
  !html.includes('setItem("supermanager_26_27_pro2d_v2",s)') && html.includes('setItem(`sm2627_career_slot_${e}`,s)')
);
check('carierele vechi sunt migrate la pornire', html.includes('sm2627_career_slot_";let _raw=localStorage.getItem(gv)'));

// 9. Accesibilitate
check(
  'clasele de font mici sunt ridicate la minimum 12px',
  html.includes('.text-\\[8px\\],.text-\\[9px\\],.text-\\[10px\\],.text-\\[11px\\]{font-size:12px')
);
check('stratul de accesibilitate (aria-label pentru iconițe) e prezent', html.includes('id="sm-a11y-js"'));
check('mișcarea redusă e respectată', html.includes('prefers-reduced-motion:reduce'));

// 10. Offline: nicio resursă externă (fonturi, CDN, imagini)
const resurseExterne = [
  ...html.matchAll(/(?:src|href)=["'](https?:\/\/[^"']+)/g),
  ...html.matchAll(/url\(\s*["']?(https?:\/\/[^)"']+)/g),
].map((m) => m[1]);
check('nicio resursă încărcată de pe alt domeniu', resurseExterne.length === 0, resurseExterne.slice(0, 3).join(', '));

// 11. Text și flux de meci
check('nu mai apare greșeala „kamere”', !/kamere/i.test(html) && html.includes('camerele noastre'));
check(
  'meciul nu mai întrerupe jocul cu decizii',
  html.includes('_triggerTouchlineDilemma(e,t,n,s,l={}){return null}')
);
check('pauza nu mai cere corecții tactice sau dialog 1-la-1', !html.includes('Corecții Tactice pe Tablă') && !html.includes('Dialog 1-la-1 la Pauză'));
check('reacția jucătorului din știri e generată din rezultat', html.includes('Ee.unshift({id:`react-${fe}`'));

// 12. Telefonul lui Mister: oferte, nemulțumiri, consecințe pentru ignorare
check('ofertele de transfer ajung ca mesaj în telefon', html.includes('msg-offer-${n}-${o.id}') && html.includes('kind:"transfer_offer"'));
check('nemulțumirile jucătorilor ajung ca mesaj în telefon', html.includes('msg-unhappy-${n}-${q.id}') && html.includes('kind:"unhappy"'));
check('oferta se poate accepta/refuza direct din telefon', html.includes('case"off_accept"') && html.includes('"accepted_pending":k.id==="off_decline"?"declined"'));
check('răspunsul la nemulțumire aplică moral jucătorului', html.includes('case"cmp_promise"') && html.includes('case"cmp_warn"') && html.includes('case"cmp_ignore"'));
check(
  'mesajele ignorate produc consecințe reale (patron/vestiar/galerie)',
  html.includes('Ai ignorat ${_ign.length} mesaj') &&
    html.includes('boardConfidence:ke((Je.boardConfidence??64)-_brd,0,100)') &&
    html.includes('lockerCohesion:ke((Je.lockerCohesion??64)-_coh,10,100)') &&
    html.includes('fanSupport:ke((Je.fanSupport??65)-_fan,10,100)')
);
check(
  'mesajele ignorate sunt marcate expirate și taxate',
  html.includes('expired:!0,taxPaid:') && html.includes('Mesaj ignorat — te-a costat ')
);

// 13. Oferta e corelată cu valoarea ȘI cu performanța (meci + sezon)
check(
  'taxa ofertei crește cu nota din meci, golurile și randamentul sezonului',
  html.includes('_mf=Math.max(0,Math.min(.2,(u-7)*.06))') &&
    html.includes('_gf=Math.min(.15,f*.06+m*.04)') &&
    html.includes('_sf=Math.min(.2,((_sg+_sa)/_ap)*.45)') &&
    html.includes('S*.8*(1+_mf+_gf+_sf+_af)')
);
check('ofertele apar la performanță bună, nu doar la nota 8.1', html.includes('if(u<7.6&&f<1&&m<1||(a.ovr||0)<67)return null'));

// 14. Fără război psihologic / spionaj
check(
  'războiul psihologic și spionajul au fost eliminate complet',
  !html.includes('Război Psihologic') && !html.includes('Trimite scouter-spion') && !html.includes('function JA(')
);

// 15. Ferestre de decizie compacte (nu pe tot ecranul)
check(
  'fereastra de decizie e un panou compact, nu full-screen',
  html.includes('max-w-2xl rounded-2xl overflow-hidden') &&
    html.includes('max-h-[72vh]') &&
    !html.includes('max-w-4xl rounded-3xl overflow-hidden border-2')
);
check('invitația la decizie nu mai e o bandă uriașă de imagine', html.includes('relative h-24 sm:h-28 w-full overflow-hidden'));

// 16. Mai puțină repetitivitate: texte cu variante alese aleator
check(
  'reacțiile de după meci au variante multiple',
  html.includes('_win=[') && html.includes('_draw=[') && html.includes('_loss=[') && html.includes('_pool=Mt?_win:$t?_draw:_loss')
);
check('mesajele patronului au variante multiple', html.includes('f==="WIN"?[`') && html.includes('Math.random()*3'));

// 17. Finalizare: jucătorul singur șutează, nu întoarce mingea
check(
  'șutul e evaluat înaintea centrării (ocazia nu mai e furată)',
  html.indexOf('_startShotWindup(e,s,l,m+p)') > 0 &&
    html.indexOf('_startShotWindup(e,s,l,m+p)') < html.indexOf('forcedKind:"WING_CROSS"')
);
check(
  'ocazia clară primește multiplicator de șut',
  html.includes('_clear=e.pos!=="GK"&&_out>=3&&c<=36') &&
    html.includes('_boost=_clear?c<18?3.6:c<26?3:c<33?2.4:1.8:1')
);
check('centrarea e stinsă când jucătorul e singur', html.includes('Math.random()<n*_crossRate*(_clear?.35:1)'));
check('apetitul de pasă scade în ocazia clară', html.includes('Q=_clear?.35:'));
check(
  'în treimea ofensivă nu se mai pasează înapoi',
  html.includes('this._findBestPassTarget(e,t,S,B,c<=38)') && html.includes('if(nb?F<.8:s&&F<-4.5)continue;')
);
check(
  'pasa de panică (watchdog) alege doar adversari în față',
  html.includes('_fw=l.filter(k=>(k.x-s.x)*_dir>1.5),_pool=_fw.length?_fw:l')
);

// 18. Fluidență: simulare cu pas fix + calitate adaptivă în 3D
check(
  'simularea are pas fix de 8 ms și plafon de timp simulat pe cadru',
  html.includes('const _sSim=Math.min(s,.128),f=Math.max(1,Math.ceil(_sSim/.008)),m=_sSim/f;')
);
check('nu mai există bucla de 36 de substeps (spirala de lag)', !html.includes('Math.min(36,Math.ceil(s/.008))'));
check(
  'randarea 3D are guvernator de calitate (pixel ratio adaptiv)',
  html.includes('Q.__qTier') && html.includes('Q.setPixelRatio(Math.min(window.devicePixelRatio||1,_nx===0?1.35:_nx===1?1.12:1))')
);
check('randarea se oprește când tabul e ascuns', html.includes('document.hidden)return'));
check('publicul se animă mai rar pe treptele slabe de calitate', html.includes('Q.__qTier>=2?10:5'));

// 19. Texturi de jucător adaptate dispozitivului
check(
  'există o euristică de dispozitiv pentru rezoluția texturilor',
  html.includes('const _SM_SLOW=typeof navigator<"u"&&((navigator.devicePixelRatio||1)>=2.5||(navigator.hardwareConcurrency||4)<=4),_SM_TEXQ=_SM_SLOW?.5:1;')
);
check(
  'tricoul se generează la jumătate de rezoluție pe dispozitive slabe',
  html.includes('c.width=Math.round(1024*_SM_TEXQ),c.height=Math.round(512*_SM_TEXQ)') &&
    html.includes('_SM_TEXQ<1&&u.scale(_SM_TEXQ,_SM_TEXQ)')
);
check(
  'textura feței se generează la jumătate de rezoluție pe dispozitive slabe',
  html.includes('l.width=Math.round(512*_SM_TEXQ),l.height=Math.round(512*_SM_TEXQ)') &&
    html.includes('_SM_TEXQ<1&&c.scale(_SM_TEXQ,_SM_TEXQ)')
);
check(
  'anizotropia scade pe dispozitive slabe',
  html.includes('m.anisotropy=_SM_TEXQ<1?2:4') && html.includes('g.anisotropy=_SM_TEXQ<1?2:4')
);
check(
  'capul jucătorilor are mai puține segmente (18x14 în loc de 22x18)',
  html.includes('Q=d==="high"?18:12') && html.includes('new Qn(.118,Q,14)')
);

// 20. Progresia facilităților costă și durează (v10.37.8)
check(
  'costul de modernizare crește exponențial (×2, ×6, ×16)',
  html.includes('const _SM_FAC_MUL=[2,6,16]') &&
    html.includes('_smFacBase(e)*r*(_SM_FAC_LIGA[n]??1)*i/1e3)*1e3') &&
    !html.includes('Math.round(ce.baseCost*gt)')
);
check(
  'facilitățile au mentenanță lunară de 2% din investiție',
  html.includes('_SM_FAC_UPKEEP=.02') &&
    html.includes('_smFacUpkeep(H.facilities)') &&
    html.includes('Re.budget+=Ba-Ta-_upk')
);
check(
  'upgrade-ul nu mai e instant: deschide un șantier cu recepție peste 7 etape',
  html.includes('readyRound:_r,startedRound:N.currentRound||1,overrun:_p.overrun,delay:_p.delay') &&
    html.includes('..._smFacTickState(H,fe+1,Ee)')
);
check('upgrade-ul nu mai dă +3 suporteri gratuit', !html.includes('fanSupport:ke(N.fanSupport+3,10,100)'));
check('un singur șantier poate fi deschis simultan', html.includes('Ai deja un șantier deschis'));
check(
  'nivelurile 3 și 4 cer performanță în ligă (top 6 / top 3)',
  html.includes('Nivelul 3 cere acces în playoff (top 6)') &&
    html.includes('Nivelul 4 cere loc de cupe europene (top 3)') &&
    html.includes('_smFacGate(d,_L+1)')
);
check(
  'șantierele au risc: 12% depășire de buget, 8% întârziere',
  html.includes('i<.12') && html.includes('i<.2') && html.includes('Risc de șantier: 12% depășire +15%, 8% întârziere +3 etape.')
);
check(
  'schimbarea politicii de bilete costă bani și are termen de 2 luni',
  html.includes('_smTixCost(d)') &&
    html.includes('_cool>0') &&
    html.includes('ticketTransitionUntil:_cur+2') &&
    html.includes('(H.ticketTransitionUntil>=fe?.8:1)')
);
check(
  'o promisiune încălcată costă clubul 3 salarii',
  html.includes('Re.budget-=Math.round(3*((Re.players.find(')
);
check(
  'starea șantierelor e migrată în salvările vechi',
  html.includes('facilityWorks:a.facilityWorks||{}') && html.includes('facilityWorks:{},ignoreStrikes:{},ticketPolicyRound:-99')
);
check('valorile de cost sunt expuse pentru teste', html.includes('window.__smFac={cost:_smFacCost'));

// 21. Ecranul de start: descrierea arhetipului selectat (v10.37.9)
check(
  'descrierea arhetipului selectat nu mai e trunchiată la 2 rânduri',
  html.includes('${Q===L.id?"":"line-clamp-2"}')
);

// 22. Telefonul: taxe, escaladare și ceartă
check(
  'mesajele ignorate sunt taxate pe roluri (patron 80k, agent 35k, vestiar 25k, presă 15k)',
  html.includes('_SM_PHONE_TAX={patron:8e4,agent:35e3,locker:25e3,press:15e3}')
);
check(
  'taxa are plafon pe etapă și escaladare la ignorări repetate',
  html.includes('_SM_PHONE_CAP=25e4') &&
    html.includes('if(_tax>25e4)') &&
    html.includes('_SM_PHONE_MULT=[1,1.5,2.5]') &&
    html.includes('for(const mm of _ign){const role=String(mm.senderRole||"");')
);
check(
  'mesajul expirat păstrează suma taxată',
  html.includes('⌛ Expirat — taxat ') && html.includes('taxPaid:')
);
check(
  'mesajele nerezolvate arată termenul de expirare',
  html.includes('⏳ Expiră la Etapa ')
);
check(
  'mesajele expirate se arhivează după 3 etape',
  html.includes('u.expired&&_maxR-(u.roundGenerated||0)>3')
);
check(
  'persoana te ceartă când o ignori (mesaj de reproș + replică vorbită)',
  html.includes('scolding:!0') && html.includes('_smScoldText') && html.includes('mode:"event",mood:"furios"')
);
check(
  'taxele apar în știri cu suma exactă',
  html.includes('TAXE PENTRU TĂCERE')
);

// 23. Simulare în bloc (până la etapa X / tur / sezon)
check(
  'există bară de simulare cu Tur, Sezon și etapă țintă',
  html.includes('_SmBulkBar') && html.includes('children:"Tur"') && html.includes('children:"Sezon"')
);
check(
  'simularea folosește simulatorul de rezultate cu bonus numeric',
  html.includes('_r=Pl(_h,_a,_h.id===d.userClubId?vt():0') && !html.includes('{bonus:vt()}')
);
check(
  'în simulare deciziile sunt rezolvate neutru (fără taxe, fără bonusuri)',
  html.includes('_smBulkActive){const _bm=') && html.includes('fără bonus, fără penalizare')
);
check(
  'simularea raportează rezultatele în știri',
  html.includes('SIMULARE ETAPE ') && html.includes('Simulare Rapidă')
);
check(
  'simularea oprește evenimentele și modalurile în timpul rulării',
  html.includes('if(!_smBulkActive&&Math.random()<No){') && html.includes('return _smBulkActive||setTimeout(()=>{Se({oldClubName:Re.name')
);

// 24. Biblioteca de fețe generate + avatarul cinematic (v10.41.0)
const faceTable = [...html.matchAll(/\["(faces\/gen-[0-9]+\.webp)","([a-z_|]+)","([a-z_]+)","([ypv])"\]/g)];
check('biblioteca are toate cele 80 de fețe generate', faceTable.length === 80, `${faceTable.length} fețe`);
const library = JSON.parse(fs.readFileSync(path.join(__dirname, 'face-library.json'), 'utf8'));
const shippedIdx = faceTable.map((m) => Number(m[1].match(/gen-(\d+)/)[1])).sort((a, b) => a - b);
const missingIdx = library.map((_, i) => i + 1).filter((i) => !shippedIdx.includes(i));
check('fiecare specificație din face-library.json are o față livrată', library.length === 80 && missingIdx.length === 0,
  missingIdx.length ? `lipsesc ${missingIdx.slice(0, 6).join(', ')}` : `${library.length} specificații`);
const tagMismatch = faceTable.filter((m) => {
  const i = Number(m[1].match(/gen-(\d+)/)[1]);
  const spec = library[i - 1];
  return !spec || !m[2].split('|').includes(spec.skin) || m[3] !== spec.hairColor;
}).map((m) => m[1]);
check('etichetele de ten și păr respectă specificația', tagMismatch.length === 0, tagMismatch.slice(0, 3).join(', '));
const faceMissing = faceTable.filter((m) => !assetKeys.has(m[1]));
check('fiecare față generată are asset în bundle', faceMissing.length === 0, faceMissing.slice(0, 3).map((m) => m[1]).join(', '));
const faceBytes = faceTable.map((m) => {
  const re = new RegExp('"' + m[1].replace(/\//g, '\\/') + '":"data:image\\/webp;base64,([A-Za-z0-9+/=]+)"');
  const hit = html.match(re);
  return hit ? Math.round(hit[1].length * 0.75) : 0;
});
const maxFace = Math.max(...faceBytes, 0);
check('fiecare față generată e sub 18 KB', maxFace > 0 && maxFace <= 18432, `max ${Math.round(maxFace / 1024)} KB`);
check('fețele sunt WebP, nu JPEG sau PNG', /"faces\/gen-01\.webp":"data:image\/webp;base64,/.test(html));
const skinClasses = ['fair', 'olive', 'tan', 'amber', 'brown', 'dark_brown', 'ebony', 'east_asian'];
const coveredSkins = new Set(faceTable.flatMap((m) => m[2].split('|')));
const fullLibrary = faceTable.length >= 80;
check('biblioteca acoperă toate tenurile din joc', !fullLibrary || skinClasses.every((k) => coveredSkins.has(k)), `${faceTable.length} fețe: ${[...coveredSkins].join(', ')}`);
check('fotografia reală are întâietate în componenta de jucător', html.includes('const _fg=_smFaceFor(a);') && html.includes(',m&&!g){'));
check('avatarul e desenat cu gradiente și umbre, nu plat', html.includes('function _smAvatarSvg(a,e){') && html.includes('feGaussianBlur stdDeviation="2"') && html.includes('radialGradient id="k${U}"'));
// 25. Portretele foto ale antrenorului (galeria de 24)
const coachIds = (html.match(/const _SM_COACHES=\[((?:"coach-\d{2}",?)+)\]/) || [])[1];
const coachList = coachIds ? coachIds.match(/coach-\d{2}/g) : [];
const coachLibrary = JSON.parse(fs.readFileSync(path.join(__dirname, 'coach-library.json'), 'utf8'));
check('lista de portrete are exact 24 de intrări', coachList.length === 24, `${coachList.length}`);
check('specificația antrenorilor are 24 de intrări', coachLibrary.length === 24, `${coachLibrary.length}`);
check('portretele sunt numerotate 01–24, fără goluri',
  coachList.every((id, i) => id === `coach-${String(i + 1).padStart(2, '0')}`), coachList.join(','));
const coachAssets = coachList.map((id) => {
  const uri = assetKeys.has(`coach/${id}.webp`) ? html.match(new RegExp(`"coach/${id}\\.webp":"(data:image\\/webp;base64,[A-Za-z0-9+/=]+)"`)) : null;
  return { id, bytes: uri ? Math.round(uri[1].length * 0.75) : 0 };
});
const shipped = coachAssets.filter((a) => a.bytes > 0);
check('toate cele 24 de portrete sunt livrate în bundle', shipped.length === 24, `${shipped.length}/24`);
check('portretele livrate sunt WebP încorporat, fără cereri externe', shipped.every((a) => a.bytes > 1500), `${shipped.length}/${coachAssets.length}`);
check('fiecare portret e sub 18 KB', shipped.every((a) => a.bytes <= 18432),
  shipped.length ? `max ${Math.round(Math.max(...shipped.map((a) => a.bytes)) / 1024)} KB` : 'niciunul');
check('portretul se rezolvă din avatarul salvat, altfel determinist din nume',
  html.includes('function _smCoachId(a){') && html.includes('photoId') && html.includes('%_SM_COACHES.length'));
check('portretul se schimbă doar din Profil', html.includes('Schimbă portretul') && !html.includes('Portretul Tău de Antrenor'));
check('salvările vechi cu portret ales sunt marcate ca „folosit"', html.includes('photoMigrated:!0'));
check('lotul are filtre rapide (contract, morală, indisponibili, juniori)',
  html.includes('function _smRosterView(a,e){') && html.includes('data-sm-flag') &&
    html.includes('Contract < 1 an') && html.includes('Morală < 60') && html.includes('Indisponibili'));
check('lotul se poate sorta pe șase criterii',
  html.includes('const _SM_ROSTER_SORTS=') &&
    ['ovr', 'age', 'value', 'salary', 'minutes', 'name'].every((k) => html.includes(`${k}:(a,b)=>`)));
check('lotul arată contorul „arată X din Y" și buton de reset',
  html.includes('data-sm-count') && html.includes('" din "') && html.includes('Resetează'));
check('starea antrenorului e derivată din consiliu, stres și rezultate',
  html.includes('function _smCoachMood(a){') && html.includes('label:"Tensionat"') && html.includes('label:"Încrezător"'));
check('fiecare club are un antrenor stabil (foto reală sau galerie)',
  html.includes('function _smClubCoachId(a){') && html.includes('function _smClubCoachSrc(a){'));
check('portretul se poate schimba o singură dată',
  html.includes('photoChangeUsed') && html.includes('Portret blocat') && html.includes('singura schimbare de portret'));
check('onboarding-ul nu mai are pas de alegere a portretului',
  !html.includes('_smSP') && !html.includes('avatar:{photoId:'));
check('zoom la hover: panoul de mărire e prezent pentru orice fotografie',
  html.includes('id="sm-zoom-js"') && html.includes('sm-zoom-panel') && html.includes('mouseover'));
check('zoom-ul găsește poza și de sub stratul decorativ (jucători fără fotografie)',
  html.includes('function resolveImg(t){') && html.includes('function directImg(el){') &&
    html.includes('var up = directImg(t.parentElement);'));
check('zoom-ul funcționează și pe touch (apăsare lungă)',
  html.includes('"touchstart"') && html.includes('"touchend"') && html.includes('"touchmove"') && html.includes('380'));
check('click pe o fotografie deschide un poster mărit, închis cu Escape',
  html.includes('sm-photo-modal') && html.includes('sm-photo-caption') && html.includes('Escape'));
check('posterul nu se deschide pentru pozele din butoane (nu fură click-ul)',
  html.includes('function inControl(el){') && html.includes('button,a,[role=button],label,select'));
check('sloturile de salvare afișează portretul antrenorului',
  html.includes('data-sm-slot-photo') && html.includes('coachId:_smCoachId({manager:n.manager||{}})'));
check('mișcarea redusă e respectată', html.includes('prefers-reduced-motion:reduce'));

// --- 3D: umbre reale (v10.49) -------------------------------------------
check('3D: harta de umbre folosește PCFShadowMap (soft a fost scos din three)',
  html.includes('Q.shadowMap.type=1') && !html.includes('shadowMap.type=2'));
check('3D: lumina principală proiectează umbră pe gazon',
  html.includes('oe.castShadow=!0') && html.includes('oe.shadow.mapSize.set(2048,2048)') &&
    html.includes('oe.shadow.normalBias=.022'));
check('3D: umbra luminii acoperă tot terenul (115×76)',
  html.includes('oe.shadow.camera.left=-78,oe.shadow.camera.right=78') &&
    html.includes('oe.shadow.camera.top=58,oe.shadow.camera.bottom=-58'));
check('3D: jucătorii și arbitrii aruncă umbră',
  html.includes('_cs.isMesh&&_cs!==qa.groundShadow&&(_cs.castShadow=!0)') &&
    html.includes('[ee,ve,pe].forEach'));
check('3D: blob-ul de contact apare doar când umbrele reale sunt oprite',
  html.includes('_t.groundShadow&&(_t.groundShadow.visible=!Q.shadowMap.enabled)'));
check('3D: doar jucătorii aruncă umbră, nu tribunele (fără bandă neagră pe gazon)',
  html.includes('l.traverse(_ss=>{_ss.isMesh&&(_ss.castShadow=!1)})'));
check('3D: umbrele se aprind doar când GPU-ul are rezervă (histerezis pe guvernator)',
  html.includes('const _shOn=Q.shadowMap.enabled?_avg<19.5:') && html.includes('_avg<14.5&&_nx===0') &&
    html.includes('_smm.needsUpdate=!0'));
check('3D: umbrele pornesc oprite pe dispozitivele slabe (același _SM_SLOW)',
  html.includes('Q.shadowMap.enabled=!(_SM_SLOW||(navigator.hardwareConcurrency||8)<6)'));
check('3D: portarul nu mai referențiează o variabilă inexistentă la tacticalOffset',
  !html.includes('D=side==="home"?xe(D+(p.tacticalOffsetX') &&
    html.includes('D=p.side==="home"?xe(D+(p.tacticalOffsetX'));

// --- Reluarea golului (v10.50) --------------------------------------------
check('reluare: motorul înregistrează fazele pentru reluare',
  html.includes('_recordReplayFrame(e,t){') && html.includes('this._replayBuf||(this._replayBuf=[])'));
check('reluare: pornește la gol și prelungește sărbătoarea cât să încapă',
  html.includes('this._startReplay(),this.phase="GOAL_CELEBRATION"') &&
    html.includes('this.phaseTimer=Math.max(2.45,(this._replay?.delay||0)+(this._replay?.dur||0)+.4)'));
check('reluare: snapshot-ul expune starea (badge + viteză + progres), oprită în pauză',
  html.includes('replay:this.replayActive&&this.phase!=="HALFTIME"') && html.includes('speed:this._replay?.speed||.7'));
check('reluare: badge REPLAY peste teren, pentru 2D și 3D',
  html.includes('"data-sm-replay":"1"') && html.includes('pointer-events-none absolute left-1/2 top-3'));
check('reluare: 3D nu rulează animația de sărbătoare în timpul reluării',
  html.includes('ht.phase==="GOAL_CELEBRATION"&&!ht.replay?.active'));
check('reluare: nu supraviețuiește pauzei sau fluierului final',
  html.includes('this._replay=null,this.replayActive=!1;return'));

// --- Antrenori cu chip real (v10.50) --------------------------------------
check('antrenori: numele reale sunt în bundle pentru toate cele 24 de cluburi',
  html.includes('const _SM_COACH_NAMES={') && (html.match(/"[a-z]+":"[^"]+"/g) || []).length > 20 &&
    html.includes('"fcsb":"Laurențiu Reghecampf"'));
check('antrenori: chipul real are prioritate, cu fallback pe galeria de 24',
  html.includes('function _smClubCoachSrc(a){') && html.includes('"coach/club/"+String(a||"")+".webp"') &&
    html.includes('return _smCoachSrc(_smClubCoachId(a))'));
check('antrenori: fotografiile reale sunt încorporate ca WebP în __SM_ASSETS__',
  (html.match(/"coach\/club\/[a-z]+\.webp":"data:image\/webp;base64,/g) || []).length >= 24);
check('clasament: fără fotografii de antrenor, numele rămâne în titlul clubului',
  !html.includes('src:_smClubCoachSrc(w.clubId)') &&
    html.includes('title:_smClubCoachName(w.clubId)?"Antrenor: "+_smClubCoachName(w.clubId):void 0') &&
    html.includes('"data-sm-standings":"dashboard"') && html.includes('"data-sm-standings":"league"'));
check('antrenori: funcțiile sunt expuse pentru teste', html.includes('clubCoachSrc:a=>_smClubCoachSrc(a)'));

// --- Valul 2, restul (v10.53) ---------------------------------------------
check('prim control: eroarea depinde de tehnică și de viteza pasei',
  html.includes('_firstTouch(e,t){') && html.includes('.05+(t-17)*.007-(n-70)*.0035') &&
    html.includes('p.cooldown=this._firstTouch(p,_ftSp)'));
check('lovitura liberă: barajul poate bloca șutul (probabilitate redusă)',
  html.includes('const _freeKick=n.source==="FREE_KICK"') &&
    html.includes('v<(_freeKick?1.05:1.38)') && html.includes('*(_freeKick?.55:1)'));
check('vignetă discretă peste teren, în 2D și 3D',
  html.includes('"data-sm-vignette":"1"') && html.includes('radial-gradient(ellipse at center'));

check('legea avantajului: arbitrul lasă jocul să continue când mingea ajunge la un coechipier',
  html.includes('_advMate&&t.x*_advDir>58&&Math.random()<.45') && html.includes('▶️ AVANTAJ'));

// --- Valul 2: un-doi, urme de ghete, bloom (v10.54) ------------------------
check('un-doi: se armează doar la pase scurte, pe pământ, înainte',
  html.includes('_maybeArmOneTwo(e,l){const _ok=this.activePass;') &&
    html.includes('if(_ok.kind!=="GROUND"&&_ok.kind!=="THROUGH")return;') &&
    html.includes('if((_ok.peakZ||0)>.4)return;') &&
    html.includes('if((l.x-e.x)*_od<-5)return;'));
check('un-doi: probabilitatea crește cu pasa bună și cu spațiul din față',
  html.includes('const _osk=xe(((e.pas||68)-55)/45,.1,.9)') &&
    html.includes('_och=.42+_osk*.3+_osp*.26'));
check('un-doi: returul are garduri (alergare, distanță, culoar, offside)',
  html.includes('_oneTwoReturn(e,_fromId){') &&
    html.includes('if((mate.x-o.fromX)*_od<.8)return!1;') &&
    html.includes('if(_tq>.08&&_tq<.92&&ya(_oq.x,_oq.y,e.x+_lax*_tq,e.y+_lay*_tq)<1.45)return!1') &&
    html.includes('this._oneTwoLockMin=this.minute+1.6'));
check('un-doi: alergătorul pornește înainte, dar rămâne onside',
  html.includes('_otLim=p.side==="home"?this.offsideLines.awayDefX-.4') &&
    html.includes('this._oneTwo&&this._oneTwo.passerId===p.id&&this._oneTwo.side===p.side&&this.minute<=this._oneTwo.until'));
check('un-doi: returul e o pasă în alergare, nu un dribling (momentum + relatare)',
  html.includes('forcedKind:"GROUND"},this._getEffectiveTactics(e.side)') &&
    html.includes('🔄 Un-doi perfect:') && html.includes('this._addMomentum(e.side,3)'));

check('gazon: urmele de ghete se acumulează pe un strat separat, deasupra ierbii',
  html.includes('let _SW_ON=!1,_SW_TEX=null,_SW_CTX=null') &&
    html.includes('new mn({map:_tex,transparent:!0,depthWrite:!1,opacity:.92})') &&
    html.includes('_mesh.rotation.x=-Math.PI/2,_mesh.position.y=.006'));
check('gazon: urmele se copiază pe hartă la 8 px/m, din coordonatele reale',
  html.includes('_SW_MX=_SW_W/115,_SW_MY=_SW_H/76') &&
    html.includes('const cn=(Et.x+5)*_SW_MX,qa=(Et.y+4)*_SW_MY;'));
check('gazon: alergarea lasă urme, alunecarea lasă dâre, ploaia le întunecă',
  html.includes('ht<2.7)return;') && html.includes('Et.kickAnim.kind==="SLIDE_TACKLE"') &&
    html.includes('_SW_HEAVY=He==="rain"?1.55:He==="snow"?1.25:1'));
check('gazon: stratul se estompează lent și se reîncarcă rar în GPU',
  html.includes('_SW_CTX.globalCompositeOperation="destination-out"') &&
    html.includes('if(_SW_UP>.45){_SW_UP=0,_SW_TEX.needsUpdate=!0}'));
check('gazon: urmele se opresc pe dispozitivele slabe sau la cerere',
  html.includes('window.__SM_BOOTMARKS===!1'));

check('bloom: lanț de post-procesare propriu, fără EffectComposer',
  html.includes('function _smBloomChain(renderer,scene,camera,w,h){') &&
    html.includes('const composer={render:_run,setSize:') && html.includes('ae=_smBloomChain(Q,Z,le,z,W)'));
check('bloom: bright-pass + blur separabil 5 taps, la sfert de rezoluție',
  html.includes('float w=smoothstep(uThreshold,uThreshold+uKnee,l);') &&
    html.includes('0.2270270270') && html.includes('const _q=Math.max(.18,.26);'));
check('bloom: compunerea reface exact ACES + sRGB, deci culorile nu se schimbă',
  html.includes('vec3 _smRRT(vec3 v)') && html.includes('c*=uExposure/0.6;') &&
    html.includes('pow(c,vec3(0.41666))*1.055-0.055'));
check('bloom: se oprește pe dispozitivele slabe, cu randare directă ca plasă de siguranță',
  html.includes('if(!_SM_SLOW&&!(typeof window!=="undefined"&&window.__SM_BLOOM===!1))') &&
    html.includes('ae?.composer?(ae.lensPass?.uniforms?.uTime&&') &&
    html.includes('try{ae?.composer?.dispose?.()}catch{}'));

// --- Layout pe telefon: pagina umple ecranul (v10.54.1) --------------------
check('viewport: zoom-out blocat, ca pagina să nu mai fie micșorată ca să încapă',
  html.includes('name="viewport"') && html.includes('width=device-width,initial-scale=1,minimum-scale=1') &&
    html.includes('viewport-fit=cover') && !html.includes('user-scalable=no'));
check('viewport: zoom-in rămâne permis (accesibilitate, maximum-scale=5)',
  html.includes('maximum-scale=5'));
check('3D: _avg trăiește la nivelul buclei de randare (altfel ReferenceError la fiecare cadru)',
  html.includes('let _avg=0;') && html.includes('if(ln._c>=24){_avg=ln._s/ln._c*1e3;') &&
    !html.includes('const _avg=ln._s'));
check('3D: plasă de siguranță pe timp — fără niciun cadru valid în 2,6 s, meciul trece pe 2D',
  html.includes('let _sm3DSeen=!1;') && html.includes('const _smGuard=setTimeout(()=>{if(!_sm3DSeen)') &&
    html.includes('clearTimeout(_smGuard),'));
check('3D: canvasul umple caseta terenului prin containerul dedicat .sm-3d-mount',
  html.includes('.sm-3d-mount{position:absolute;inset:0;width:100%;height:100%}') &&
    html.includes('className:"sm-3d-mount"') && html.includes('className:"sm-3d-shell"'));
check('3D: nicio regulă pe copiii shell-ului 3D (ar umfla HUD-ul: minimap, presete cameră, telemetrie)',
  !/\.sm-3d-shell\s*>\s*div/.test(html));
check('3D: HUD-ul din meci își păstrează stilurile proprii (fără width/height forțat)',
  html.includes('className:"hidden sm:block",children:r.jsx("canvas",{ref:y,width:158,height:100') &&
    !/\.sm-3d-(shell|mount)\s*\{[^}]*pointer-events/.test(html));
check('3D: bloom verifică suportul pentru color-buffer float înainte de a porni',
  html.includes(`if(_gl2){try{const _ex=renderer.extensions;if(_ex&&!_ex.has("EXT_color_buffer_half_float")&&!_ex.has("EXT_color_buffer_float"))return null}catch(_e){}}`));
check('3D: fiecare render target de bloom e verificat cu checkFramebufferStatus (altfel ecran negru)',
  html.includes('checkFramebufferStatus(_g.FRAMEBUFFER)') &&
    html.includes('if(![_rtSt(rtScene),_rtSt(rtBright),_rtSt(rtA),_rtSt(rtB)].every(Boolean))'));
check('3D: dacă imaginea iese neagră, meciul trece automat pe 2D (nu rămâne ecran gol)',
  html.includes('const _smPitchProbe=') && html.includes('_smPitchProbe(Q,V)') &&
    html.includes('typeof _onFail==="function"&&_onFail()'));

const inlineCss = (html.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('\n');
check('scroll: html/body/#root nu au overflow ascuns (ar bloca derularea pe telefon)',
  !/(^|[},])\s*(html|body|#root)\s*\{[^}]*overflow(-[xy])?\s*:\s*hidden/.test(inlineCss));
check('scroll: #root nu e forțat la flex/înălțime fixă (conținutul lung trebuie să curgă)',
  !/(^|[},])\s*#root\s*\{[^}]*(display\s*:\s*flex|height\s*:|min-height\s*:)/.test(inlineCss));
check('layout: conținutul principal are min-w-0 și nu poate împinge pagina',
  html.includes('sm-main-stage max-w-7xl w-full mx-auto px-4 py-5 flex-1 min-w-0'));
check('header: bara de butoane se împachetează în loc să iasă din ecran',
  html.includes('.sm-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:.375rem;min-width:0;max-width:100%}') &&
    html.includes('r.jsxs("div",{className:"sm-toolbar text-xs"') &&
    html.includes('.sm-command-header>div{min-width:0}'));

const htmlBytes = Buffer.byteLength(html, 'utf8');
check('bundle-ul rămâne sub 7,5 MB', htmlBytes < 7.5 * 1024 * 1024, `${(htmlBytes / 1048576).toFixed(2)} MB`);

const ok = results.filter((r) => r.ok).length;
console.log(`${ok}/${results.length} verificări de date OK`);
process.exit(ok === results.length ? 0 : 1);
