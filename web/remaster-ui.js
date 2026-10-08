// Presentation only: reuse existing controls and keep all game state in its owners.
export function mountRemasterUI(state){
  const $=id=>document.getElementById(id),game=document.querySelector('.game');
  const utility=document.createElement('details');utility.className='game-utility';
  const summary=document.createElement('summary');summary.textContent='메뉴';utility.append(summary);
  const actions=document.createElement('div');actions.className='utility-actions';
  actions.append($('title-return'),document.querySelector('.new-game-actions'));
  utility.append(actions);game.prepend(utility);
  const status=$('status-panel'),content=$('player-content')||status.querySelector('.player-content');
  const growth=$('engine-growth');content.insertBefore(growth,content.querySelector('.skill-heading'));
  const attributes=content.querySelector('.attributes');
  attributes.classList.add('stat-investment');
  const stateNav=document.createElement('nav');stateNav.className='panel-subnav';stateNav.setAttribute('aria-label','상태 정보 분류');
  const skill=document.createElement('section');skill.className='status-skills';
  for(const id of ['starting-passive','skills-empty','skill-list'])skill.append($(id));
  skill.prepend(content.querySelector('.skill-heading'));content.append(skill);
  const people=content.querySelector('.npc-catalog');people.open=false;
  const stats=[...content.children].filter(n=>n!==skill&&n!==people);
  function select(key){for(const node of stats)node.hidden=key!=='stats';skill.hidden=key!=='skills';people.hidden=key!=='people';if(key==='people')people.open=true;for(const b of stateNav.children)b.setAttribute('aria-pressed',String(b.dataset.section===key));}
  for(const [key,label] of [['stats','능력치'],['skills','스킬·패시브'],['people','인물 정보']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.section=key;b.onclick=()=>select(key);stateNav.append(b);}
  status.prepend(stateNav);select('stats');
  const gear=$('engine-gear'),equipment=document.createElement('details'),equipmentSummary=document.createElement('summary');equipmentSummary.textContent='장착 장비·기술서 학습';equipment.className='equipment-drawer';gear.before(equipment);equipment.append(equipmentSummary,gear);
  const realm=document.createElement('p');realm.id='player-realm';$('player-job').after(realm);
  const feedback=document.createElement('div');feedback.className='game-feedback';feedback.hidden=true;feedback.setAttribute('role','status');game.append(feedback);
  const outcome=document.createElement('section');outcome.className='battle-outcome';outcome.hidden=true;outcome.setAttribute('aria-label','확정된 전투 결과');$('story').append(outcome);
  let level=state.player.level,completed=new Set((state.quest_log||[]).filter(q=>q.status==='completed').map(q=>q.id)),activeBattle=null,feedbackTimer;
  function announce(message){feedback.textContent=message;feedback.hidden=false;clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>feedback.hidden=true,3500);}
  for(const id of ['status-panel','inventory-panel','quests-panel','map-panel']){const button=document.createElement('button');button.className='panel-close';button.type='button';button.textContent='이야기로 돌아가기 ×';button.onclick=()=>$('story-tab').click();$(id).prepend(button);}
  const directories=[];for(const id of ['regional-npcs','regional-content']){const section=$(id),details=document.createElement('details'),heading=section.querySelector('h3'),label=document.createElement('summary');label.textContent=heading.textContent;details.className='map-directory';while(section.firstChild)details.append(section.firstChild);details.prepend(label);section.append(details);directories.push({heading,label});}
  const date=document.createElement('span');date.className='hud-date';date.id='hud-date';$('hud-location').after(date);
  const alert=document.createElement('button');alert.className='hud-quest';alert.type='button';alert.onclick=()=>$('quests-tab').click();$('hud-location').after(alert);
  game.dataset.mapCategory='locations';for(const category of ['locations','factions'])$('map-'+category+'-tab').addEventListener('click',()=>game.dataset.mapCategory=category);
  // Keep the input above an on-screen keyboard without changing the save schema.
  const resize=()=>{const viewport=window.visualViewport;game.style.setProperty('--viewport-height',(viewport?.height||window.innerHeight)+'px');};
  window.visualViewport?.addEventListener('resize',resize);window.addEventListener('resize',resize);resize();
  const stage=$('stage');new ResizeObserver(()=>{const scale=Math.min(1,Math.max(.6,stage.clientHeight/455));$('characters').style.transform=`scale(${scale})`;$('characters').style.transformOrigin='50% 0';}).observe(stage);
  $('free-action').addEventListener('focus',()=>{if(window.innerWidth<700)$('free-action').scrollIntoView({block:'nearest'});});
  document.addEventListener('keydown',e=>{if(e.key!=='Escape'||e.defaultPrevented||e.target?.closest?.('input,textarea,select,[contenteditable]'))return;if(state.page!=='story'&&!state.introDraft){e.preventDefault();$('story-tab').click();}});
  return {render(){
    for(const {heading,label} of directories)label.textContent=heading.textContent;
    realm.textContent='경지 · '+({none:'일반',basic:'베이직',expert:'익스퍼트',hyper:'하이퍼',master:'마스터'})[state.player.realm||'none']+(state.engine?.registration?.circle?' · '+state.engine.registration.circle+'서클':'');
    date.textContent=[state.gameState.date,state.scene?.time||state.gameState.time].filter(Boolean).join(' · ');const active=(state.quest_log||[]).filter(q=>['accepted','active','ready_to_report'].includes(q.status));alert.hidden=!active.length;alert.textContent='의뢰 '+active.length;
    if(level!==null&&state.player.level>level)announce('성장 · Lv.'+state.player.level);level=state.player.level;
    const finished=(state.quest_log||[]).filter(q=>q.status==='completed');for(const q of finished)if(!completed.has(q.id))announce('의뢰 완료 · '+q.title);completed=new Set(finished.map(q=>q.id));
    const p=state.battlePlayback;if(p&&!p.done){activeBattle=p.scene.battle.battle_id;outcome.hidden=true;}else if(p?.done&&activeBattle===p.scene.battle.battle_id){activeBattle=null;const result=p.scene.battle.outcome;outcome.replaceChildren();const heading=document.createElement('strong'),body=document.createElement('p'),close=document.createElement('button');heading.textContent=({allied:'승리',enemy:'패배',draw:'비무 종료',escape:'전투 이탈'})[result.winner]||'전투 종료';body.textContent=`${result.reason} · EXP +${result.xp_gain}`;close.type='button';close.textContent='이야기 계속';close.onclick=()=>outcome.hidden=true;outcome.append(heading,body,close);outcome.hidden=false;}
  }};
}
