import {defaults} from '../web/state.js';
import {initialPlayer} from '../web/intro-model.js';
import {emptyWorld,planWorldScene} from '../web/world-engine.js';
import {ensureEngine} from '../web/engine-model.js';
import {registerShop} from '../web/trade-model.js';
export function tradeFixture(){
  const s={...defaults(),chosenName:'검증 여행자',campaign_id:'shop-qa-isolated',player:initialPlayer('검증 여행자'),wallet_copper:1000,page:'inventory',character:false,background:false,gameState:{date:'1-1-1',time:'12:00',region:'S1',place:'검증 상점'}};
  s.world_engine=emptyWorld(s);
  s.scene={schema_version:1,type:'ercedia_scene',scene_id:'shop-qa-entry',location:'검증 상점',time:'12:00',background_id:null,npc:{id:'ER-NPC-042',speaker:'루도 산체',outfit:'none',emotion:'base'},dialogue:[{speaker:'루도 산체',text:'물품을 고르고 판매할 것도 함께 올려보세요.'}],choices:[]};
  s.inventory=[{id:'MAT-001-1',name:'서리갈기 가죽',category:'material',quantity:3,description:'실제 거래 모델 검증용 재료'},{id:'ER-EQ-002',name:'장비',quantity:1,category:'equipment'}];
  ensureEngine(s).instances[0].condition=57;s.engine.instances[0].enhancement=2;
  registerShop(s,{id:'qa-shop',npc_id:'ER-NPC-042',type:'junk',name:'검증 상점',region_id:'S1',place:'검증 상점',funds_copper:2000,available:true,valid_until:'1-1-30',price_version:'qa-price-1',price_basis:'격리된 거래 테스트 견적 · 공식 세계관 가격 아님',open_hours:[8,22],items:[{id:'ER-EQ-001',stock:2,buy_price:100,sell_price:40},{id:'MAT-001-1',stock:8,buy_price:30,sell_price:15},{id:'ER-EQ-002',stock:1,buy_price:180,sell_price:75}]});
  return s;
}
