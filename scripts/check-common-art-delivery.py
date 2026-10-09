from pathlib import Path
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen, Request
from datetime import datetime, timezone
import json,hashlib,io,sys
root=Path(__file__).resolve().parents[1]
base=sys.argv[1].rstrip('/')
manifest=json.loads((root/'characters/common/art_drafts.json').read_text(encoding='utf-8'))
requests=[(c['id'],kind,c[kind]) for c in manifest['characters'] for kind in ['portrait','standing']]
def check(item):
    id,kind,asset=item
    url=base+'/'+asset['path']
    try:
        with urlopen(Request(url,headers={'User-Agent':'Ercedia-art-validation'}),timeout=60) as r:
            data=r.read();status=r.status;content_type=r.headers.get('Content-Type','')
        im=Image.open(io.BytesIO(data));im.load()
        digest=hashlib.sha256(data).hexdigest()
        ok=status==200 and 'image/png' in content_type and im.mode=='RGBA' and list(im.size)==asset['size'] and im.getchannel('A').getextrema()==(0,255) and digest==asset['sha256']
        return {'id':id,'kind':kind,'url':url,'http_status':status,'content_type':content_type,'size':list(im.size),'mode':im.mode,'alpha_extrema':im.getchannel('A').getextrema(),'sha256':digest,'passed':ok}
    except Exception as e:
        return {'id':id,'kind':kind,'url':url,'passed':False,'error':str(e)}
with ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(check,requests))
report={'checked_at':datetime.now(timezone.utc).isoformat(),'base_url':base,'count':len(results),'all_passed':len(results)==48 and all(r['passed'] for r in results),'files':results,'scope':'HTTP response, image decode, size, RGBA/alpha and exact file hash; does not assert browser UI or game integration.'}
target='local-delivery-validation.json' if base.startswith('http://127.0.0.1') else 'cdn-validation.json'
(root/'artifacts/common-npcs'/target).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'count':len(results),'passed':sum(r['passed'] for r in results),'failed':[r for r in results if not r['passed']]},ensure_ascii=False))
sys.exit(0 if report['all_passed'] else 1)
