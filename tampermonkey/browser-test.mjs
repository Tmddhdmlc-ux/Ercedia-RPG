import {createRequire} from 'node:module';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(path.resolve(process.env.ERCEDIA_PLAYWRIGHT_MODULES||'.','package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,...(process.env.ERCEDIA_BROWSER_CHANNEL?{channel:process.env.ERCEDIA_BROWSER_CHANNEL}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const example=JSON.parse(await readFile(new URL('./example-scene.json',import.meta.url),'utf8'));
const frame=page.frameLocator('#ercedia-game-root iframe');
const locator=selector=>frame.locator(selector);
const waitForText=async(selector,text)=>{await locator(selector).filter({hasText:text}).waitFor();};
async function apply(scene){await locator('.manual-scene').evaluate(node=>node.open=true);await locator('#scene-json').fill(JSON.stringify(scene));await locator('#apply-scene').click();await waitForText('#connection-status','장면 적용');}
try{
  await page.route('https://raw.githubusercontent.com/Tmddhdmlc-ux/Ercedia-RPG/**/assets/**',async route=>{
    const pathname=new URL(route.request().url()).pathname;const asset=pathname.slice(pathname.indexOf('/assets/')+1);
    try{await route.fulfill({status:200,contentType:'image/png',body:await readFile(new URL('../'+asset,import.meta.url))});}catch{await route.fulfill({status:404,body:'missing'});}
  });
  await page.goto('http://localhost:4173/tampermonkey/test-host.html');
  await page.locator('#ercedia-game-root .status').filter({hasText:'고정 UI 연결됨'}).waitFor();
  await page.evaluate(()=>window.originalRoot=document.getElementById('ercedia-game-root'));
  const gameFrame=page.frames().find(v=>v!==page.mainFrame());
  await gameFrame.evaluate(()=>{window.originalGame=document.querySelector('.game');window.originalBackground=document.getElementById('background');window.originalSlot=document.querySelector('.inventory-slot');window.originalFace=document.querySelector('.face-image');window.srcMutations=0;new MutationObserver(records=>{window.srcMutations+=records.filter(r=>r.attributeName==='src').length;}).observe(document.querySelector('.game'),{subtree:true,attributes:true,attributeFilter:['src']});});
  assert.equal(await locator('.settings').isVisible(),false);
  await locator('#map-tab').click();await locator('[data-map-view="west"]').click();await locator('button[data-region="W1"]').click();
  await waitForText('#region-title','W1');
  const first={...example,scene_id:'manual-1',player:{name:'검증용',level:3,hp:20,maxHp:40,strength:5,skills:[{name:'검증 스킬',formula:'STR*2',description:'시험 데이터'}]},inventory:[{name:'검증용 아이템',category:'material',quantity:4,description:'시험 설명'}],game_state:{date:'검증 날짜',quests:['테스트']}};
  await apply(first);
  assert.equal(await locator('#map-tab').getAttribute('aria-pressed'),'true');assert.match(await locator('#map-breadcrumb').textContent(),/서부/);
  await locator('#status-tab').click();assert.equal(await locator('#player-name').textContent(),'검증용');assert.match(await locator('.damage-preview').textContent(),/10/);
  await locator('#inventory-tab').click();assert.equal(await locator('.inventory-slot').count(),32);await locator('.inventory-slot').first().hover();await waitForText('#item-tooltip','시험 설명');
  await locator('#story-tab').click();await locator('#next').click();assert.equal(await locator('#expression').inputValue(),'surprised');
  // Verify free input is sent exactly once through the mock public composer.
  await page.locator('#ercedia-game-root input[type=checkbox]').check();
  await locator('#free-action').fill('세린에게 자유롭게 질문한다.');await locator('#send-action').click();
  await page.waitForFunction(()=>window.mockSent.length===1);assert.equal(await locator('#send-action').isDisabled(),true);
  const requestId=await page.evaluate(()=>mockSent[0].match(/reply_to="([^"]+)"/)[1]);
  await page.evaluate(scene=>mockResponse(scene),{...example,scene_id:'auto-1',reply_to:requestId});await waitForText('#connection-status','새 장면');
  await locator('#next').click();await locator('#scene-choices button').first().click();await page.waitForFunction(()=>window.mockSent.length===2);
  const secondRequest=await page.evaluate(()=>mockSent[1].match(/reply_to="([^"]+)"/)[1]);
  await page.evaluate(scene=>mockResponse(scene),{...example,scene_id:'auto-choice',reply_to:secondRequest});await waitForText('#connection-status','새 장면');
  // 20 synthetic completed responses; these are not twenty real ChatGPT turns.
  const emotions=['base','smile','angry','surprised','sad','embarrassed','afraid','annoyed','love'];
  for(let i=0;i<20;i++){
    const emotion=emotions[i%9],outfit=['armor','casual','nightwear'][i%3];
    await page.evaluate(scene=>mockResponse(scene),{...example,scene_id:`mock-turn-${i}`,npc:{...example.npc,emotion,outfit},dialogue:[{speaker:'세린',emotion,text:`모의 응답 ${i+1}`}],choices:[]});
    await waitForText('#line',`모의 응답 ${i+1}`);assert.equal(await locator('#expression').inputValue(),emotion);assert.equal(await locator('[data-outfit].selected').getAttribute('data-outfit'),outfit);
  }
  const identity=await gameFrame.evaluate(()=>({game:window.originalGame===document.querySelector('.game'),background:window.originalBackground===document.getElementById('background'),face:window.originalFace===document.querySelector('.face-image'),slot:window.originalSlot===document.querySelector('.inventory-slot'),srcMutations}));
  assert.deepEqual(identity,{game:true,background:true,face:true,slot:true,srcMutations:0});assert.equal(await page.evaluate(()=>window.originalRoot===document.getElementById('ercedia-game-root')),true);
  // Invalid, interrupted and duplicate responses retain the last good scene.
  await locator('#scene-json').fill('{"type":"ercedia_scene"');await locator('#apply-scene').click();await waitForText('#connection-status','실패');assert.equal(await locator('#line').textContent(),'모의 응답 20');
  await locator('#scene-json').fill(JSON.stringify({...example,scene_id:'mock-turn-19'}));await locator('#apply-scene').click();await waitForText('#connection-status','이미 반영');assert.equal(await locator('#line').textContent(),'모의 응답 20');
  await locator('#free-action').fill('응답 실패 시험');await locator('#send-action').click();await locator('#cancel-wait').click();assert.equal(await locator('#send-action').isDisabled(),false);
  await locator('#map-tab').click();await locator('[data-map-view="east"]').click();await locator('#story-tab').click();
  await page.reload();await waitForText('#line','모의 응답 20');await locator('#map-tab').click();assert.match(await locator('#map-breadcrumb').textContent(),/동부/);
  await locator('#inventory-tab').click();await locator('.inventory-slot').first().hover();await waitForText('#item-tooltip','시험 설명');
  // Different chat routes restore separate data without replacing the frame.
  const restoredFrame=page.frames().find(v=>v!==page.mainFrame());
  await restoredFrame.evaluate(()=>window.retained=document.querySelector('.game'));
  await page.evaluate(()=>history.pushState({},'', '/c/test-other'));await waitForText('#connection-status','저장 상태');assert.equal(await locator('#player-name').textContent(),'주인공');
  await page.evaluate(()=>history.pushState({},'', '/tampermonkey/test-host.html'));await waitForText('#line','모의 응답 20');assert.equal(await restoredFrame.evaluate(()=>window.retained===document.querySelector('.game')),true);
  await page.locator('#ercedia-game-root button').filter({hasText:'게임 종료',exact:true}).click();assert.equal(await page.locator('#ercedia-game-root iframe').isVisible(),false);
  await page.locator('#ercedia-game-root button').filter({hasText:'✧ 에르세디아 열기',exact:true}).click();await locator('#story-tab').click();
  // Capture the approved assets when available; their URLs are not replaced by fixtures.
  await page.waitForTimeout(1000);
  const assetStatus=await locator('#asset-status').textContent();
  await page.screenshot({path:new URL('./preview.png',import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/,''),fullPage:true});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'passed',syntheticTurns:20,expressions:9,outfits:3,identity,errors,assets:assetStatus},null,2));
}finally{await browser.close();}
