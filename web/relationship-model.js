import {relationshipGraph} from './relationship-data.js';
const entity=id=>relationshipGraph.entities.find(p=>p.id===id);
export function relationshipContext(state){
 const scene=state.scene||{},active=new Set([scene.npc?.id,...(scene.cast||[]).map(p=>p.id),...Object.entries(state.npc_life?.npcs||{}).filter(([,p])=>p.accompanying).map(([id])=>id)].filter(Boolean));
 // One organizational hop preserves context without transmitting every character's graph on every turn.
 const affiliated=new Set(relationshipGraph.edges.filter(e=>active.has(e.from)&&entity(e.to)?.kind==='faction').map(e=>e.to));
 const baseline=relationshipGraph.edges.filter(e=>active.has(e.from)||active.has(e.to)||affiliated.has(e.from)&&entity(e.to)?.kind==='faction'||affiliated.has(e.to)&&entity(e.from)?.kind==='faction').slice(0,60);
 const links=(state.npc_life?.links||[]).filter(e=>active.has(e.from_npc)||active.has(e.to_npc)).slice(-20);
 const used=new Set(baseline.flatMap(e=>[e.from,e.to]));
 return {sources:{public:'characters/relationship_graph_public.json',gm_only:'characters/relationship_graph_gm.json',guide:'CHARACTER_RELATIONSHIPS_GM.md'},entities:relationshipGraph.entities.filter(p=>used.has(p.id)),baseline,actual_links:links,rules:'기본 관계는 새 게임의 출발점이다. 실제 사건의 npc_relation·기억·도착한 소문이 현재 관계를 갱신한다. 타인의 속마음·비공개 관계를 자동으로 알지 않는다. 조직의 적대가 모든 개인의 적대는 아니며 개인 친분이 법·직무·국가 명성을 바꾸지 않는다. lore_only 인물은 이름 설정만 있고 등록 NPC 장면 ID·전투 수치·원화는 미정이다.'};
}
export function publicRelations(state,npcId){
 const known=new Set([npcId,...Object.entries(state.npc_life?.npcs||{}).filter(([,p])=>p.known).map(([id])=>id),state.scene?.npc?.id,...(state.scene?.cast||[]).map(p=>p.id)].filter(Boolean));
 const baseline=relationshipGraph.edges.filter(e=>e.from===npcId||e.to===npcId).filter(e=>{const other=entity(e.from===npcId?e.to:e.from);return other?.kind==='faction'||other?.kind==='person'&&!other.npc_id||known.has(other?.npc_id);}).map(e=>({id:e.id,from:e.from,to:e.to,relation:e.relation,description:e.public_description}));
 // Preserve the latest fact the player actually learned. A hidden later change must not leak by removing it.
 const latest=new Map();for(const e of state.npc_life?.links||[])if(e.player_known)latest.set(e.from_npc+'|'+e.to_npc,e);
 const hiddenPairs=new Set([...latest.values()].map(e=>e.from_npc+'|'+e.to_npc));
 const actual=[...latest.values()].filter(e=>e.player_known&&(e.from_npc===npcId||e.to_npc===npcId)&&known.has(e.from_npc)&&known.has(e.to_npc)).map(e=>({id:e.event_id,from:e.from_npc,to:e.to_npc,relation:e.relation,description:e.reason}));
 return [...baseline.filter(e=>!hiddenPairs.has(e.from+'|'+e.to)),...actual];
}
export function relationshipEntity(id){return entity(id)||null;}
