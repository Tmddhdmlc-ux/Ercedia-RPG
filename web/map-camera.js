import {mapData} from './map-data.js';
export const mapViews=[...mapData.regions.map(r=>({id:r.id,label:r.label})),{id:'archipelago',label:'주변 군도'}];
export function regionFrame(id){
  if(id==='world')return {x:0,y:0,width:1,height:1};
  const points=mapData.locations.filter(p=>p.region===id);
  const region=mapData.regions.find(r=>r.id===id);
  if(region)points.push(region);
  if(!points.length)return regionFrame('world');
  const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
  const minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
  // Viewing padding only; these rectangles never define political borders.
  const width=Math.max(.34,maxX-minX+.14),height=Math.max(.32,maxY-minY+.14);
  return {x:Math.max(0,Math.min(1-width,(minX+maxX-width)/2)),y:Math.max(0,Math.min(1-height,(minY+maxY-height)/2)),width,height};
}
export function cameraTransform(frame,viewportWidth,viewportHeight){
  const scale=Math.min(viewportWidth/(frame.width*1536),viewportHeight/(frame.height*1024));
  const centerX=(viewportWidth-frame.width*1536*scale)/2-frame.x*1536*scale;
  const centerY=(viewportHeight-frame.height*1024*scale)/2-frame.y*1024*scale;
  // Keep the focus inside the original image: never pan beyond an image edge.
  const imageWidth=1536*scale,imageHeight=1024*scale;
  const x=imageWidth<=viewportWidth?(viewportWidth-imageWidth)/2:Math.max(viewportWidth-imageWidth,Math.min(0,centerX));
  const y=imageHeight<=viewportHeight?(viewportHeight-imageHeight)/2:Math.max(viewportHeight-imageHeight,Math.min(0,centerY));
  return {scale,x,y};
}
export function viewForSelection(id){
  const point=mapData.locations.find(p=>p.id===id);
  if(point)return point.region;
  return mapViews.some(r=>r.id===id)?id:'world';
}
