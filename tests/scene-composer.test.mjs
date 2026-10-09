import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSceneComposer} from '../web/scene-composer.js';
function node(){return {children:[],dataset:{},style:{setProperty(k,v){this[k]=v;}},events:{},append(n){this.insertBefore(n,null);},insertBefore(n,next){if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(c=>c!==n);this.children.splice(next?this.children.indexOf(next):this.children.length,0,n);n.parentElement=this;n.parentNode=this;},addEventListener(k,f){this.events[k]=f;}};}
test('desktop input is inside the scene, retains handlers/draft, and returns to its original mobile position',()=>{
 const home=node(),stage=node(),composer=node(),footer=node(),media={matches:true,addEventListener(k,f){this.change=f;}};home.append(stage);home.append(composer);home.append(footer);composer.nextSibling=footer;composer.value='작성하던 문장';composer.inert=true;const send=()=>42;composer.onclick=send;composer.offsetHeight=76;
 const ui=mountSceneComposer(stage,composer,{media,Observer:null});assert.equal(composer.parentElement,stage);assert.equal(stage.dataset.composer,'inside');assert.equal(composer.inert,false);assert.equal(composer.value,'작성하던 문장');assert.equal(composer.onclick(),42);assert.equal(stage.style['--vn-composer-height'],'76px');
 composer.offsetHeight=124;ui.measure();assert.equal(stage.style['--vn-composer-height'],'124px');let stopped=false;composer.events.click({stopPropagation(){stopped=true;}});assert.equal(stopped,true);
 media.matches=false;media.change();assert.deepEqual(home.children,[stage,composer,footer]);assert.equal(stage.dataset.composer,undefined);assert.equal(composer.value,'작성하던 문장');assert.equal(composer.onclick,send);media.matches=true;media.change();assert.deepEqual(stage.children,[composer]);
});
test('height changes from response feedback and connection tools reserve room without writing game data',()=>{
 const home=node(),stage=node(),composer=node();home.append(composer);let callback,watched;
 class Observer{constructor(fn){callback=fn;}observe(el){watched=el;}}
 mountSceneComposer(stage,composer,{media:{matches:true},Observer});assert.equal(watched,composer);composer.offsetHeight=210;callback();assert.equal(stage.style['--vn-composer-height'],'210px');composer.offsetHeight=0;callback();assert.equal(stage.style['--vn-composer-height'],'0px');
});
