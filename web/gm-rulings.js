// Campaign-local public rulings fill narrative gaps; they never grant stats or rewards.
export function normalizeRulings(raw,max=256){
 if(!Array.isArray(raw)||raw.length>max)throw Error('GM 판정 기록 한도 오류');
 const ids=new Set();return raw.map(r=>{const result={};for(const [key,limit]of [['id',100],['topic',120],['decision',800]]){if(typeof r?.[key]!=='string'||!r[key].trim()||r[key].length>limit)throw Error('GM 판정 기록 형식 오류');result[key]=r[key].trim();}if(ids.has(result.id))throw Error('GM 판정 ID 중복');ids.add(result.id);return result;});
}
export function mergeRulings(state,scene){
 const records=normalizeRulings(state.gm_rulings||[]),incoming=normalizeRulings(scene.gm_rulings||[],8),byID=new Map(records.map(r=>[r.id,r]));
 for(const r of incoming){const prior=byID.get(r.id);if(prior&&JSON.stringify(prior)!==JSON.stringify(r))throw Error('기존 GM 판정을 임의로 바꿀 수 없습니다. 계약과 후속 결과는 서로 다른 새 id로 기록하세요. 기존 id는 내용이 동일할 때만 재사용합니다.');byID.set(r.id,r);}
 return normalizeRulings([...byID.values()]);
}
