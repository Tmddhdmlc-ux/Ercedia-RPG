import {introData} from './intro-data.js';
// A loadout selects learned skills; it never grants or changes a skill's effect.
export function learnedSkills(state){
 const items=(state.player?.skills||[]).filter(s=>s.enabled!==false&&(!s.book_id||state.engine?.learned?.includes(s.book_id))).map(s=>({...s,id:s.id||'legacy:'+s.name,skill_type:s.skill_type==='passive'?'passive':'active',usage:['battle','dialogue','both'].includes(s.usage)?s.usage:'battle'}));
 const start=introData.passives.find(p=>p.id===state.starting_passive_id);
 if(start)items.push({...start,skill_type:'passive',usage:'both',starting:true});
 return items.filter((s,i)=>items.findIndex(p=>p.id===s.id)===i);
}
export function eligibleSkills(state,mode){return learnedSkills(state).filter(s=>!s.ultimate&&(mode==='battle'?s.usage!=='dialogue':s.skill_type==='passive'&&s.usage!=='battle'));}
export function normalizeLoadout(raw,state){const result={version:1,battle:[],dialogue:[]};for(const mode of ['battle','dialogue']){const known=new Set(eligibleSkills(state,mode).map(s=>s.id)),seen=new Set();result[mode]=Array.from({length:4},(_,i)=>{const id=raw?.[mode]?.[i];if(!known.has(id)||seen.has(id))return null;seen.add(id);return id;});}return result;}
export function effectiveLoadout(state){return state.skill_loadout?normalizeLoadout(state.skill_loadout,state):{version:1,battle:eligibleSkills(state,'battle').slice(0,4).map(s=>s.id),dialogue:eligibleSkills(state,'dialogue').slice(0,4).map(s=>s.id)};}
export function equippedSkills(state,mode){const ids=effectiveLoadout(state)[mode];return eligibleSkills(state,mode).filter(s=>ids.includes(s.id));}
export function equipSkill(state,mode,id,slot){
 if(state.battlePlayback&&!state.battlePlayback.done)throw Error('전투 중 스킬을 교체할 수 없습니다.');
 if(!['battle','dialogue'].includes(mode)||!Number.isInteger(slot)||slot<0||slot>3)throw Error('장착칸 오류');
 if(id!==null&&!eligibleSkills(state,mode).some(s=>s.id===id))throw Error('습득하지 않았거나 이 모드에 장착할 수 없는 기술입니다.');
 const current=effectiveLoadout(state),slots=[...current[mode]];while(slots.length<4)slots.push(null);
 if(id!==null)for(let i=0;i<slots.length;i++)if(slots[i]===id)slots[i]=null;
 slots[slot]=id;current[mode]=slots;state.skill_loadout=current;return current;
}
export function loadoutContext(state){return {slots_per_mode:4,battle:equippedSkills(state,'battle'),dialogue:equippedSkills(state,'dialogue'),ultimate_separate:true,rule:'전투 액티브·패시브 합계 4칸. 대화·탐험 패시브 4칸. 미장착 기술 효과 금지. 보유 궁극기는 별도 조건. 기본 공격·경지 능력은 장착 기술이 아님. 패시브 효과는 승인 원문의 조건과 한계 안에서만 판정.'};}
