import {readFile,writeFile} from 'node:fs/promises';
const pub=JSON.parse(await readFile(new URL('../characters/relationship_graph_public.json',import.meta.url),'utf8'));
const ids=new Set(pub.entities.map(p=>p.id));if(ids.size!==pub.entities.length||pub.edges.some(e=>!ids.has(e.from)||!ids.has(e.to)))throw Error('Invalid public relationship graph');
for(const edge of pub.edges)if(Object.keys(edge).some(k=>!['id','from','to','relation','public_description','section'].includes(k)))throw Error('Private relationship data in public build');
await writeFile(new URL('../web/relationship-data.js',import.meta.url),'// Only allowlisted public facts. GM motivations and unrevealed edges are never bundled.\nexport const relationshipGraph='+JSON.stringify(pub)+';\n');
