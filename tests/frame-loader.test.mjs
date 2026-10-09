import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../integration/frame-loader.js',import.meta.url),'utf8');
function shell(){let receive,writes=[];const parent={postMessage(){}},window={addEventListener(type,handler){receive=handler;}},document={open(){},write(html){writes.push(html);},close(){}};vm.runInNewContext(source,{URLSearchParams,location:{hash:'#token=ok&conversation=c1'},parent,window,document});return {writes,send(payload,overrides={}){receive({source:parent,origin:'https://chatgpt.com',data:{channel:'ercedia',token:'ok',type:'boot',payload},...overrides});}};}
test('authenticated UI plus existing saves can exceed the old 2M boot limit',()=>{const h=shell(),payload='x'.repeat(2100000);h.send(payload);assert.equal(h.writes.length,1);assert.equal(h.writes[0],payload);h.send(payload);assert.equal(h.writes.length,1);});
test('larger save support preserves source, origin, token and maximum-size validation',()=>{const h=shell();h.send('x',{origin:'https://example.com'});h.send('x',{source:{}});h.send('x',{data:{channel:'ercedia',token:'wrong',type:'boot',payload:'x'}});h.send('x'.repeat(8000001));assert.equal(h.writes.length,0);h.send('valid');assert.deepEqual(h.writes,['valid']);});
