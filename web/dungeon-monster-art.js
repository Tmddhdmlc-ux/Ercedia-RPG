import {dungeonMonsterArt} from './dungeon-monster-art-data.js';
import {characterVisual} from './character-art.js';
export function battleCharacterVisual(participant){
  const art=participant?.art;
  if(!art)return null;
  const base=characterVisual(art.id,art.outfit,art.emotion);
  const specific=dungeonMonsterArt.characters[participant.dungeon_foe_id];
  if(!base||!specific||participant.role!=='monster'||participant.catalog_id!==specific.base_monster_id||art.id!==specific.base_monster_id)return base;
  return {...base,path:specific.portrait,portrait:specific.portrait,layoutId:participant.dungeon_foe_id};
}
