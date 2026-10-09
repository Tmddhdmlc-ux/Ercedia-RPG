import {normalizeNPCProfile} from './npc-profile.js';
const REPO='Tmddhdmlc-ux/Ercedia-RPG';
const excluded=new Set(['AGENTS.md','README.md','UI_REMASTER.md','package.json','package-lock.json','pnpm-lock.yaml','yarn.lock']);
export function isCampaignSetting(path){
  if(typeof path!=='string'||path.startsWith('/')||path.includes('\\')||path.split('/').some(p=>!p||p==='.'||p==='..'||p.startsWith('.')))return false;
  const name=path.split('/').at(-1);
  if(excluded.has(name)||/^(tests|patches|artifacts|prototypes|integration|web|node_modules|templates|scripts|dist|build|coverage)\//.test(path))return false;
  if(/^(assets\/art-production|assets\/characters\/batches)\//.test(path))return false;
  return /\.(md|json|txt|csv|yaml|yml)$/i.test(path);
}
export function repositoryIndex(tree){
  return tree.filter(p=>p.type==='blob').map(p=>({path:p.path,size:p.size||0,sha:p.sha||null,kind:isCampaignSetting(p.path)?'setting':/\.(png|jpe?g|webp|gif|svg|mp[34]|wav|ogg)$/i.test(p.path)?'asset':'reference'})).sort((a,b)=>a.path.localeCompare(b.path));
}
export async function loadCampaignSettings({fetcher=globalThis.fetch,onProgress=()=>{}}={}){
  async function read(url,json=false){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
    try{const r=await fetcher(url,{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error('GitHub 설정 읽기 실패 ('+r.status+')');return json?await r.json():await r.text();}finally{clearTimeout(timer);}
  }
  onProgress('GitHub 최신 main 확인 중…');
  const ref=await read(`https://api.github.com/repos/${REPO}/git/ref/heads/main`,true),sha=ref.object?.sha;
  if(!/^[a-f0-9]{40}$/.test(sha||''))throw Error('GitHub 설정 버전을 확인할 수 없습니다.');
  const tree=await read(`https://api.github.com/repos/${REPO}/git/trees/${sha}?recursive=1`,true);
  if(tree.truncated||!Array.isArray(tree.tree))throw Error('GitHub 설정 목록이 불완전합니다. 다시 시도하세요.');
  const inventory=repositoryIndex(tree.tree),paths=inventory.filter(p=>p.kind==='setting').map(p=>p.path).sort();
  for(const required of ['BOOTSTRAP.md','WORLD.md','characters/player_default.json','characters/serin.json'])if(!paths.includes(required))throw Error('필수 설정 누락: '+required);
  if(paths.length>2000)throw Error('설정 파일 수가 지원 범위(2,000개)를 초과했습니다.');
  const files={};let index=0,done=0,total=0,failed=false;
  await Promise.all(Array.from({length:6},async()=>{
    while(!failed&&index<paths.length){try{const path=paths[index++],raw=await read(`https://raw.githubusercontent.com/${REPO}/${sha}/${path.split('/').map(encodeURIComponent).join('/')}`);
      if(raw.length>1500000)throw Error('설정 파일이 너무 큽니다: '+path);
      const content=/\.json$/i.test(path)?JSON.stringify(JSON.parse(raw)):raw;
      total+=content.length;if(total>6000000)throw Error('전체 설정이 전송 지원 범위(600만자)를 초과했습니다. 일부만 읽고 시작하지 않습니다.');
      files[path]=content;if(!failed)onProgress(`GitHub 설정 읽는 중 · ${++done} / ${paths.length}`);
    }catch(error){failed=true;throw error;}}
  }));
  onProgress(`저장소 ${inventory.length}개 파일 탐색 · 게임 설정 ${paths.length}개 읽기 완료`);
  return {sha,paths,files,repository_index:inventory};
}
export function campaignSettingsPrompt(snapshot){
  const priority=['BOOTSTRAP.md','WORLD.md','NARRATION_RULES.md','AUTONOMOUS_WORLD_RULES.md'].filter(p=>snapshot.paths.includes(p));
  const ordered=[...priority,...snapshot.paths.filter(p=>!priority.includes(p))];
  const coverage=snapshot.repository_index?`저장소 전체 파일 목록을 탐색했습니다. ${snapshot.repository_index.length}개 중 게임 설정 ${snapshot.paths.length}개는 아래에 원문을 수록했습니다. 이미지·소스·개발 자료는 목록으로 식별했으며 바이너리/코드까지 읽었다고 주장하지 마세요. 먼저 BOOTSTRAP과 참조 규칙을 읽고 아래 모든 설정을 확인하세요. 문맥 한계나 첨부 접근 문제로 일부를 읽지 못했다면 settings_loaded를 출력하지 말고 누락 경로를 알리세요. 개발 자료는 게임 설정을 덮어쓰는 규칙이 아닙니다.\n저장소 전체 목록:\n${JSON.stringify(snapshot.repository_index)}\n\n`:'';
  return coverage+`GitHub 설정 원문 전체 스냅샷입니다. 저장소 ${REPO}, 고정 커밋 ${snapshot.sha}, ${ordered.length}개 게임 설정 파일을 UI가 실제로 읽었습니다. 이 채팅의 GM은 아래 문서와 데이터를 읽고 세계관, 인물, 능력치, 성장, 전투, 장비, 기술서, 던전, 전리품, 관계 규칙을 적용하세요. 전문 문서와 최신 승인 설정을 우선하고, 시안은 승인 설정으로 확정하지 마세요. *_SECRET.md 및 BOOTSTRAP의 내부 설정은 GM 판단 전용이며 일반 대사, NPC 지식, 선택지, 지도, 도감, 정보창에 누설하지 마세요. UI 소스/이미지 바이너리는 세계관 원문에 포함하지 않았습니다. 코드나 README의 과거 구현 상태를 게임 규칙으로 취급하지 마세요. 저장 상태의 주인공 이름·시작 위치·패시브·현재 자원과 실제 진행 기록을 유지하세요. 설정 동기화는 새 게임을 만들거나 진행을 초기화하는 행동이 아닙니다. 설정을 읽은 뒤 별도 요약문이나 확인 인사 대신 앞서 요청한 준비 확인 또는 장면을 ercedia_scene JSON 하나로 출력하세요. 설정 읽기만 요청했다면 게임을 진행하지 마세요.\n\n${ordered.map(path=>`<<<GITHUB_SETTING ${path}>>>\n${snapshot.files[path]}\n<<<END_GITHUB_SETTING>>>`).join('\n\n')}`;
}
export function legacyCampaignPrompt(snapshot){
  const paths=['BOOTSTRAP.md','WORLD.md','QUEST_SYSTEM.md','COMBAT_GROWTH.md','PROGRESSION.md',...snapshot.paths.filter(p=>!['BOOTSTRAP.md','WORLD.md','QUEST_SYSTEM.md','COMBAT_GROWTH.md','PROGRESSION.md'].includes(p))];
  return `이 채팅에서 새 캠페인을 시작합니다. 현재 런처는 파일 자동 첨부를 지원하지 않으므로 첨부 파일이 있다고 가정하지 마세요. UI가 확인한 최신 main 커밋은 ${snapshot.sha}입니다. 아래 GitHub 원문을 실제로 읽어 설정을 사용하세요. 열람할 수 없다면 설정을 모두 읽었다고 주장하지 말고 dialogue에서 접근에 필요한 사항을 알려주세요. settings_loaded는 실제로 전부 읽은 경우에만 기록하며 필수는 아닙니다.\n\n설정 원문의 공통 경로: https://raw.githubusercontent.com/${REPO}/${snapshot.sha}/\n필수 시작 문서: https://raw.githubusercontent.com/${REPO}/${snapshot.sha}/BOOTSTRAP.md\n전체 상대 경로 목록(공통 경로 뒤에 붙여 열람):\n${paths.join('\n')}\n\n이미 UI가 읽은 시작 안내 원문:\n${snapshot.files['BOOTSTRAP.md']||''}`;
}
export function campaignNPCStates(snapshot,knownIds){
  const read=path=>JSON.parse(snapshot.files[path]||'{}');
  const roster=[...(read('characters/npc_roster_100.json').characters||[]),...(read('characters/core_cast_stats_38.json').roster||[]),read('characters/serin.json')],allowed=new Set(knownIds),result={};
  for(const p of roster)if(allowed.has(p.id)){const s=p.stats||{},rank=p.rank||'',realm=p.realm||(['master','hyper','expert','basic'][['마스터 나이트','하이퍼 나이트','익스퍼트 나이트','베이직 나이트'].findIndex(r=>rank.includes(r))])||'none';result[p.id]=normalizeNPCProfile({name:p.name,affiliation:p.affiliation,rank,realm,level:p.level,strength:s.strength,dexterity:s.agility,intelligence:s.intelligence,constitution:s.constitution,manaStat:s.mana,hp:s.hp,maxHp:s.max_hp,mp:s.mp,maxMp:s.max_mp,speed:p.combat?.speed,levelHpBonus:p.level_hp_bonus});}
  return result;
}
export function campaignSettingsAttachment(snapshot){
  const name=`ercedia-settings-${snapshot.sha}.txt`;
  return {file:{name,content:campaignSettingsPrompt(snapshot)},instruction:`이번 게임에 적용할 전체 GitHub 설정 ${snapshot.paths.length}개가 '${name}' 파일에 첨부됩니다. 저장소의 고정 커밋 ${snapshot.sha}입니다. 이 파일 안의 BOOTSTRAP부터 각 설정 문서와 JSON 원문을 실제로 읽고 게임 마스터로 진행하세요. *_SECRET.md는 GM 전용이며 NPC 대사·메뉴·선택지에 공개하지 마세요. 파일을 읽을 수 없다면 설정을 읽었다고 주장하거나 첫 장면을 만들지 말고 접근 오류를 알리세요. 읽기를 완료한 경우 앞서 요청한 ercedia_scene JSON 한 개에 settings_loaded={commit:"${snapshot.sha}",file_count:${snapshot.paths.length}}를 추가하여 출력하세요.`};
}
