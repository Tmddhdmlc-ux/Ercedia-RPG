// Synthetic GM rulings, never loaded by production.
import {defaults} from '../web/state.js';
import {freshCampaign} from '../web/new-game-state.js';
import {bindWallet} from '../web/wallet.js';
import {planWorldScene} from '../web/world-engine.js';
import {settleQuests} from '../web/quest-model.js';
import {normalizeScene} from '../web/scene.js';
let serial=0;
export const event=(kind,fields={})=>({event_id:'economy-event-'+ ++serial,kind,reason:'합성 GM 검증 · 실제 현장 조건과 계약 확인',...fields});
export function economyState(){const draft={name:'경제 검증',appearance:'',answers:{calling:'guard',response:'protect'},passive:'steadfast',kingdom:'west',lordship:'W5',previousView:{page:'story',region:'village',mapView:'world'}},s=freshCampaign(defaults(),draft,{files:{},paths:[]},'economy-test');delete s.previousGame;s.gameState.place='검증 장터';return s;}
export function scene(s,events=[],extra={}){return {schema_version:1,type:'ercedia_scene',scene_id:'economy-scene-'+ ++serial,background_id:'IMG-W5-HUB',npc:null,location:s.gameState.place,time:'오후',dialogue:[{speaker:'나레이션',text:'승인된 현지 거래 결과를 확인했다.'}],choices:[],game_state:{...s.gameState},system_events:events,...extra};}
export function offer(){return {id:'test-shop',type:'shop',venue_id:'test-market',venue_name:'검증 장터',region_id:'W5',merchant_npc_id:'ER-NPC-045',merchant_buy_budget:10000,buyable_types:['equipment','book','material','consumable'],valid_until:'1-1-30',items:[{id:'bread',stock:20,buy_price:5,sell_price:2,price_basis:'빵 기준가와 실제 매입가 확인'},{id:'ER-EQ-001',stock:2,buy_price:1500,sell_price:500,price_basis:'지역 장비 견적'},{id:'MAT-001-1',stock:0,buy_price:30,sell_price:20,price_basis:'실제 재료 수요'}],services:[{id:'inn',service:'inn_night',cost:100,basis:'일반 여관1박 기준가'}]};}
export const apply=(s,raw)=>{const p=planWorldScene(s,normalizeScene(raw)),q=settleQuests({...s,wallet_copper:p.wallet_copper},p.scene);Object.assign(s,{world_engine:p.world_engine,...(p.engine?{engine:p.engine}:{}),...q});if(p.scene.game_state)Object.assign(s.gameState,p.scene.game_state);bindWallet(s);return p;};
export const shop=s=>apply(s,scene(s,[event('offer',{offer:offer()})]));
export const trade=(s,item,direction='buy',quantity=1)=>scene(s,[event('trade',{offer_id:'test-shop',item_id:item,direction,quantity})]);
export const auction=(seller='ER-NPC-045',instance='test-lot')=>({id:'test-auction',seller_id:seller,instance_id:instance,ownership_proof:'판매자의 실제 검 한 자루 위탁 확인',min_increment:10,item_id:'ER-EQ-001',venue_id:'test-market',venue_name:'검증 장터',region_id:'W5',reserve:50,closes_at:'1-1-2',price_basis:'실제 현장 경매 위탁 계약',eligible:true});
export function contract(){return {id:'paid-job',title:'현지 조사',type:'investigate',origin:'personal_npc',status:'offered',rank:'F',region_id:'W5',issuer_name:'현지 의뢰인',objectives:[{id:'proof',description:'현장 조사 확인',current:0,target:1,verification:{kind:'clue',target_id:'investigation'}}],reward:{currency:500,budget_copper:500,budget_basis:'발주자 예산 확인',xp:0,item_ids:[],materials:[],affection_effects:[]}};}
export function ready(s){apply(s,scene(s,[],{quest_updates:[contract()]}));apply(s,scene(s,[],{quest_events:[{event_id:'accept-paid',quest_id:'paid-job',kind:'accept',reason:'계약 수락'}]}));apply(s,scene(s,[],{world_events:[{event_id:'investigation-proof',kind:'clue',target_id:'investigation',location:s.gameState.place,proof:'실제 현장 조사'}]}));}
