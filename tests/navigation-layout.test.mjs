import test from 'node:test';
import assert from 'node:assert/strict';
import {mountNavigationLayout} from '../web/navigation-layout.js';
function node(){return {children:[],append(...nodes){for(const n of nodes){if(n.parent)n.parent.children=n.parent.children.filter(c=>c!==n);n.parent=this;this.children.push(n);}},before(n){const p=this.parent;n.parent=p;p.children.splice(p.children.indexOf(this),0,n);}};}
test('menu and navigation share one flow and sound settings preserve their controls',()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>node()};try{
 const game=node(),tabs=node(),utility=node(),actions=node(),fullscreen=node(),sound=[node(),node(),node()];tabs.inert=true;utility.inert=true;const click=()=>42;fullscreen.onclick=click;tabs.append(fullscreen,...sound);game.append(tabs);utility.querySelector=()=>actions;tabs.querySelectorAll=()=>sound;const row=mountNavigationLayout(game,tabs,utility);
 assert.equal(row.className,'game-navigation');assert.deepEqual(game.children,[row]);assert.deepEqual(row.children,[tabs,utility]);assert.deepEqual(tabs.children,[fullscreen]);assert.deepEqual(actions.children,sound);assert.equal(fullscreen.onclick,click);assert.equal(fullscreen.onclick(),42);assert.equal(tabs.inert,false);assert.equal(utility.inert,false);
 }finally{globalThis.document=old;}
});
