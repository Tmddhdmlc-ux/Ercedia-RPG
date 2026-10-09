import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const source=(await readFile(new URL('index.html',root),'utf8')).replace('<head>','<head><base href="/">');
const setup=`<script type="module">
import {tradeFixture} from './tests/trade-fixtures.js';
const qaKey='ercedia.trade.qa.isolated.v1';
window.__ERCEDIA_STORAGE__={getItem:()=>localStorage.getItem(qaKey)||JSON.stringify(tradeFixture()),setItem:(key,value)=>localStorage.setItem(qaKey,value)};
window.__ERCEDIA_CONFIG__={token:'isolated-shop-qa',conversation:'isolated-shop-qa',assetBase:location.origin+'/',features:['settings-attachment']};
// Isolated GM fixture exercises the unchanged bridge, never contacts ChatGPT or the user's save.
window.addEventListener('message',event=>{const d=event.data;if(event.source!==window||d?.type!=='action'||d.token!=='isolated-shop-qa')return;
 window.postMessage({...d,type:'action-ack',payload:{requestId:d.payload.requestId}},'*');
 const current=window.gameBridge.getGameState();
 window.postMessage({...d,type:'scene',payload:JSON.stringify({...current.scene,scene_id:'qa-reaction-'+crypto.randomUUID(),reply_to:d.payload.requestId,dialogue:[{speaker:'루도 산체',text:'좋은 거래였어요. 물건은 잘 쓰세요. (격리 검증용 GM 응답)'}],choices:[{id:'qa-continue',text:'대화를 이어간다'},{id:'qa-close',text:'인사를 한다'}]})},'*');
});
await import('./web/app.js');
const notice=document.createElement('aside');notice.id='qa-notice';notice.style.cssText='padding:8px;background:#151b24;font-size:12px';notice.textContent='격리 검증 · 실제 거래 엔진 · 사용자 저장과 분리 ';
const reset=document.createElement('button');reset.textContent='검증 데이터 초기화';reset.onclick=()=>{localStorage.removeItem(qaKey);location.reload();};notice.append(reset);document.body.append(notice);
const audit=document.createElement('pre');audit.id='qa-state';audit.style.cssText='white-space:pre-wrap;font-size:11px';notice.append(audit);
function inspect(){const s=window.gameBridge.getGameState(),saved=JSON.parse(localStorage.getItem(qaKey)||'null');audit.textContent=JSON.stringify({wallet_copper:s.wallet_copper,inventory:s.inventory,instances:s.engine?.instances,stock:s.world_engine.shops['qa-shop'].stock,merchant_funds:s.world_engine.merchants['ER-NPC-042'].wallet_copper,receipt_count:Object.keys(s.world_engine.trade_ids).length,saved_wallet_copper:saved?.wallet_copper,page:s.page,dialogue:s.scene?.dialogue},null,2);}
document.addEventListener('click',()=>queueMicrotask(inspect));document.addEventListener('drop',()=>queueMicrotask(inspect));document.addEventListener('keydown',()=>queueMicrotask(inspect));window.addEventListener('message',()=>queueMicrotask(inspect));inspect();
</script>`;
await writeFile(new URL('prototypes/shop_trade_qa.html',root),source.replace('<script type="module" src="web/app.js"></script>',setup));
console.log('Generated isolated QA using the production application and engine.');
