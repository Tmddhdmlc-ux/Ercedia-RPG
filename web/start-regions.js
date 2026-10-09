import {introData} from './intro-data.js';
// Public geography and economy from KINGDOMS.md. These are opportunities, not stat bonuses.
export const startRegionInfo={
  west:{title:'벨로아 왕국',description:'넓은 평야와 강, 농촌과 기사 문화가 중심인 왕국입니다.',opportunity:'농업·보급과 기사 문화에 관심 있는 여행자에게 어울립니다.'},
  east:{title:'드라켄 왕국',description:'고원과 협곡, 마나 수정 광맥과 마법탑이 있는 왕국입니다.',opportunity:'마나 광석·마도구와 연구 문화를 살펴보고 싶은 여행자에게 어울립니다.'},
  south:{title:'루메린 왕국',description:'남부 해안과 항구, 상선과 천막 시장이 있는 왕국입니다.',opportunity:'해상무역·항구와 상업 문화를 만나고 싶은 여행자에게 어울립니다.'}
};
export function automaticStartLordship(kingdom,current){
  const region=introData.start_regions.find(r=>r.id===kingdom);
  return region?.lordship_ids.includes(current)?current:region?.lordship_ids[0]||'';
}
