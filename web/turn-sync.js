import {buildTurnPrompt} from './gm-turn-policy.js';
import {turnContext,turnDomains} from './scene.js';
const clone=x=>JSON.parse(JSON.stringify(x));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function difference(value,old,removed=[],path=''){if(same(value,old))return undefined;if(value&&old&&typeof value==='object'&&typeof old==='object'&&!Array.isArray(value)&&!Array.isArray(old)){const result={};for(const [k,v]of Object.entries(value)){const changed=difference(v,old[k],removed,path+'/'+k.replaceAll('~','~0').replaceAll('/','~1'));if(changed!==undefined)result[k]=changed;}for(const k of Object.keys(old))if(!Object.hasOwn(value,k))removed.push(path+'/'+k.replaceAll('~','~0').replaceAll('/','~1'));return Object.keys(result).length?result:undefined;}return value;}
export function syncContext(state,action,choiceId){
 const domains=turnDomains(state,action,choiceId),c=clone(turnContext(state,domains,action,choiceId));
 if(c.npc_catalog&&!state.scene?.npc&&!state.scene?.cast?.length)c.npc_catalog.current_npc=null;
 delete c.item_registry;if(!domains.relationship)delete c.relationship_network;
 if(c.adventure)for(const k of ['guide','loop','rules','resident_rules'])delete c.adventure[k];
 if(c.skill_loadout){delete c.skill_loadout.rule;delete c.skill_loadout.slots_per_mode;}
 if(c.regional_epics){delete c.regional_epics.constraints;delete c.regional_epics.source;}
 if(c.npc_catalog)for(const k of ['sources','art_registry','placements','catalog_digest'])delete c.npc_catalog[k];
 if(c.economy)delete c.economy.rules;
 if(c.growth&&!/돌파|경지|서클|마나 방어|반사/.test(action))c.growth={profile:c.growth.profile,next:c.growth.next,learned_abilities:c.growth.learned_abilities};
 if(!domains.dungeon)delete c.dungeon_encounters;
 if(c.background_registry){delete c.background_registry.source;delete c.background_registry.registered;if(!domains.adventure&&!domains.dungeon&&!domains.crafting&&!domains.trade&&!domains.growth)delete c.background_registry.available;}
 return {context:c,domains};
}
export function createTurnSync(){
 let baseline=null,completed=0,campaign=null,generation=0;
 function reset(){baseline=null;completed=0;campaign=null;generation++;}
 function prepare(state,action,choiceId,force=false){
  const key=state.campaign_id||'legacy';if(campaign!==key){reset();campaign=key;}
  const {context,domains}=syncContext(state,action,choiceId),checkpoint=force||!baseline||completed%10===0;
  const removed=[];const changed=checkpoint?context:difference(context,baseline,removed)||{};
  const required=new Set(['npc','cast','turn_facts']);
  if(domains.combat||domains.growth||domains.crafting)for(const k of ['player','engine','inventory','skill_loadout','npc_catalog','growth','loot','dungeon_encounters','gm_rulings'])required.add(k);
  if(domains.trade)for(const k of ['player','inventory','wallet_copper','shops','economy','trade_receipts','npc_catalog'])required.add(k);
  if(domains.quest)for(const k of ['quest_log','quest_event_ids','regional_epics','wallet_copper'])required.add(k);
  if(domains.relationship)required.add('relationship_network');
  for(const k of required)if(Object.hasOwn(context,k))changed[k]=context[k];
  const appended={};
  // Only an unchanged acknowledged prefix can be sent as additions. Checkpoints and mechanical turns retain the full ledger.
  const prior=baseline?.gm_rulings,current=context.gm_rulings;
  if(!checkpoint&&!required.has('gm_rulings')&&Array.isArray(prior)&&Array.isArray(current)&&current.length>prior.length&&same(current.slice(0,prior.length),prior)){
    appended.gm_rulings=current.slice(prior.length);delete changed.gm_rulings;
  }
  return {generation,campaign:key,completed,checkpoint,domains,snapshot:context,payload:{mode:checkpoint?'checkpoint':'delta',anchor:{campaign_id:state.campaign_id||null,scene_id:state.scene?.scene_id||null,region:state.gameState?.region||null,place:state.gameState?.place||state.scene?.location||null,date:state.gameState?.date||null,time:state.gameState?.time||state.scene?.time||null},state:changed,...(Object.keys(appended).length?{appended}:{}),...(removed.length?{removed}:{})}};
 }
 function acknowledge(packet){if(!packet||packet.generation!==generation||packet.completed!==completed||packet.campaign!==campaign)return false;baseline=clone(packet.snapshot);completed++;return true;}
 return {prepare,acknowledge,reset};
}
export function incrementalPrompt(state,action,id,packet){
 return buildTurnPrompt({state,action:String(action),id,domains:packet.domains,payload:packet.payload,focus:packet.snapshot.turn_facts?.narrative_focus,incremental:true});
}
