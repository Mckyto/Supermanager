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
