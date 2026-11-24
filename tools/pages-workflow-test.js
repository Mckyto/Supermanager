const assert=require('node:assert/strict'),fs=require('node:fs');
const yaml=fs.readFileSync('.github/workflows/deploy-pages.yml','utf8');
const build=yaml.match(/^  build:\n([\s\S]*?)(?=^  deploy:\n)/m)?.[1],deploy=yaml.match(/^  deploy:\n([\s\S]*)/m)?.[1];
assert(build&&deploy,'build și deploy trebuie să fie joburi separate');
assert.match(build,/run: npm run test:quick/);assert.match(build,/uses: actions\/upload-pages-artifact@v5[\s\S]*?path: public/);assert.doesNotMatch(build,/actions\/deploy-pages/);
assert.match(deploy,/^    needs: build$/m);assert.match(deploy,/^    environment:\n      name: github-pages/m);assert.match(deploy,/id: deployment\n        uses: actions\/deploy-pages@v5/);assert.match(deploy,/PAGE_URL: \$\{\{ steps\.deployment\.outputs\.page_url \}\}/);assert.match(deploy,/grep -qi "SUPERMANAGER 26\/27"/);assert.doesNotMatch(deploy,/actions\/upload-pages-artifact/);
assert.match(yaml,/^  pages: write$/m);assert.match(yaml,/^  id-token: write$/m);assert.match(yaml,/^  group: pages$/m);console.log('  ✓ Pages separă pregătirea artefactului de deploy și verifică site-ul publicat');
