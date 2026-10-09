// Move the existing controls; their state owners and event handlers stay intact.
function section(className,label){
  const node=document.createElement('section');node.className=className;
  if(label){const heading=document.createElement('h3');heading.textContent=label;node.append(heading);}
  return node;
}
export function mountStatusDashboard(content,growth){
  const dashboard=section('status-dashboard');
  const identity=section('status-identity'),abilities=section('status-abilities','능력치와 성장');
  const equipment=content.querySelector('.status-equipment');
  identity.append(content.querySelector('.player-heading'),...content.querySelectorAll('.resource'));
  abilities.append(growth,content.querySelector('.attributes'));
  equipment.classList.add('panel-paper');identity.classList.add('panel-paper');abilities.classList.add('panel-paper');
  dashboard.append(identity,abilities,equipment);content.prepend(dashboard);
  return dashboard;
}
export function mountPanelLayouts(){
  const $=id=>document.getElementById(id),bag=$('inventory-panel'),quests=$('quests-panel');
  const heading=document.createElement('h2');heading.className='status-page-title';heading.textContent='모험가 상태';$('status-panel').querySelector('.panel-subnav').before(heading);
  const inventory=section('inventory-workspace'),items=section('inventory-items panel-paper'),detail=section('inventory-detail panel-paper','아이템 정보');
  items.append($('inventory-categories'),$('inventory-scroll'),$('inventory-note'));
  const placeholder=document.createElement('p');placeholder.className='item-detail-empty';placeholder.textContent='소지품을 선택하면 설명과 효과, 보유 수량을 확인할 수 있습니다.';
  detail.append(placeholder,$('item-tooltip'));inventory.append(items,detail);bag.querySelector('.inventory-heading').after(inventory);
  const tools=section('panel-tools');
  for(const node of [...bag.children])if(node.matches('details'))tools.append(node);
  bag.append(tools);
  const workspace=section('quest-workspace'),main=section('quest-main panel-paper'),epics=quests.querySelector('.regional-epics');
  main.append(quests.querySelector('.quest-heading'),quests.querySelector('.quest-filters'),quests.querySelector('.quest-layout'));
  workspace.append(main,epics);quests.querySelector('.panel-close').after(workspace);
  const notes=section('panel-tools quest-notes');
  for(const node of [...quests.children])if(node.matches('details'))notes.append(node);
  quests.append(notes);
}
export function appendEpicProgress(card,{completed,affection}){
  for(const [label,value,max] of [['일반 의뢰 완료',completed,5],['지역 호감도',affection,30]]){
    const row=document.createElement('div');row.className='epic-requirement';
    const text=document.createElement('span');text.textContent=`${label} ${value}/${max}`;
    const bar=document.createElement('progress');bar.max=max;bar.value=Math.max(0,Math.min(max,value));bar.setAttribute('aria-label',label);
    row.append(text,bar);card.append(row);
  }
}
