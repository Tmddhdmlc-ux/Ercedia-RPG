import {damageFormula} from './player.js';
export function mountPlayer(state,onChange){
  const $=id=>document.getElementById(id),p=state.player;
  const fields=[['name','이름','text',40],['job','직업','text',60],['level','레벨','number'],['hp','현재 체력','number'],['maxHp','최대 체력','number'],['mp','현재 마나','number'],['maxMp','최대 마나','number'],['xp','현재 경험치','number'],['requiredXp','다음 레벨 필요 경험치','number'],['strength','근력','number'],['dexterity','민첩','number'],['intelligence','지능','number']];
  const display=v=>v===null?'—':v.toLocaleString('ko-KR');
  const inputs=new Map(),skillViews=new Map();
  function summary(){
    $('player-name').textContent=p.name.trim()||'주인공';$('player-job').textContent=p.job.trim()||'직업 미정';$('player-level').textContent=display(p.level);
    for(const [id,current,max] of [['hp','hp','maxHp'],['mp','mp','maxMp'],['xp','xp','requiredXp']]){
      $(id+'-text').textContent=`${display(p[current])} / ${display(p[max])}`;
      const bar=$(id+'-bar'),known=p[current]!==null&&p[max]!==null&&p[max]>0;
      bar.max=known?p[max]:1;bar.value=known?Math.min(p[current],p[max]):0;bar.classList.toggle('unset',!known);
      bar.setAttribute('aria-valuetext',known?`${p[current]} / ${p[max]}`:'미입력');
    }
    $('xp-remaining').textContent=p.requiredXp===null||p.xp===null?'현재·필요 경험치를 입력해주세요.':`다음 레벨까지 ${display(Math.max(0,p.requiredXp-p.xp))} EXP`;
    for(const k of ['strength','dexterity','intelligence'])$(k+'-text').textContent=display(p[k]);
    for(const [skill,view] of skillViews)updateSkill(skill,view);
  }
  for(const [key,label,type,maxLength] of fields){
    const wrapper=document.createElement('label');wrapper.textContent=label;
    const input=document.createElement('input');input.type=type;input.id='player-input-'+key;input.value=p[key]??'';input.placeholder=type==='text'?'미정':'—';
    if(type==='number'){input.min=key==='level'?'1':'0';input.max='999999';input.step='1';}else input.maxLength=maxLength;
    input.addEventListener('input',()=>{
      p[key]=type==='text'?input.value.slice(0,maxLength):input.value===''?null:Number.isFinite(Number(input.value))?Math.min(999999,Math.max(key==='level'?1:0,Math.floor(Number(input.value)))):null;
      for(const [current,max] of [['hp','maxHp'],['mp','maxMp']])if(p[current]!==null&&p[max]!==null&&p[current]>p[max]){p[current]=p[max];inputs.get(current).value=p[current];}
      summary();onChange();
    });
    input.addEventListener('change',()=>{input.value=p[key]??'';});
    inputs.set(key,input);wrapper.append(input);$('player-fields').append(wrapper);
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
