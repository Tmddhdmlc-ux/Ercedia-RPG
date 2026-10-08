import {mapData} from './map-data.js';
import {newPlayer,normalizePlayer} from './player.js';
export const KEY = 'ercedia.vn.v04';
export const outfitKeys = ['armor', 'casual', 'nightwear'];
export const expressionKeys = ['base','smile','angry','surprised','sad','embarrassed','afraid','annoyed','love'];
export const regionKeys = ['village','world','west','east','south','wild','ruins',...mapData.regions.map(r=>r.id),...mapData.locations.map(p=>p.id)];
export const defaultLayout = () => ({scale:260,x:50,y:-120});
export const defaults = () => ({version:1,outfit:'armor',expression:'base',layouts:Object.fromEntries(outfitKeys.map(k=>[k,defaultLayout()])),background:true,character:true,index:0,region:'village',page:'story',player:newPlayer()});
const num = (value,min,max,fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max,Math.max(min,Math.round(value))) : fallback;
export function normalize(raw) {
  const s=defaults();
  if (!raw || typeof raw !== 'object' || raw.version !== 1) return s;
  for (const [key,choices] of Object.entries({outfit:outfitKeys,expression:expressionKeys,region:regionKeys,page:['story','map','status']})) if (choices.includes(raw[key])) s[key]=raw[key];
  for (const k of outfitKeys) { const l=raw.layouts?.[k]; if (l) s.layouts[k]={scale:num(l.scale,50,400,260),x:num(l.x,0,100,50),y:num(l.y,-350,200,-120)}; }
  for (const k of ['background','character']) if(typeof raw[k] === 'boolean') s[k]=raw[k];
  s.index=num(raw.index,0,3,0);
  s.player=normalizePlayer(raw.player);
  return s;
}
export function load(storage) {
  try { const data=storage.getItem(KEY); return {state:data ? normalize(JSON.parse(data)) : defaults(),message:data ? '저장된 설정을 불러왔습니다.' : '설정은 이 브라우저에 저장됩니다.'}; }
  catch { return {state:defaults(),message:'저장값을 읽지 못해 기본 설정으로 시작합니다.'}; }
}
