import test from 'node:test';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import assert from 'node:assert/strict';
test('built UI supports aliased imports and async modules without JavaScript syntax errors',()=>{
  const html=readFileSync('integration/game.html','utf8'),scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length);for(const [,code] of scripts)assert.doesNotThrow(()=>new Script(code));
  assert.doesNotThrow(()=>new Script(readFileSync('tampermonkey/ercedia-rpg.user.js','utf8')));
});
