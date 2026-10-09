import {introData,playerTemplate} from './intro-data.js';
import {normalizePlayer} from './player.js';
export const introSteps=['name','gender','calling','response','passive','goal','kingdom','lordship','confirmation'];
// Public limits approved in NEW_GAME_INTRO.md; never infer secret abilities.
export const passiveLimits={steadfast:'데미지/HP 증가 아님, 전투당 첫 반응',traveler:'미개척 마나 이상지대 자동 탐지 불가',observant:'비밀 신원/마왕/진실 자동 탐지 불가',craftsman:'고급 제작·희귀 장비 무상 획득 불가'};
export function passiveCandidates(answers){
  const options=['calling','response'].map(id=>introData.questions.find(q=>q.id===id)?.options.find(o=>o.id===answers[id])?.passive);
  return [...new Set(options.filter(Boolean))];
}
export function normalizeIntroDraft(raw){
  if(!raw||!introSteps.includes(raw.step))return null;
  return {...(typeof raw.goal==='string'?{goal:raw.goal.slice(0,1000)}:{}),step:raw.step,name:typeof raw.name==='string'?raw.name.slice(0,40):'',appearance:typeof raw.appearance==='string'?raw.appearance.slice(0,200):'',answers:{calling:typeof raw.answers?.calling==='string'?raw.answers.calling:'',response:typeof raw.answers?.response==='string'?raw.answers.response:''},passive:introData.passives.some(p=>p.id===raw.passive)?raw.passive:'',kingdom:introData.start_regions.some(r=>r.id===raw.kingdom)?raw.kingdom:'',lordship:introData.start_regions.some(r=>r.lordship_ids.includes(raw.lordship))?raw.lordship:'',previousView:{page:raw.previousView?.page||'story',mapView:raw.previousView?.mapView||'world',region:raw.previousView?.region||'village'}};
}
export function creationFields(draft){
  const region=introData.start_regions.find(r=>r.id===draft.kingdom),candidates=passiveCandidates(draft.answers);
  const validAnswers=['calling','response'].every(id=>introData.questions.find(q=>q.id===id).options.some(o=>o.id===draft.answers[id]));
  if(!draft.name.trim()||!region?.lordship_ids.includes(draft.lordship)||!candidates.includes(draft.passive)||!validAnswers)throw Error('이름, 질문 답변, 패시브와 시작 영주령을 모두 확인해주세요.');
  return {...(draft.goal?.trim()?{journey_goal:draft.goal.trim().slice(0,1000)}:{}),intro_completed:true,character_name:draft.name.trim(),gender_or_appearance:draft.appearance.trim(),chosen_answers:{...draft.answers},starting_passive_id:draft.passive,starting_kingdom:region.kingdom,starting_lordship_id:draft.lordship};
}
export function initialPlayer(name){
  const t=playerTemplate,s=t.stats;
  return normalizePlayer({name,job:t.identity.profession||'',level:t.level,xp:t.xp,requiredXp:t.xp_to_next,hp:s.hp,maxHp:s.max_hp,mp:s.mp,maxMp:s.max_mp,strength:s.strength,dexterity:s.agility,intelligence:s.intelligence,constitution:s.constitution,manaStat:s.mana,realm:t.realm||'none',levelHpBonus:t.level_hp_bonus||0,unspentStatPoints:t.unspent_stat_points||0,skills:[]});
}
