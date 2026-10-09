import {characterLayoutData} from './character-layout-data.js';
export function characterMetrics(id,art){
  const asset=characterLayoutData.assets[art.path];
  if(!asset)throw Error('Unmeasured registered character: '+art.path);
  const portrait=art.path===art.portrait;
  const normalized=portrait?characterLayoutData.groups[art.layoutId||id].portraitBounds:asset.bounds.map((v,i)=>v/(i%2?asset.height:asset.width));
  return {width:asset.width,height:asset.height,bounds:normalized.map((v,i)=>v*(i%2?asset.height:asset.width)),kind:art.kind,portrait};
}
// Uniform scale fits the actual silhouette, rather than the transparent canvas.
// Conversation standings retain the VN upper-body composition; battle shows the full figure.
export function fitCharacter(metrics,width,height,{mode='story',layout=null}={}){
  if(!(width>0&&height>0))return null;
  const [x0,y0,x1,y1]=metrics.bounds,bw=x1-x0,bh=y1-y0;
  const monster=metrics.kind==='monster',targetHeight=height*(mode==='battle'?.88:monster?.65:metrics.portrait?.90:1.28);
  const zoom=layout?layout.scale/260:1;
  const scale=Math.min(targetHeight*zoom/bh,width*.90/bw);
  const artWidth=metrics.width*scale,artHeight=metrics.height*scale;
  const visibleWidth=bw*scale;
  const desiredCenter=width*(layout?layout.x/100:.5);
  const center=Math.min(width*.95-visibleWidth/2,Math.max(width*.05+visibleWidth/2,desiredCenter));
  // Legacy 260%/-120px values now mean the responsive default. Custom offsets remain usable.
  const desiredTop=mode==='battle'?height*.92-bh*scale:monster?height*.12:height*.06+(layout?(layout.y+120)*height/455:0);
  const visibleTop=Math.max(height*.04,desiredTop);
  return {left:center-(x0+x1)*scale/2,top:visibleTop-y0*scale,width:artWidth,height:artHeight,scale};
}
export function applyCharacterFit(element,fit){
  if(!fit)return;
  Object.assign(element.style,{left:fit.left+'px',top:fit.top+'px',width:fit.width+'px',height:fit.height+'px',transform:'none'});
}
export function mountCharacterFit(container,elements,{mode='story'}={}){
  let metrics=null,layout=null;
  const refresh=()=>{if(metrics){const fit=fitCharacter(metrics,container.clientWidth,container.clientHeight,{mode,layout});for(const element of elements)applyCharacterFit(element,fit);}};
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(refresh):null;
  observer?.observe(container);
  return {set(id,art,adjustment=null){metrics=characterMetrics(id,art);layout=adjustment;refresh();},refresh,disconnect(){observer?.disconnect();}};
}
