#!/usr/bin/env node
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('public/index.html', 'utf8');
function between(a,b) { const start=html.indexOf(a),end=html.indexOf(b,start); assert(start>=0&&end>start); return html.slice(start,end); }
const code = between('const RA=[','function TA(') + '\n' + between('function hr(', 'const yh=') + '\nthis.api={_smFeeBounds,_smBuyerFits,_smWageMax,_smCounter,EA,hr};';
const ctx = {}; vm.runInNewContext(code, ctx); const { _smFeeBounds:bounds,_smBuyerFits:fits,_smWageMax:wageMax,_smCounter:counter,EA,hr }=ctx.api;
const p={id:'udrea',name:'Udrea',pos:'GK',ovr:66,value:500000,wage:5000,age:25};
const club=(id,reputation,ovr,budget=10000000)=>({id,reputation,budget,players:[{pos:'GK',ovr}]});
let count=0;function check(name,fn){fn();count++;console.log('  ✓ '+name)}
check('limite exacte 75–150% și valori invalide',()=>{assert.equal(bounds(p).min,375000);assert.equal(bounds(p).max,750000);assert.equal(bounds({value:0}),null);assert.equal(bounds({value:Infinity}),null)});
check('Real nu cumpără un portar de 66, clubul mai slab poate',()=>{assert.equal(fits(p,club('real',94,90,200000000)),false);assert.equal(fits(p,club('liga',65,70)),true)});
check('bugetul zero, lotul plin și diferența mare la post blochează oferta',()=>{assert.equal(fits(p,club('zero',65,70,0)),false);assert.equal(fits(p,{...club('full',65,70),players:Array(30).fill({pos:'ST',ovr:66})}),false);assert.equal(fits(p,club('keeper',65,85)),false)});
check('contraoferta merge spre mijloc și respectă bugetul',()=>{assert.equal(counter(400000,600000,1000000),500000);assert.equal(counter(400000,600000,450000),450000)});
check('salariul maxim este raportat la jucător și nu acceptă milioane arbitrare',()=>{assert(wageMax(p)<9999999);assert(wageMax(p,30000)>=30000)});
check('oferta automată este realistă și în limite',()=>{const player={...p,ovr:70};const offer=EA({player,report:{matchRating:8,goals:1},userClub:{id:'user'},clubs:[club('real',94,90,200000000),club('liga',65,70)],round:1});assert(offer);assert.equal(offer.buyerClubId,'liga');assert(offer.fee>=bounds(player).min&&offer.fee<=bounds(player).max)});
check('vârste reale la începutul sezonului 2026/27, fără U21 fals',()=>{const a=hr('test','test',80,['David de Gea','Marc-André ter Stegen']);assert.equal(a[0].age,35);assert.equal(a[1].age,34);assert.equal(a[0].isU21,false);assert.equal(a[1].isU21,false)});
check('gardă și pentru oferte vechi, vânzări și prelungiri',()=>{assert(html.includes('N.fee<_bounds.min||N.fee>_bounds.max'));assert(html.includes('k<bounds.min||k>bounds.max||!_smBuyerFits(J,H)'));assert(html.includes('k>_smWageMax(L,K1('));assert(!html.includes('Salariul acceptat de jucător (€/lună)'))});
console.log(`${count}/${count} verificări transferuri OK`);
