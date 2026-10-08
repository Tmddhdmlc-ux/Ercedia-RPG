import {normalizePlayer} from '../web/player.js';
import {normalizeInventory} from '../web/inventory.js';
import {battleIsActive} from '../web/battle-model.js';
// Public bridge v1. UI classes and character coordinates are intentionally absent.
export function createGameBridge(state,{apply,restore,render,persist}){
  return Object.freeze({
    version:1,
    updateScene:scene=>apply(typeof scene==='string'?scene:JSON.stringify(scene)),
    updatePlayer:player=>{if(battleIsActive(state))return;const retained=Object.fromEntries(['constitution','manaStat','realm','levelHpBonus','unspentStatPoints','battleModifiers'].filter(k=>!Object.hasOwn(player||{},k)&&Object.hasOwn(state.player,k)).map(k=>[k,state.player[k]]));state.player=normalizePlayer({...player,...retained});if(state.chosenName)state.player.name=state.chosenName;render();persist();},
    updateInventory:items=>{if(battleIsActive(state))return;state.inventory=normalizeInventory(items);render();persist();},
    getGameState:()=>JSON.parse(JSON.stringify(state)),
    restoreGameState:saved=>restore(saved)
  });
}
