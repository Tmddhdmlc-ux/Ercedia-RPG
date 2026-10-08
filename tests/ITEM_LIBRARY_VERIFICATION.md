# Item integration — UI 1.8.3

Registered 300 equipment items, 70 books and 40 materials with 410 existing PNG icons. Source files and artwork remain unchanged. Build checks validate all icon paths and SHA-256 values against item_image_manifest.json, and validate reward references.

The inventory resolves registered id/catalog_id values into canonical names, categories, rarity, descriptions and icons. Existing custom items retain their fallback symbols. Books have a separate category. Owned equipment slots and book-learning controls show registered artwork. The existing three-slot equipment, requirements, resource recalculation, proof-based learning and battle/quest settlement rules remain in place.

The inventory includes a searchable, paginated catalog and 20 monster / 26 dungeon reward tables. Opening the catalog never grants ownership, XP or skills. Loot weights are conditional relative weights, not guaranteed drop probabilities. The runtime ships these reward tables and exposes getItemCatalog(), getItem(id), getLootTables() on bridge v1. GM requests reference source IDs and regional rewards. Loot selection remains adjudicated by the GM and reflected through existing inventory/battle snapshots; this patch does not introduce an automatic loot roll or new reward-claim event.

Build and automated checks: node tampermonkey/build.mjs; node --test tests/*.test.mjs — 119 passed, zero failures. All 410 icon checksums matched the source manifest. Representative equipment/book/material CDN URLs returned HTTP 200 with image/png. Browser click testing and actual ChatGPT/Tampermonkey play were not performed, following AGENTS.md. Existing bridge, scene and save versions remain 1; apply the UI update through the installed launcher.
