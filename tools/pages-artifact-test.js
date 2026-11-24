const assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'pages-test-'));
try{
 fs.writeFileSync(path.join(tmp,'gh'),`#!/bin/bash\ncount=0; [[ -f "$COUNT" ]] && count=$(cat "$COUNT"); count=$((count+1)); echo "$count" > "$COUNT"\ncase "$MODE" in delayed) [[ $count -lt 3 ]] && exit 1; echo 42;; mismatch) echo 99;; duplicate) printf '42\\n99\\n';; success) echo 42;; esac\n`);fs.writeFileSync(path.join(tmp,'sleep'),'#!/bin/sh\nexit 0\n');fs.chmodSync(path.join(tmp,'gh'),0o755);fs.chmodSync(path.join(tmp,'sleep'),0o755);
 function run(mode,id='42'){const count=path.join(tmp,'count');try{fs.unlinkSync(count)}catch{}const result=spawnSync('bash',['tools/wait-pages-artifact.sh'],{encoding:'utf8',env:{...process.env,PATH:tmp+':'+process.env.PATH,GITHUB_REPOSITORY:'owner/repo',GITHUB_RUN_ID:'123',ARTIFACT_ID:id,COUNT:count,MODE:mode}});return {result,count:fs.existsSync(count)?Number(fs.readFileSync(count)):0}}
 let x=run('delayed');assert.equal(x.result.status,0);assert.equal(x.count,3);x=run('success');assert.equal(x.result.status,0);assert.equal(x.count,1);for(const mode of ['mismatch','duplicate']){x=run(mode);assert.equal(x.result.status,1);assert.equal(x.count,12)}x=run('success','bad');assert.equal(x.result.status,1);assert.equal(x.count,0);
 console.log('  ✓ Pages așteaptă artefactul corect, unic, și eșuează după limita de timp');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
