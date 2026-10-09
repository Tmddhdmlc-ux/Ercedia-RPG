import test from 'node:test';
import assert from 'node:assert/strict';
import {attachCampaignSettings} from '../web/settings-attachment.js';
import {campaignSettingsAttachment} from '../web/campaign-settings.js';
test('full settings travel in a file while the composer receives a bounded bootstrap request',()=>{
  const snapshot={sha:'a'.repeat(40),paths:['BOOTSTRAP.md'],files:{'BOOTSTRAP.md':'source rules '.repeat(10000)}},a=campaignSettingsAttachment(snapshot);
  assert.ok(a.instruction.length<1500);assert.ok(a.file.content.length>100000);assert.ok(a.instruction.includes('settings_loaded'));assert.ok(a.file.name.endsWith('.txt'));
});
test('attachment without an available public file input fails before sending the request',async()=>{
  await assert.rejects(()=>attachCampaignSettings({name:'ercedia-settings-'+ 'a'.repeat(40)+'.txt',content:'test'},{roots:()=>[{querySelectorAll:()=>[]}],isCurrent:()=>true,wait:async()=>{}}),/파일 입력창/);
  await assert.rejects(()=>attachCampaignSettings({name:'other.txt',content:'test'},{}),/형식 오류/);
});
test('a collapsed composer attachment menu is opened before checking its file input',async()=>{
  const old=globalThis.DataTransfer;globalThis.DataTransfer=class{files=[];items={add:file=>this.files.push(file)};};
  let opened=false,attached=false;const input={accept:'.txt',disabled:false,dispatchEvent(e){if(e.type==='change')attached=true;}};
  const button={disabled:false,getAttribute:key=>key==='data-testid'?'composer-plus-btn':null,click(){opened=true;}};
  const file={name:'ercedia-settings-'+ 'c'.repeat(40)+'.txt',content:'설정 원문'};
  const root={querySelectorAll(selector){return selector==='input[type="file"]'?(opened?[input]:[]):selector==='button'?[button]:attached?[{textContent:file.name}]:[];}};
  try{await attachCampaignSettings(file,{roots:()=>[root],isCurrent:()=>true,wait:async()=>{}});assert.equal(opened,true);assert.equal(input.files[0].name,file.name);assert.equal(attached,true);}finally{globalThis.DataTransfer=old;}
});
test('a supported public file input receives the full file and requires visible confirmation',async()=>{
  const old=globalThis.DataTransfer;globalThis.DataTransfer=class{files=[];items={add:file=>this.files.push(file)};};
  let attached=false;const events=[],input={accept:'.txt',disabled:false,dispatchEvent(e){events.push(e.type);if(e.type==='change')attached=true;}};
  const file={name:'ercedia-settings-'+ 'b'.repeat(40)+'.txt',content:'test setting source'};
  try{await attachCampaignSettings(file,{roots:()=>[{querySelectorAll:s=>s.startsWith('input')?[input]:attached?[{textContent:file.name,getAttribute:()=>null}]:[]}],isCurrent:()=>true,wait:async()=>{}});assert.equal(await input.files[0].text(),file.content);assert.deepEqual(events,['input','change']);}finally{globalThis.DataTransfer=old;}
});
test('unrelated composer files are not silently included in a game request',async()=>{
  const file={name:'ercedia-settings-'+ 'b'.repeat(40)+'.txt',content:'test'},input={accept:'.txt',files:[{name:'existing-user-file.txt'}]};
  await assert.rejects(()=>attachCampaignSettings(file,{roots:()=>[{querySelectorAll:()=>[input]}]}),/다른 첨부 파일/);
});
