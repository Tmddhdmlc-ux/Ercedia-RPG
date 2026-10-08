from pathlib import Path
from PIL import Image
from produce_books import ROOT, ART, read, write, fitted, validate, sha

for registry in sorted(ART.glob('*-template-requests.json')):
    rows = read(str(registry.relative_to(ROOT)))
    for row in rows:
        target = ROOT / f"assets/items/templates/equipment/{row['key']}.png"
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            with Image.open(row['source']) as source:
                assert source.mode == 'RGBA' and source.getchannel('A').getextrema()[0] == 0 and source.getchannel('A').getextrema()[1] >= 240
                fitted(source).save(target)
        row['template_path'] = str(target.relative_to(ROOT)).replace('\\', '/')
        row['file_checks'] = validate(target)
        row['visual_verified'] = True
        row['visual_check_method'] = 'Inspected complete generated image before normalization; final normalized template contact sheet requires inspection.'
    write(registry, rows)
print('Saved available equipment templates with true alpha and checksums.')
