export function normalizeCustomSkill(raw,reason){
 const check=(ok,message)=>{if(!ok)throw Error(message);};
 check(/^GM-SKILL-[A-Za-z0-9_-]{1,65}$/.test(raw?.id||''),'창작 기술 ID 오류');
 const skill={id:raw.id,source:'gm',enabled:true,formula:'',learning_reason:reason};
 for(const [k,max]of [['name',60],['description',800]]){check(typeof raw[k]==='string'&&raw[k].trim()&&raw[k].length<=max,'창작 기술 설명 오류');skill[k]=raw[k];}
 check(['active','passive'].includes(raw.skill_type)&&['battle','dialogue','both'].includes(raw.usage),'창작 기술 분류 오류');check(raw.usage!=='dialogue'||raw.skill_type==='passive','생활 기술은 대화 패시브로 기록하세요');check(!raw.ultimate&&!raw.book_id,'기존 기술서·궁극기 위조 금지');
 skill.skill_type=raw.skill_type;skill.usage=raw.usage;
 if(raw.formula!==undefined){check(typeof raw.formula==='string'&&raw.formula.length<=240,'창작 기술 공식 오류');skill.formula=raw.formula;}
 for(const k of ['mp_cost','technique_bonus','spell_base_power'])if(raw[k]!==undefined){check(Number.isSafeInteger(raw[k])&&raw[k]>=0&&raw[k]<=999999,'창작 기술 수치 오류');skill[k]=raw[k];}
 if(raw.element!==undefined){check(raw.element===null||typeof raw.element==='string'&&raw.element.length<=40,'창작 기술 원소 오류');skill.element=raw.element;}
 return skill;
}
export function learnCustomSkill(state,event){
 const skill=normalizeCustomSkill(event.skill,event.reason),prior=state.player.skills.find(s=>s.id===skill.id);
 if(prior){if(prior.name!==skill.name||prior.description!==skill.description||prior.skill_type!==skill.skill_type||prior.usage!==skill.usage||['formula','mp_cost','technique_bonus','spell_base_power','element'].some(k=>prior[k]!==skill[k]))throw Error('이미 배운 창작 기술을 덮어쓸 수 없습니다.');prior.source='gm';prior.learning_reason=prior.learning_reason||event.reason;return;}
 if(state.player.skills.length>=70)throw Error('기술 목록이 가득 찼습니다.');state.player.skills.push(skill);
}
