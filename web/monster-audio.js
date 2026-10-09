import {npcVoiceDefaults,voiceBanks} from './voice-data.js';
export function monsterVoiceBank(participant){
  if(participant?.role!=='monster')return null;
  const bank=npcVoiceDefaults[participant.catalog_id||participant.id];
  return bank?.startsWith('monster_')?bank:'monster_canine';
}
export function monsterBattleReactions(event,participants,phase){
  if(!event)return [];
  const actor=participants.find(p=>p.id===event.actor),target=participants.find(p=>p.id===event.target);
  if(phase==='cast')return monsterVoiceBank(actor)&&['attack','counter','magic','unique'].includes(event.kind)?[{participant:actor,phase:'attack'}]:[];
  if(phase==='impact'&&event.damage>0&&event.result!=='dodge'&&monsterVoiceBank(target))return [{participant:target,phase:event.target_hp_after===0?'death':'hurt'}];
  return [];
}
export function monsterCombatPath(participant,phase){return voiceBanks[monsterVoiceBank(participant)]?.combat?.[phase]||null;}
