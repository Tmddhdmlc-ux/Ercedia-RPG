import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),read=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const catalog=await read('assets/characters/production/catalog.json');
const roster=(await read('characters/npc_roster_100.json')).characters;
const core=(await read('characters/core_cast_stats_38.json')).roster;
const map=await read('assets/maps/world/map_locations.json');
const factions=(await read('assets/maps/world/faction_locations.json')).locations;
const compact=s=>(s||'').replace(/\s/g,'');
const placements=[],characters={};
for(const p of [...roster,...core]){
  const art=catalog.characters.find(a=>a.id===p.id);if(!art?.assets.portrait)throw Error('Missing character art: '+p.id);
  const anchor=map.locations.find(a=>a.id===p.location_id);if(!anchor)throw Error('Unknown parent location: '+p.id);
  const faction=factions.find(f=>f.anchor_id===p.location_id&&(f.leader===p.name||compact(f.name)===compact(p.affiliation)))||
    factions.find(f=>f.anchor_id===p.location_id&&compact(f.name).startsWith(compact(p.affiliation)));
  placements.push({id:p.id,location_id:anchor.id,region:anchor.region,faction_id:faction?.id||null,x:faction?.x??anchor.x,y:faction?.y??anchor.y,position_kind:faction?'faction_anchor':'region_anchor',exact_position:false});
  characters[p.id]={portrait:art.assets.portrait.path,standing:art.assets.standing?.path||null,expressions:['base'],outfits:['none'],kind:p.species==='마수'?'monster':'human'};
}
if(placements.length!==138||new Set(placements.map(p=>p.id)).size!==138)throw Error('Incomplete placements');
const serin=await read('characters/serin.json'),serinAnchor=map.locations.find(p=>p.id===serin.location_id);
if(!serinAnchor)throw Error('Serin location missing');
placements.push({id:'serin',location_id:serinAnchor.id,region:serinAnchor.region,faction_id:null,x:serinAnchor.x,y:serinAnchor.y,position_kind:'region_anchor',exact_position:false});
const symbols={kingdoms:{},lordships:{},factions:{}};
for(const h of catalog.heraldry){
  if(h.group==='kingdom')symbols.kingdoms[({veloa:'west',draken:'east',lumerin:'south'})[h.id]]=h.path;
  else if(h.group==='lordship')symbols.lordships[h.id]=h.path;
  else {
    const ids=({'ER-CREST-001':['KN01'],'ER-CREST-002':['KN02'],'ER-CREST-003':['KN03'],'ER-CREST-004':['KN04'],'ER-CREST-005':['KN05'],'ER-CREST-006':['KN06'],'ER-CREST-007':['GD01','GD02','GD03'],'ER-CREST-008':['TR01']})[h.id];
    if(!ids)throw Error('Unknown crest');for(const id of ids)symbols.factions[id]=h.path;
  }
}
await writeFile(new URL('characters/art_registry.json',root),JSON.stringify({schema_version:1,approved_for_engine:'User requested engine integration on 2026-10-09',asset_commit:'ab565b9d07281376e4982b14de51406060e158e7',characters,symbols},null,2)+'\n');
await writeFile(new URL('characters/npc_placements.json',root),JSON.stringify({schema_version:1,sources:['characters/serin.json','characters/npc_roster_100.json','characters/core_cast_stats_38.json','assets/maps/world/map_locations.json','assets/maps/world/faction_locations.json'],note:'설정상 기본 활동 지역과 기존 거점의 표시 좌표. 실시간 위치·새 국경·새 지점의 확정이 아님.',placements},null,2)+'\n');
console.log('Registered '+placements.length+' character placements, 138 new art sets and 24 symbols.');
