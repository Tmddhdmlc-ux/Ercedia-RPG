from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
plan=json.loads((root/'artifacts/common-npcs/generation-plan.json').read_text(encoding='utf-8'))
vp=root/'artifacts/common-npcs/validation.json'
validation=json.loads(vp.read_text(encoding='utf-8'))
assert validation['all_present'] and validation['all_passed']
assert len({f['sha256'] for f in validation['files']})==48
files={(f['id'],f['kind']):f for f in validation['files']}
for f in validation['files']:
    f['visual_review']='Contact sheets reviewed: distinct identity, occupation silhouettes, matching portrait/standing costume, full standing head/feet/props. Final detailed artistic approval pending user.'
vp.write_text(json.dumps(validation,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
manifest={'schema_version':1,'status':'draft_pending_user_review','engine_registered':False,'source_roster':'characters/common_npc_roster.json','source_commit':plan['source_commit'],'generation_mode':'built-in image_gen','character_count':24,'image_count':48,'characters':[]}
for j in plan['jobs']:
    manifest['characters'].append({'id':j['id'],'name':j['name'],'job':j['job'],'kingdom_id':j['specification']['kingdom_id'],'location_id':j['specification']['location_id'],'approval':'pending_user_review','portrait':{'path':j['portrait_path'],'size':[1086,1448],'sha256':files[(j['id'],'portrait')]['sha256']},'standing':{'path':j['standing_path'],'size':[1024,1536],'sha256':files[(j['id'],'standing')]['sha256'],'temporary_foot_anchor':[512,1459]},'sheet':'characters/common/'+j['id'].lower().replace('-','_')+'.md'})
    sheet=root/manifest['characters'][-1]['sheet']
    txt=sheet.read_text(encoding='utf-8').replace('artifacts/common-npcs/validation.json에 기록 예정','artifacts/common-npcs/validation.json에서 크기·RGBA 투명도·여백 검사 통과')
    txt=txt.replace('CDN/UI 확인: 제작 완료 후 기록. 코드 작성만으로 성공으로 표시하지 않음.','CDN/UI 확인: CDN 결과는 artifacts/common-npcs/cdn-validation.json에 별도 기록. 비교 이미지 육안 검수 완료; 실제 엔진·ChatGPT 플레이는 미검증.')
    sheet.write_text(txt,encoding='utf-8')
(root/'characters/common/art_drafts.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('24 characters / 48 unique transparent PNG drafts, complete manifest.')
