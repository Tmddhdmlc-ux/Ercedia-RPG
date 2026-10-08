import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>JSON.parse(await readFile(path.join(root,p),'utf8'));
const [equipment,books]=await Promise.all([read('equipment/equipment_catalog_300.json'),read('items/book_catalog_70.json')]);
// Public mechanical catalogs only. No NPC secrets or draft artwork enter the UI bundle.
const data={equipment:equipment.items,books:books.books};
await writeFile(path.join(root,'web/engine-data.js'),'// Generated from approved mechanical catalogs.\nexport const engineData='+JSON.stringify(data)+';\n');
