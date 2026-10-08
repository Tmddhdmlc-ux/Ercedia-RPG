from produce_books import ROOT, ART, TEMPLATES, sha, write, validate

paths = sorted(TEMPLATES.glob('*-tier-*.png'))
assert len(paths) == 10
write(ART / 'book-template-qa.json', {
    'date': '2026-10-09', 'method': 'Assistant inspected rendered 10-template contact sheet',
    'contact_sheet': 'assets/art-production/book-template-preview.png',
    'verified_template_sha256': [sha(p) for p in paths],
    'checks': ['2D style', 'sword versus magic-circle emblem readable', 'brown/green/blue/purple/gold covers',
               'silver fittings and ivory page edges preserved', 'no text', 'no rarity frame', 'centered with safe alpha margins'],
    'templates': [{'path': str(p.relative_to(ROOT)).replace('\\', '/'), **validate(p)} for p in paths]
})
