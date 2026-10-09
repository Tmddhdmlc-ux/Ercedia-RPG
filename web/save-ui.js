import {KEY,normalize} from './state.js';
import {SLOT_COUNT,slotRecords,writeSlot,slotCandidate,saveSummary} from './save-slots.js';
import {hasGameSave} from './title-menu.js';
export function mountSaveUI(state,{storage,isPending,restore,enter}){
  const game=document.querySelector('.game'),dialog=document.createElement('dialog');
  dialog.className='save-window';dialog.setAttribute('aria-labelledby','save-window-title');
  const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
  const header=node('header'),heading=node('h2','',''),close=node('button','닫기 ×');heading.id='save-window-title';close.type='button';header.append(heading,close);
  const tabs=node('nav','','save-window-tabs'),saveTab=node('button','저장'),loadTab=node('button','불러오기');tabs.append(saveTab,loadTab);
  const hint=node('p','','save-window-hint'),list=node('div','','save-slot-list'),message=node('p','','save-window-message'),confirm=node('button','','save-slot-confirm');message.setAttribute('role','status');
  dialog.append(header,tabs,hint,list,message,confirm);
  let mode='load',selected=null,overwrite=false,opener=null;
  function finish(){dialog.close();opener?.focus?.({preventScroll:true});}
  close.onclick=finish;dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
  // Gameplay shortcuts must not send a choice while a save dialog is open.
  document.addEventListener('keydown',event=>{if(!dialog.open)return;event.stopImmediatePropagation();if(event.key==='Escape'){event.preventDefault();finish();}},{capture:true});
  function select(id){selected=id;overwrite=false;message.textContent='';refresh();}
  function refresh(){
    heading.textContent=mode==='save'?'여정 저장':'여정 불러오기';
    saveTab.setAttribute('aria-pressed',String(mode==='save'));loadTab.setAttribute('aria-pressed',String(mode==='load'));
    saveTab.disabled=game.dataset.title==='active'||!hasGameSave(state);
    hint.textContent=mode==='save'?'슬롯을 선택해 현재 여정을 보관하세요. 자동 저장과 별도로 유지됩니다.':'저장된 여정을 선택하세요. 불러오면 현재 진행이 선택한 시점으로 돌아갑니다.';
    list.replaceChildren();const slots=slotRecords(state.save_slots);
    function card(id,record,automatic=false){
      const button=node('button','','save-slot');button.type='button';button.dataset.slot=String(id);button.setAttribute('aria-pressed',String(selected===id));
      const saved=automatic?(hasGameSave(state)?state:null):record?.state;
      button.append(node('span',automatic?'자동 저장 · 이어하기':`저장 슬롯 ${id}`,'save-slot-label'));
      if(saved){const s=saveSummary(saved);button.append(node('strong',`${s.name} · Lv.${s.level}`),node('span',s.place),node('span',`${s.date||'날짜 미기록'}${s.intro?' · 문답 진행 중':''}`),node('span',`HP ${s.hp} · MP ${s.mp} · 진행 의뢰 ${s.quests}개`));
        let time='현재 자동 저장';if(!automatic){time='시각 미기록';try{if(record.saved_at&&Number.isFinite(Date.parse(record.saved_at)))time=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'}).format(new Date(record.saved_at));}catch{}}
        button.append(node('small',time));
      }else button.append(node('strong','비어 있는 슬롯'),node('span',mode==='save'?'이곳에 새로 저장할 수 있어요.':'저장된 여정이 없습니다.'));
      button.disabled=mode==='load'&&!saved;button.onclick=()=>select(id);list.append(button);
    }
    if(mode==='load')card('auto',null,true);
    for(let i=1;i<=SLOT_COUNT;i++)card(i,slots.find(s=>s.id===i));
    const blocked=isPending()&&selected!=='auto';confirm.disabled=selected===null||blocked||(mode==='save'&&!hasGameSave(state));
    confirm.textContent=blocked?'응답·전투가 끝난 뒤 이용해주세요':mode==='save'?(overwrite?'덮어쓰기 확정':'선택한 슬롯에 저장'):'이 여정 불러오기';
  }
  function open(nextMode){mode=nextMode;selected=null;overwrite=false;message.textContent='';opener=document.activeElement;const parent=game.dataset.title==='active'?document.getElementById('title-screen'):game;parent.append(dialog);dialog.inert=false;refresh();dialog.showModal();close.focus();}
  saveTab.onclick=()=>{mode='save';select(null);};loadTab.onclick=()=>{mode='load';select(null);};
  confirm.onclick=()=>{
    if(selected===null||confirm.disabled||isPending()&&selected!=='auto')return;
    try{
      if(mode==='save'){
        if(slotRecords(state.save_slots).some(s=>s.id===selected)&&!overwrite){overwrite=true;message.textContent='이 슬롯의 기존 저장을 덮어씁니다. 계속하려면 아래 버튼을 다시 누르세요.';refresh();return;}
        writeSlot(state,storage,KEY,selected);overwrite=false;message.textContent=`슬롯 ${selected}에 저장했습니다.`;refresh();
      }else{
        if(selected==='auto'){finish();enter();return;}
        const candidate=slotCandidate(state,selected,normalize);storage.setItem(KEY,JSON.stringify(candidate));finish();restore(candidate,{prepared:true,deferRender:true});enter();
      }
    }catch(error){message.textContent=`${mode==='save'?'저장':'불러오기'} 실패 · ${error.message} · 현재 여정과 기존 슬롯은 유지됩니다.`;}
  };
  const actions=document.querySelector('.utility-actions');
  for(const [kind,label] of [['save','저장하기'],['load','불러오기']]){const button=node('button',label);button.type='button';button.id=`menu-${kind}-game`;button.onclick=()=>{document.querySelector('.game-utility').open=false;open(kind);};actions.prepend(button);}
  return {open,hasSlots:()=>slotRecords(state.save_slots).length>0,refresh(){if(dialog.open){dialog.inert=false;refresh();}}};
}
