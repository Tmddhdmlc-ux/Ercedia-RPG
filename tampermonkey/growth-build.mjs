import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const source=new URL('../progression/growth_rules.json',import.meta.url);
const rules=JSON.parse(await readFile(source,'utf8'));
if(rules.version!==1||rules.knights.length!==4||rules.circles.length!==9||Math.abs(rules.knights.reduce((s,r)=>s+r.population_percent,0)-100)>.00001||Math.abs(rules.circles.reduce((s,r)=>s+r.population_percent,0)-100)>.00001)throw Error('성장 규칙 구조·분포 오류');
await writeFile(fileURLToPath(new URL('../web/growth-data.js',import.meta.url)),`// Generated from progression/growth_rules.json.\nexport const growthRules=${JSON.stringify(rules)};\n`);
