const number=(v,min=0,max=999999)=>typeof v==='number'&&Number.isFinite(v)?Math.min(max,Math.max(min,Math.floor(v))):null;
const text=(v,max)=>typeof v==='string'?v.slice(0,max):'';
export const newPlayer=()=>({name:'',job:'',level:null,hp:null,maxHp:null,mp:null,maxMp:null,xp:null,requiredXp:null,strength:null,dexterity:null,intelligence:null,skills:[]});
export function normalizePlayer(raw){
  const p=newPlayer();if(!raw||typeof raw!=='object')return p;
  p.name=text(raw.name,40);p.job=text(raw.job,60);
  for(const k of ['level','hp','maxHp','mp','maxMp','xp','requiredXp','strength','dexterity','intelligence'])p[k]=number(raw[k],k==='level'?1:0);
  for(const k of ['constitution','manaStat'])if(Object.hasOwn(raw,k))p[k]=number(raw[k]);
  for(const k of ['levelHpBonus','unspentStatPoints'])if(Object.hasOwn(raw,k))p[k]=number(raw[k]);
  if(Object.hasOwn(raw,'circle')){if(!Number.isInteger(raw.circle)||raw.circle<0||raw.circle>9)throw Error('서클은 0~9 정수입니다.');p.circle=raw.circle;}
  if(Object.hasOwn(raw,'realmAbilities')){if(!Array.isArray(raw.realmAbilities)||raw.realmAbilities.length>30||raw.realmAbilities.some(id=>typeof id!=='string'||id.length>80))throw Error('경지 능력 목록 오류');p.realmAbilities=[...new Set(raw.realmAbilities)];}
  if(raw.uniqueAbility&&typeof raw.uniqueAbility.name==='string'&&typeof raw.uniqueAbility.description==='string')p.uniqueAbility={name:text(raw.uniqueAbility.name,60),description:text(raw.uniqueAbility.description,2000)};
  if(Object.hasOwn(raw,'realm'))p.realm=['none','basic','expert','hyper','master'].includes(raw.realm)?raw.realm:'none';
  if(raw.battleModifiers&&typeof raw.battleModifiers==='object'){p.battleModifiers={};for(const key of ['weapon_attack','technique_bonus','equipment_hp_bonus','status_hp_bonus','equipment_mp_bonus','status_mp_bonus','equipment_speed_bonus','status_speed_bonus'])p.battleModifiers[key]=number(raw.battleModifiers[key]??0,-999999);}
  for(const [current,max] of [['hp','maxHp'],['mp','maxMp']])if(p[current]!==null&&p[max]!==null)p[current]=Math.min(p[current],p[max]);
  if(Array.isArray(raw.skills))p.skills=raw.skills.slice(0,70).filter(s=>s&&typeof s==='object').map(s=>({name:text(s.name,60),description:text(s.description,800),formula:text(s.formula,240),enabled:s.enabled!==false,...(Number.isInteger(s.circle)&&s.circle>=1&&s.circle<=9?{circle:s.circle}:{}),...(typeof s.reflectable==='boolean'?{reflectable:s.reflectable}:{}),...(typeof s.id==='string'?{id:text(s.id,80)}:{}),...(typeof s.book_id==='string'?{book_id:text(s.book_id,80)}:{}),...Object.fromEntries(['mp_cost','spell_base_power','technique_bonus'].filter(k=>Number.isInteger(s[k])&&s[k]>=0).map(k=>[k,s[k]])),...(typeof s.element==='string'?{element:s.element}:s.element===null?{element:null}:{})}));
  return p;
}
// Small arithmetic parser: user formulas never execute JavaScript.
export function damageFormula(formula,player){
  if(!formula.trim())return {value:null,message:'데미지 공식 미입력'};
  try{
    if(formula.length>240)throw Error('공식은 240자까지 입력할 수 있습니다.');
    const source=formula.replaceAll('근력','STR').replaceAll('민첩','DEX').replaceAll('지능','INT').replaceAll('레벨','LV').replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-');
    const tokens=[];const re=/\s*(?:(\d+(?:\.\d*)?|\.\d+)|([A-Za-z]+)|([()+\-*/]))/gy;
    let pos=0;
    while(pos<source.length){if(!source.slice(pos).trim())break;re.lastIndex=pos;const m=re.exec(source);if(!m)throw Error('숫자, 능력치와 + − × ÷ ( )만 사용할 수 있습니다.');tokens.push(m[1]??m[2]?.toUpperCase()??m[3]);pos=re.lastIndex;}
    if(tokens.length>128)throw Error('공식이 너무 깁니다.');
    const vars={STR:player.strength,DEX:player.dexterity,INT:player.intelligence,LV:player.level};let i=0;
    const atom=()=>{const t=tokens[i++];if(t==='+'||t==='-'){const v=atom();return t==='-'?-v:v;}if(t==='('){const v=expression();if(tokens[i++]!==')')throw Error('괄호를 확인하세요.');return v;}if(t&&Object.hasOwn(vars,t)){if(vars[t]===null||!Number.isFinite(vars[t]))throw Error(`${t} 능력치를 먼저 입력하세요.`);return vars[t];}if(t&&/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(t))return Number(t);throw Error('공식 형식을 확인하세요.');};
    const product=()=>{let v=atom();while(tokens[i]==='*'||tokens[i]==='/'){const op=tokens[i++];const r=atom();if(op==='/'&&r===0)throw Error('0으로 나눌 수 없습니다.');v=op==='*'?v*r:v/r;}return v;};
    const expression=()=>{let v=product();while(tokens[i]==='+'||tokens[i]==='-'){const op=tokens[i++];const r=product();v=op==='+'?v+r:v-r;}return v;};
    const value=expression();if(i!==tokens.length)throw Error('공식 형식을 확인하세요.');if(!Number.isFinite(value))throw Error('계산 가능한 범위를 벗어났습니다.');
    return {value:Math.round(value*100)/100,message:''};
  }catch(error){return {value:null,message:error.message};}
}
