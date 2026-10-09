import {locationArtData} from './location-art-data.js';
const legacy={id:'sunny_village_day',name:'솔브린 마을',category:'legacy',path:'assets/locations/towns/sunny_village/town_day.png'};
export const locationArt=[legacy,...locationArtData.assets];
const byId=new Map(locationArt.map(a=>[a.id,a]));
export function backgroundArt(id){const art=byId.get(id);return art?.id==='IMG-SHARED-11'?null:art||null;}
export function backgroundURL(id,base){const art=byId.get(id);return art?(base||'https://cdn.jsdelivr.net/gh/Tmddhdmlc-ux/Ercedia-RPG@'+locationArtData.assetCommit+'/')+art.path:null;}
export function regionBackground(region){return backgroundArt('IMG-'+region+'-HUB')?.id||null;}
export function resolveBackground(scene,state){
  if(!scene)return legacy.id;
  if(scene.background_id!==null&&scene.background_id!==undefined){
    const art=backgroundArt(scene.background_id),active=state.world_engine?.active_dungeon;
    if(art?.optional&&state.world_engine?.dungeons?.[active]?.zone_id!==art.zone_id)return null;
    return art?.id||null;
  }
  // Only actual scene/game locations participate. Map selection never moves the player.
  const place=scene.game_state?.place||scene.location||state.gameState?.place;
  const world=state.world_engine,active=world?.active_dungeon,run=world?.dungeons?.[active];
  const entrance=locationArt.find(a=>a.dungeon_id===active&&a.category==='dungeon_entrance');
  if(active&&run&&!run.retreated&&entrance&&[active,entrance.name.replace(/ 입구$/,'')].includes(place)){
    const zone=backgroundArt('IMG-'+run.zone_id);if(zone)return zone.id;
  }
  const ranks={dungeon_zone:0,facility_interior:1,faction_location:2,dungeon_entrance:3,region_hub:4,region_overview:5,shared_background:6,facility_exterior:7};
  const matches=locationArt.filter(a=>a.id!=='IMG-SHARED-11'&&[a.id,a.zone_id,a.facility_id,a.faction_id,a.category==='dungeon_entrance'?a.dungeon_id:null,a.name,a.category==='facility_interior'?a.name.replace(/ 내부$/,''):null,a.category==='dungeon_entrance'?a.name.replace(/ 입구$/,''):null].filter(Boolean).includes(place));
  return matches.filter(a=>!a.optional||a.zone_id===run?.zone_id).sort((a,b)=>(ranks[a.category]??9)-(ranks[b.category]??9))[0]?.id||null;
}
export function backgroundContext(state){
  const region=state.gameState?.region,active=state.world_engine?.active_dungeon,zone=state.world_engine?.dungeons?.[active]?.zone_id;
  return {source:'assets/location_image_manifest.json',registered:261,current:state.scene?resolveBackground(state.scene,state):null,
    available:locationArt.filter(a=>a.id!=='IMG-SHARED-11'&&(!a.optional||a.zone_id===zone)&&(['legacy','shared_background'].includes(a.category)||a.region_id===region||a.region_anchor===region)).map(a=>({id:a.id,name:a.name}))};
}
export function mountBackground({image,status,assetBase}){
  let current=null;
  image.addEventListener('load',()=>{image.dataset.status='ready';image.classList.add('ready');});
  image.addEventListener('error',()=>{image.dataset.status='error';image.hidden=true;if(status)status.textContent='배경 이미지 로드 실패 · 등록된 원본 경로를 확인하세요.';});
  return {render(id,visible=true){
    const art=backgroundArt(id);image.hidden=!art||!visible;
    if(!art){current=null;image.removeAttribute('src');delete image.dataset.backgroundId;delete image.dataset.artFit;image.dataset.status='empty';image.classList.remove('ready');return;}
    if(current!==id){current=id;image.dataset.status='loading';image.classList.remove('ready');image.dataset.backgroundId=id;image.dataset.artFit=art.category==='legacy'?'cover':'contain';image.alt=art.name;image.src=backgroundURL(id,assetBase);}
    if(image.dataset.status==='error')image.hidden=true;
  }};
}
