import test from 'node:test';
import assert from 'node:assert/strict';
import {dialogueGlossary,splitDialogueTerms,renderDialogueTerms} from '../web/dialogue-glossary.js';

test('highlights only exact nouns, retaining particles, punctuation and original text',()=>{
  const text='벨로아 왕국에서 세린은 드라켄으로 간다. <img onerror=alert(1)>';
  const parts=splitDialogueTerms(text,[{name:'벨로아',description:'short'},{name:'벨로아 왕국',description:'long'},{name:'세린',description:'knight'},{name:'드라켄',description:'east'}]);
  assert.equal(parts.map(p=>p.text).join(''),text);
  assert.deepEqual(parts.filter(p=>p.term).map(p=>p.text),['벨로아 왕국','세린','드라켄']);
  assert.equal(parts[0].term.description,'long');
  assert.equal(splitDialogueTerms('가세린 ABC세린 세린ABC',[{name:'세린',description:'x'}]).some(p=>p.term),false);
});
test('escapes punctuation in registered terms and preserves repeated references',()=>{
  const parts=splitDialogueTerms('A+B와 A+B.',[{name:'A+B',description:'literal'}]);
  assert.equal(parts.filter(p=>p.term).length,2);
  assert.equal(splitDialogueTerms('그냥 대사',[])[0].text,'그냥 대사');
});
test('public glossary exposes only public facts and currently named scene participants',()=>{
  const ordinary=dialogueGlossary();
  assert.ok(ordinary.some(t=>t.name==='벨로아'));
  assert.ok(ordinary.some(t=>t.name==='노르발트 변경백령'));
  assert.ok(!ordinary.some(t=>t.name==='세린'));
  assert.ok(!ordinary.some(t=>/마왕|비밀조직/.test(t.name)));
  const known=dialogueGlossary({cast:[{id:'serin',speaker:'세린'}]});
  assert.match(known.find(t=>t.name==='세린').description,/베이직 나이트/);
});

test('desktop renderer uses plain text nodes and noun spans; mobile remains original text',()=>{
  const doc={defaultView:{matchMedia:()=>({matches:true})},createTextNode:text=>({textContent:text}),createElement:tag=>({tag,dataset:{},setAttribute(){}})};
  const line={ownerDocument:doc,children:[],replaceChildren(){this.children=[];},append(n){this.children.push(n);}};
  const text='벨로아에서 <script>alert(1)</script> 세린을 만났다.';
  renderDialogueTerms(line,text,{npc:{id:'serin',speaker:'세린'}});
  assert.equal(line.children.map(n=>n.textContent).join(''),text);
  assert.deepEqual(line.children.filter(n=>n.tag).map(n=>n.textContent),['벨로아','세린']);
  assert.ok(line.children.filter(n=>n.tag).every(n=>n.tag==='span'&&n.className==='dialogue-term'));
  doc.defaultView.matchMedia=()=>({matches:false});
  renderDialogueTerms(line,text);
  assert.equal(line.textContent,text);
});
