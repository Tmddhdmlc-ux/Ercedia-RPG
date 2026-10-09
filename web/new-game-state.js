import {introData} from './intro-data.js';
import {currencyRules} from './economy.js';
import {effectiveLoadout,normalizeLoadout} from './skill-loadout.js';
import {emptyWorld} from './world-engine.js';
import {defaults} from './state.js';
import {creationFields,initialPlayer} from './intro-model.js';
import {mapData} from './map-data.js';
import {campaignNPCStates} from './campaign-settings.js';
import {npcCatalog} from './npc-model.js';
export function freshCampaign(state,draft,settings,campaignId){
  const fields=creationFields(draft),place=mapData.locations.find(p=>p.id===fields.starting_lordship_id);
  if(!place)throw Error('시작 영주령을 확인할 수 없습니다.');
  const backup=JSON.parse(JSON.stringify(state));Object.assign(backup,draft.previousView);delete backup.introDraft;delete backup.previousGame;delete backup.save_slots;
  const next={...defaults(),...(state.save_slots?{save_slots:JSON.parse(JSON.stringify(state.save_slots))}:{}),...fields,wallet_copper:currencyRules.new_game.starting_copper,initial_currency_granted:true,world_engine:emptyWorld(fields),campaign_id:campaignId,chosenName:fields.character_name,player:initialPlayer(fields.character_name),previousGame:backup,layouts:state.layouts,...(state.uiPreferences?{uiPreferences:state.uiPreferences}:{}),mapView:draft.kingdom,region:place.id,background:true,character:false,npcStates:campaignNPCStates(settings,npcCatalog.map(p=>p.id)),gameState:{date:introData.start_calendar.date,region:place.id,place:place.label+' 내 임시 안전 정착지',time:introData.start_calendar.time,quests:[],relationships:[],events:[],recent_dialogue:[]}};
  next.skill_loadout=normalizeLoadout(effectiveLoadout(next),next);return next;
}
