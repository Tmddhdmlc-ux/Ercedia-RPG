import {initialPlayer} from './intro-model.js';
// Only the old name-only start is eligible. Never reset a progressed or injured save.
export function initializeNameOnlyPlayer(state){
  const p=state.player,name=p?.name?.trim();
  if(!name||state.introDraft||state.battlePlayback&&!state.battlePlayback.done||/^(플레이어|주인공|player)$/i.test(name))return false;
  const fields=['level','strength','dexterity','intelligence','constitution','manaStat','hp','maxHp','mp','maxMp'];
  if(fields.some(k=>p[k]!=null)||(p.xp!=null&&p.xp!==0)||(p.levelHpBonus??0)!==0||(p.unspentStatPoints??0)!==0||(p.realm&&p.realm!=='none')||p.skills?.length)return false;
  state.player={...initialPlayer(name),job:p.job||'',skills:p.skills||[],...(p.battleModifiers?{battleModifiers:p.battleModifiers}:{})};
  return true;
}
