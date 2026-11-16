/** Fluxurile reale de dialog: vorbitor, replici și alegere pe orizontală. */
const assert = require('node:assert/strict');
const {launch} = require('./dom-harness');
(async () => {
  const app = await launch();
  try {
    assert(app.click(/Semnează Contractul/));
    assert(await app.waitFor(/Situație în Club/,10000));
    assert(app.click(/Situație în Club/));
    await app.sleep(100);
    let speaker=app.document.querySelector('[data-sm-vn-speaker]');
    assert(speaker && /Vorbește/.test(speaker.textContent));
    assert(speaker.querySelector('.sm-vn-speaker-name').textContent.trim());
    const initialName=speaker.querySelector('.sm-vn-speaker-name').textContent;
    for(let i=0;i<15&&!app.document.querySelector('[data-sm-vn-choices]');i++){
      const next=[...app.document.querySelectorAll('button')].find(b=>/Afișează tot|Continuă dialogul/.test(b.textContent));
      assert(next,'continuarea scenei rămâne accesibilă'); next.click(); await app.sleep(80);
      speaker=app.document.querySelector('[data-sm-vn-speaker]');
      assert(speaker.querySelector('.sm-vn-speaker-name').textContent.trim());
    }
    const choices=app.document.querySelector('[data-sm-vn-choices]');
    assert(choices&&choices.getAttribute('role')==='group');
    assert(choices.getAttribute('aria-label').includes('orizontal'));
    const buttons=[...choices.querySelectorAll('[data-sm-vn-choice]')];
    assert(buttons.length>=2&&buttons.every(b=>b.textContent.trim()));
    assert(choices.classList.contains('sm-vn-choices'));
    assert(speaker.isConnected && speaker.closest('.sm-vn-shell') === choices.closest('.sm-vn-shell'));
    const choice=buttons.find(b=>!b.disabled); assert(choice); choice.click(); await app.sleep(150);
    assert.match(app.document.querySelector('[data-sm-vn-speaker]').textContent,/Rezultatul deciziei/);
    assert(app.click(/Înregistrează Consecințele/)); await app.sleep(100);
    assert(!app.document.querySelector('[data-sm-vn-speaker]'));
    assert(app.click(/Conferință Presă/)); await app.sleep(100);
    assert(app.document.querySelector('[data-sm-vn-speaker]'));
    assert.deepEqual(app.errors,[]);
    console.log(`  ✓ dialog eveniment și conferință: interlocutor (${initialName}), decizii și consecințe`);
  } finally {app.close()}
})().then(()=>process.exit(0),e=>{console.error(e);process.exit(1)});
