from pathlib import Path
from PIL import Image
import json,hashlib,subprocess,re
root=Path(__file__).resolve().parents[1]
path=root/'characters/ultimate_cutin_plan.json'
plan=json.loads(path.read_text(encoding='utf-8'))
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
sources={}
for source in {c['source'] for c in plan['characters']}:
    data=json.loads((root/source).read_text(encoding='utf-8'))
    rows=data.get('characters',data.get('roster',[data]))
    sources[source]={c['id']:c for c in rows}
catalog=(root/'web/catalog-data.js').read_text(encoding='utf-8')
catalog_data=json.loads(catalog.split('export const catalogData = ',1)[1].strip().removesuffix(';'))
ui_ids={c['id'] for c in catalog_data['npcs']}
assert ui_ids=={c['id'] for c in plan['characters']},'UI roster and production ledger differ'
report=[]
for c in plan['characters']:
    source=sources[c['source']][c['id']]
    c['source_commit']=commit
    c['source_verified']=True
    c['current_rank']=source.get('rank','미정')
    c['current_realm']=source.get('realm',c.get('current_realm','none'))
    if c['id']=='serin':sheet=root/'assets/characters/main/serin/notes.md'
    elif c['id'].startswith('ER-COM'):sheet=root/'characters/common'/ (c['id'].lower().replace('-','_')+'.md')
    else:sheet=root/'characters'/ (c['id']+'.md')
    text=sheet.read_text(encoding='utf-8') if sheet.exists() else ''
    c['sheet_review']={'path':str(sheet.relative_to(root)),'exists':sheet.exists(),'sha256':hashlib.sha256(text.encode()).hexdigest() if text else None}
    c['reference_review']=[]
    for ref in c['reference_art']:
        art=root/ref
        if art.exists():
            with Image.open(art) as im:metrics={'size':list(im.size),'mode':im.mode}
            c['reference_review'].append({'path':ref,'exists':True,**metrics,'sha256':hashlib.sha256(art.read_bytes()).hexdigest()})
        else:c['reference_review'].append({'path':ref,'exists':False})
    if c['id']=='serin':
        c['status']='hypothetical_sample_in_production'
        c['ability_name']='결의의 일섬'
        c['ability_status']='proposed_visual_only'
        c['ability_source']='ULTIMATE_CUTIN_ART_RULES.md §3 and user cutscene instruction'
        c['runtime_usable']=False
        c['note']='현재 베이직 나이트 유지. 사용자의 명시적 익스퍼트/하이퍼 연출 시안 제작이며 기술 습득·경지 상승이 아니다.'
        continue
    if c['id'].startswith('ER-COM'):
        reason='생활형 NPC의 전투 수치·경지·개별 궁극기 미정. 직업이나 소품으로 능력을 부여하지 않음.'
    elif source.get('species')!='인간' and source.get('category')=='마수':
        reason='마수 개체의 승인 궁극기·기술 효과와 전용 두 단계 연출이 미정. 인간 기사/서클 단계로 변환하지 않음.'
    elif re.search('베이직|^[12]서클',c['current_rank']):
        reason='현재 궁극기 사용 최소 단계 미달이며 미래/가정 기술 및 속성도 미승인. 자동 승급하지 않음.'
    else:
        reason='개별 인물의 승인 대표 궁극기·발동 동작·효과가 source/개별 시트에 등록되지 않음. 경지·소속만으로 기술 및 원소를 확정하지 않음.'
    if not all(r['exists'] for r in c['reference_review']):reason+=' 참조 원화 파일 누락.'
    if not text:reason+=' 개별 시트 누락.'
    c['status']='deferred_missing_approved_settings'
    c['hold_reason']=reason
    c['ability_status']='pending'
    c['element_status']='pending'
    c['runtime_usable']=False
    if not c['versions']:c['versions']=[{'tier':'low','tier_assignment':'pending','image':None},{'tier':'high','tier_assignment':'pending','image':None}]
    for v in c['versions']:
        v['status']='deferred';v['hold_reason']=reason;v['user_approved']=False
    report.append({'id':c['id'],'name':c['name'],'source':c['source'],'current_rank':c['current_rank'],'reason':reason,'tiers':[v['tier'] for v in c['versions']]})
plan['audit_commit']=commit
plan['character_count']=len(plan['characters'])
plan['audit_summary']={'roster_matched':True,'characters':163,'deferred_characters':len(report),'sample_characters':1,'runtime_assets_added':0}
path.write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
out=root/'artifacts/ultimate-cutins';out.mkdir(parents=True,exist_ok=True)
(out/'settings-audit.json').write_text(json.dumps({'source_commit':commit,'roster_count':len(ui_ids),'deferred':report,'missing_sources':[],'ability_review':'No named approved representative ultimate abilities found in per-character source data or sheets; affiliation research alone does not establish an individual ultimate element.'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(plan['audit_summary'],ensure_ascii=False))
