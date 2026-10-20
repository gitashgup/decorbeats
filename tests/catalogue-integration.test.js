import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('catalogue render requires a live session matching the verified admin identity',()=>{
  const source=fs.readFileSync(new URL('../src/capture/CaptureApp.jsx',import.meta.url),'utf8');
  assert.match(source,/queue === 'catalogue' && allowed && session\?\.user\?\.id && allowedUserId === session\.user\.id/);
  assert.match(source,/setAllowed\(false\);setAllowedUserId\(null\)/);
  assert.match(source,/setAllowedUserId\(session\.user\.id\);setAllowed\(true\)/);
});
test('catalogue-only modules never import inventory RPC, public upload or AI tools',()=>{
  for(const file of fs.readdirSync(new URL('../src/capture/catalogue/',import.meta.url)).filter(f=>/\.(jsx?|css)$/.test(f))){
    const source=fs.readFileSync(new URL('../src/capture/catalogue/'+file,import.meta.url),'utf8');
    assert.doesNotMatch(source,/from ['"].*(?:supabase|media|photoEnhancer|amazonImporter)['"]|\.rpc\(|\.from\(['"]products|auto-enrich-product|generate-product-listing/);
  }
});
test('review entrypoint is explicitly DEV-only; deployed admin uses the real auth gate',()=>{
 const source=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');assert.match(source,/catalogueReview = import\.meta\.env\.DEV &&/);
});
