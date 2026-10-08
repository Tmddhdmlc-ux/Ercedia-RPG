import {mapData} from './map-data.js';
import {lordships} from './lordship-data.js';
const countries={west:'벨로아',east:'드라켄',south:'루메린'};
export function mapSelectionInfo(id){
  const p=mapData.locations.find(p=>p.id===id);
  const lord=p?.kind==='lordship'?lordships[id]:null;
  if(lord)return {
    title:p.label,
    description:'영주령 대표 지점입니다. 위치는 지도 배치 초안이며 국경과 행정 경계는 미확정입니다.',
    fields:[['소속 왕국',lord.kingdom+' 왕국'],['현직 영주',lord.lord],['가문',lord.house],['가문 문장',lord.crest],['생산·경제',lord.economy],['지형·민생',lord.terrain],['인구',lord.population.toLocaleString('ko-KR')+'명'],['상비군',lord.standingArmy.toLocaleString('ko-KR')+'명 (기사·마법사 포함)'],['기사 / 마법사',`${lord.knights}명 / ${lord.mages}명`]],
    note:'인구·전력은 초기 밸런싱 기준값입니다. 왕도 인구·왕실 직할병은 제외됩니다.'
  };
  if(p?.kind==='capital')return {title:p.label,description:`${countries[p.region]} 왕국의 왕실 직할 중심입니다. 도시 이름과 대표 위치는 미정이며 인접 영주령과 별도로 관리합니다.`,fields:[],note:''};
  if(p)return {title:p.label,description:'탐험·시설 후보 지점입니다. 위치와 소유권은 미확정이며 실제 이동은 아직 연결되지 않았습니다.',fields:[],note:''};
  const region=mapData.regions.find(r=>r.id===id);
  if(region)return {title:region.label,description:countries[id]?'등록된 영주령과 왕도를 선택해 살펴보세요. 국가명은 설정에 반영되었으며 국경·영주령 행정 경계는 미확정입니다.':'인간 국가의 확정된 영토가 아닌 미개척·분쟁 지역입니다. 지점은 위치 후보로 표시합니다.',fields:[],note:''};
  return null;
}
