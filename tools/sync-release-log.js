// Embed the checked-in release data in the single-file offline game.
const fs=require('node:fs');
const path='public/index.html',entries=JSON.parse(fs.readFileSync('docs/istoric-versiuni.json','utf8'));
function encode(value){return '"'+Array.from({length:value.length},(_,i)=>'\\u'+value.charCodeAt(i).toString(16).padStart(4,'0')).join('')+'"'}
const payload='['+entries.map(item=>'{'+Object.entries(item).map(([key,value])=>JSON.stringify(key)+':'+encode(value)).join(',')+'}').join(',')+']';
const html=fs.readFileSync(path,'utf8'),pattern=/(<script id="sm-release-data" type="application\/json">)[\s\S]*?(<\/script>)/g,matches=[...html.matchAll(pattern)];if(matches.length!==1)throw new Error('Expected exactly one embedded release log');fs.writeFileSync(path,html.replace(pattern,(_match,start,end)=>start+payload+end));
