import {characterArtData} from './character-art-data.js';
import {mapData} from './map-data.js';
export const registeredArt=characterArtData.characters;
export const npcPlacements=characterArtData.placements;
export const heraldry=characterArtData.symbols;
export function artBase(base){return base||'https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@'+characterArtData.asset_commit+'/';}
export function characterVisual(id,outfit='none',emotion='base'){
  if(id==='serin'&&['armor','casual','nightwear'].includes(outfit))return {path:'assets/characters/main/serin/standing/'+(outfit==='armor'?'base.png':`outfits/${outfit}/base.png`),kind:'human',emotion};
  const art=registeredArt[id];if(!art||!art.outfits.includes(outfit))return null;
  return {path:art.standing||art.portrait,portrait:art.portrait,kind:art.kind,emotion:'base'};
}
export function registeredNPCArt(id){return id==='serin'?{id,outfit:'armor',emotion:'base'}:registeredArt[id]?{id,outfit:'none',emotion:'base'}:null;}
export function placementFor(id){return npcPlacements.find(p=>p.id===id)||null;}
export function effectivePlacement(id,state){const base=placementFor(id);if(!base)return null;const location=state?.npc_life?.npcs?.[id]?.region||state?.npcStates?.[id]?.location_id||(state?.scene?.npc?.id===id?state.scene.npc.profile?.location_id:null);if(!location||location===base.location_id)return base;const anchor=mapData.locations.find(p=>p.id===location);return anchor?{...base,location_id:anchor.id,region:anchor.region,faction_id:null,x:anchor.x,y:anchor.y,position_kind:'confirmed_region'}:base;}
export function placedNPCs(region,faction=null,state=null){return npcPlacements.map(p=>effectivePlacement(p.id,state)).filter(p=>faction?p.faction_id===faction:p.region===region||p.location_id===region||region==='world');}
export function placementLabel(id,state=null){const p=effectivePlacement(id,state);return p?mapData.locations.find(a=>a.id===p.location_id)?.label||p.location_id:'';}
export function heraldryPath(selection,faction=null){return faction?heraldry.factions[faction]||null:heraldry.lordships[selection]||heraldry.kingdoms[selection]||heraldry.kingdoms[mapData.locations.find(p=>p.id===selection)?.region]||null;}
