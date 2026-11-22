// Scenariile care testează alte mecanici pornesc după Supercupă, disputată prin interfața reală.
const assert=require('node:assert/strict');
module.exports=async function resolveSupercup(app){
 const key='sm2627_career_slot_1',end=Date.now()+15000;
 while(Date.now()<end&&!app.window.localStorage.getItem(key))await app.sleep(100);
 let state=JSON.parse(app.window.localStorage.getItem(key)||'null');
 assert(state,'salvarea inițială');
 if(!state.supercupa?.scheduledDate||state.supercupa.played)return;
 assert(app.click(/Cupe, Europa/),'navigare Supercupă');
 const until=Date.now()+10000;let button;
 while(Date.now()<until){button=[...app.document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Simulează');if(button&&!button.disabled)break;await app.sleep(100)}
 assert(button&&!button.disabled,'simulare Supercupă');button.click();
 while(Date.now()<until){state=JSON.parse(app.window.localStorage.getItem(key)||'null');if(state?.supercupa?.played)break;await app.sleep(100)}
 assert(state.supercupa.played,'Supercupă disputată');assert(app.click(/Centru Comandă/),'revenire dashboard');await app.sleep(200);
};
