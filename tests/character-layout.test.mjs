import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
import {registeredArt,characterVisual} from '../web/character-art.js';
import {characterLayoutData} from '../web/character-layout-data.js';
import {characterMetrics,fitCharacter,mountCharacterFit} from '../web/character-layout.js';
import {mountNPCArt} from '../web/npc-art-ui.js';
import {mountSceneCast} from '../web/scene-cast.js';
import {faceFit} from '../web/face-fit.js';
import {pngBounds} from '../tampermonkey/png-bounds.mjs';
import {uiHarness} from './ui-harness.mjs';
const variants=[...Object.entries(registeredArt).flatMap(([id,a])=>a.expressions.map(emotion=>({id,art:characterVisual(id,'none',emotion)}))),...['armor','casual','nightwear'].map(outfit=>({id:'serin',art:characterVisual('serin',outfit,'base')}))];
const epsilon=1e-6;
test('every registered person, monster, expression and Serin outfit has measured original canvas dimensions',()=>{
  assert.equal(new Set(variants.map(v=>v.id)).size,163);
  assert.equal(Object.keys(characterLayoutData.assets).length,634);
  for(const {id,art} of variants){const m=characterMetrics(id,art),png=readFileSync(art.path);assert.equal(m.width,png.readUInt32BE(16));assert.equal(m.height,png.readUInt32BE(20));assert.ok(m.bounds[2]>m.bounds[0]&&m.bounds[3]>m.bounds[1]);}
});
test('desktop, narrow, portrait and landscape frames keep every head and silhouette width inside each 1–3 person slot',()=>{
  for(const {id,art} of variants)for(const [width,height] of [[1367,794],[1000,455],[390,560],[844,240]])for(const count of [1,2,3])for(const mode of ['story','battle']){
    const m=characterMetrics(id,art),w=width/count,f=fitCharacter(m,w,height,{mode}),[x0,y0,x1,y1]=m.bounds;
    assert.ok(f.left+x0*f.scale>=w*.05-epsilon,id);
    assert.ok(f.left+x1*f.scale<=w*.95+epsilon,id);
    assert.ok(f.top+y0*f.scale>=height*.04-epsilon,id);
    assert.ok(Math.abs(f.width/f.height-m.width/m.height)<epsilon,id+' stretched');
    if(mode==='battle'||m.portrait||m.kind==='monster')assert.ok(f.top+y1*f.scale<=height+epsilon,id+' bottom clipped');
  }
});
test('expression swaps share one union anchor and scale; legacy defaults become responsive and custom offsets cannot crop heads',()=>{
  for(const [id,a] of Object.entries(registeredArt))if(a.expression_portraits){
    const baseline=fitCharacter(characterMetrics(id,characterVisual(id,'none','base')),900,600);
    for(const emotion of a.expressions)assert.deepEqual(fitCharacter(characterMetrics(id,characterVisual(id,'none',emotion)),900,600),baseline);
  }
  const m=characterMetrics('serin',characterVisual('serin','armor'));
  assert.deepEqual(fitCharacter(m,1000,455,{layout:{scale:260,x:50,y:-120}}),fitCharacter(m,1000,455));
  for(const layout of [{scale:400,x:0,y:-350},{scale:400,x:100,y:200}]){
    const f=fitCharacter(m,390,560,{layout});assert.ok(f.top+m.bounds[1]*f.scale>=22.4-epsilon);assert.ok(f.left+m.bounds[0]*f.scale>=19.5-epsilon);
  }
});
test('Serin body and face share identical geometry before and after a stage resize, preserving registered face coordinates',()=>{
  const saved=globalThis.ResizeObserver;let callback;globalThis.ResizeObserver=class {constructor(fn){callback=fn;}observe(){}disconnect(){}};
  try{
    const container={clientWidth:1000,clientHeight:455},body={style:{}},face={style:{}},ui=mountCharacterFit(container,[body,face]);
    for(const outfit of ['armor','casual','nightwear']){
      ui.set('serin',characterVisual('serin',outfit));assert.deepEqual(body.style,face.style);
      container.clientWidth=390;container.clientHeight=560;callback();assert.deepEqual(body.style,face.style);
      const s=parseFloat(body.style.width)/1024,fit=faceFit[outfit];
      assert.ok(Math.abs(parseFloat(face.style.height)*fit.y/1536-fit.y*s)<epsilon);
      assert.ok(Math.abs(parseFloat(face.style.width)*fit.size/1024-fit.size*s)<epsilon);
    }
  }finally{if(saved===undefined)delete globalThis.ResizeObserver;else globalThis.ResizeObserver=saved;}
});
test('single NPC and cast controllers both apply measured geometry on their actual render paths',()=>{
  const h=uiHarness();try{
    h.get('characters').clientWidth=1367;h.get('characters').clientHeight=794;
    const ui=mountNPCArt({status:{textContent:''}});
    for(const {id,art} of variants.filter(v=>v.id!=='serin')){
      ui.render({id,outfit:'none',emotion:art.emotion,speaker:id},true);
      assert.ok(parseFloat(ui.image.style.width)>0,id);assert.equal(ui.image.style.transform,'none');
    }
    const state={character:true,sceneIndex:0,scene:{cast:[{id:'serin',outfit:'armor',emotion:'base',speaker:'세린'}],dialogue:[]}};
    const cast=mountSceneCast(state,{onSelect(){}}),slot=h.get('scene-cast').children[0];slot.clientWidth=390;slot.clientHeight=560;cast.render();assert.ok(parseFloat(slot.children[0].style.width)>0);
  }finally{h.close();}
});
test('alpha measurement decodes all five PNG row filters and includes faint edge pixels',()=>{
  const width=3,height=5,rgba=Buffer.alloc(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(y*width+x)*4;rgba[p]=x*60;rgba[p+1]=y*40;rgba[p+2]=120;rgba[p+3]=x===1&&y>0&&y<4?1:0;}
  const paeth=(a,b,c)=>{const p=a+b-c,d=[Math.abs(p-a),Math.abs(p-b),Math.abs(p-c)];return d[0]<=d[1]&&d[0]<=d[2]?a:d[1]<=d[2]?b:c;};
  const raw=Buffer.alloc((width*4+1)*height);
  for(let y=0;y<height;y++){const filter=y,offset=y*(width*4+1);raw[offset]=filter;for(let x=0;x<width*4;x++){const p=y*width*4+x,a=x>=4?rgba[p-4]:0,b=y?rgba[p-width*4]:0,c=y&&x>=4?rgba[p-width*4-4]:0;const pred=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c);raw[offset+x+1]=(rgba[p]-pred)&255;}}
  const chunk=(type,data)=>{const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);b.write(type,4);data.copy(b,8);return b;};
  const hdr=Buffer.alloc(13);hdr.writeUInt32BE(width);hdr.writeUInt32BE(height,4);hdr[8]=8;hdr[9]=6;
  const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',hdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
  assert.deepEqual(pngBounds(png),{width,height,bounds:[1,1,2,4]});
});
