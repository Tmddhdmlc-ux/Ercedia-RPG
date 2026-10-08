import {damageFormula} from './player.js';
export function mountPlayer(state){
  const $=id=>document.getElementById(id),p=state.player;
  const display=v=>v===null?'—':v.toLocaleString('ko-KR');
  const skillViews=new Map();
  function summary(){
    $('player-name').textContent=p.name.trim()||'주인공';$('player-job').textContent=p.job.trim()||'직업 미정';$('player-level').textContent=display(p.level);
    for(const [id,current,max] of [['hp','hp','maxHp'],['mp','mp','maxMp'],['xp','xp','requiredXp']]){
      $(id+'-text').textContent=`${display(p[current])} / ${display(p[max])}`;
      const bar=$(id+'-bar'),known=p[current]!==null&&p[max]!==null&&p[max]>0;
      bar.max=known?p[max]:1;bar.value=known?Math.min(p[current],p[max]):0;bar.classList.toggle('unset',!known);
      bar.setAttribute('aria-valuetext',known?`${p[current]} / ${p[max]}`:'정보 미정');
    }
    $('xp-remaining').textContent=p.requiredXp===null||p.xp===null?'경험치 정보 미정':`다음 레벨까지 ${display(Math.max(0,p.requiredXp-p.xp))} EXP`;
    for(const k of ['strength','dexterity','intelligence'])$(k+'-text').textContent=display(p[k]);
    for(const [skill,view] of skillViews)updateSkill(skill,view);
  }
  function skillCount(){const count=p.skills.filter(s=>s.enabled).length;$('skill-count').textContent=String(count);$('skills-empty').hidden=count>0;}
  function updateSkill(skill,view){
    view.title.textContent=skill.name.trim()||'스킬 이름 미입력';view.description.textContent=skill.description.trim()||'설명 미입력';view.formula.textContent=skill.formula.trim()||'데미지 공식 미입력';
    view.badge.textContent=skill.enabled?'사용 가능':'사용 불가';view.card.classList.toggle('unavailable',!skill.enabled);
    const result=damageFormula(skill.formula,p);view.damage.textContent=result.value===null?result.message:`공식 계산값 · ${result.value.toLocaleString('ko-KR')}`;view.damage.classList.toggle('formula-error',result.value===null&&!!skill.formula);
  }
  function appendSkill(skill){
    const card=document.createElement('article');card.className='skill-card';
    const heading=document.createElement('div');heading.className='skill-card-heading';
    const title=document.createElement('h4'),badge=document.createElement('span');heading.append(title,badge);
    const description=document.createElement('p');description.className='skill-description';
    const formula=document.createElement('code');formula.className='skill-formula';
    const damage=document.createElement('p');damage.className='damage-preview';
    card.append(heading,description,formula,damage);$('skill-list').append(card);
    const view={card,title,badge,description,formula,damage};skillViews.set(skill,view);updateSkill(skill,view);
  }
  for(const skill of p.skills.filter(s=>s.enabled))appendSkill(skill);
  summary();skillCount();
}
