// Extract a completed scene object from rendered code or surrounding assistant prose.
// Only JSON.parse is used. Strings, escaped quotes and braces inside dialogue are respected.
export function extractSceneJSON(source){
  if(typeof source!=='string'||source.length>120000)return null;
  let depth=0,start=-1,quoted=false,escape=false;
  for(let i=0;i<source.length;i++){
    const char=source[i];
    if(depth===0){if(char==='{'){start=i;depth=1;quoted=false;escape=false;}continue;}
    if(quoted){if(escape)escape=false;else if(char==='\\')escape=true;else if(char==='"')quoted=false;continue;}
    if(char==='"')quoted=true;else if(char==='{')depth++;else if(char==='}'&&--depth===0){
      const candidate=source.slice(start,i+1);try{if(JSON.parse(candidate)?.type==='ercedia_scene')return candidate;}catch{}
    }
  }
  return null;
}
