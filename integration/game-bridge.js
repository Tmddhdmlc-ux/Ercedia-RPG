import {normalizePlayer} from '../web/player.js';
import {normalizeInventory} from '../web/inventory.js';
// Public bridge v1. UI classes and character coordinates are intentionally absent.
export function createGameBridge(state,{apply,restore,render,persist}){
  return Object.freeze({
    version:1,
    updateScene:scene=>apply(typeof scene==='string'?scene:JSON.stringify(scene)),
    updatePlayer:player=>{state.player=normalizePlayer(player);render();persist();},
    updateInventory:items=>{state.inventory=normalizeInventory(items);render();persist();},
    getGameState:()=>JSON.parse(JSON.stringify(state)),
    restoreGameState:saved=>restore(saved)
  });
}
