import {normalizePlayer} from '../web/player.js';
import {normalizeInventory} from '../web/inventory.js';
import {battleIsActive} from '../web/battle-model.js';
import {npcCatalog,npcSnapshot,updateNPC} from '../web/npc-model.js';
import {settleQuests} from '../web/quest-model.js';
import {publicLife,regionImpact} from '../web/npc-life.js';
import {itemCatalog,catalogItem,lootCatalog} from '../web/item-catalog.js';
// Public bridge v1. UI classes and character coordinates are intentionally absent.
export function createGameBridge(state,{apply,restore,render,persist}){
  return Object.freeze({
    version:1,
    getWorldEngine:()=>JSON.parse(JSON.stringify(state.world_engine||null)),
    getParty:()=>[...(state.world_engine?.party||[])],
    getDungeonProgress:()=>JSON.parse(JSON.stringify(state.world_engine?.dungeons||{})),
    getItemCatalog:()=>JSON.parse(JSON.stringify(itemCatalog)),
    getItem:id=>{const item=catalogItem(id);return item?JSON.parse(JSON.stringify(item)):null;},
    getLootTables:()=>JSON.parse(JSON.stringify(lootCatalog)),
    getNPCLife:id=>JSON.parse(JSON.stringify(publicLife(state,id))),
    getRegionImpact:id=>regionImpact(state,id,{publicOnly:true}),
    getAdventureJournal:()=>JSON.parse(JSON.stringify((state.npc_life?.memories||[]).filter(m=>m.player_witnessed))),
    getNPC:id=>{const p=npcSnapshot(state,id);return p?JSON.parse(JSON.stringify(p)):null;},
    getNPCCatalog:()=>JSON.parse(JSON.stringify(npcCatalog)),
    getQuestLog:()=>JSON.parse(JSON.stringify(state.quest_log||[])),
    updateNPC:(id,profile)=>{if(battleIsActive(state))return;updateNPC(state,id,profile);render();persist();},
    updateScene:scene=>apply(typeof scene==='string'?scene:JSON.stringify(scene)),
    updatePlayer:player=>{if(battleIsActive(state))return;const retained=Object.fromEntries(['constitution','manaStat','realm','levelHpBonus','unspentStatPoints','battleModifiers'].filter(k=>!Object.hasOwn(player||{},k)&&Object.hasOwn(state.player,k)).map(k=>[k,state.player[k]]));state.player=normalizePlayer({...player,...retained});if(state.chosenName)state.player.name=state.chosenName;render();persist();},
    updateInventory:items=>{if(battleIsActive(state))return;const inventory=normalizeInventory(items);if(state.quest_log?.length)Object.assign(state,settleQuests(state,{scene_id:'inventory-'+Date.now(),location:state.scene?.location||state.gameState.place||'',inventory}));else state.inventory=inventory;render();persist();},
    getGameState:()=>JSON.parse(JSON.stringify(state)),
    restoreGameState:saved=>restore(saved)
  });
}
