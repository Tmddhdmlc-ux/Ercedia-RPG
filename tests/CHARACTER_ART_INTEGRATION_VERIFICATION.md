# Character art integration — UI 1.8.0

User approved engine integration on 2026-10-09. No source PNG, geography, canonical statistic or world setting was changed.

## Registered assets and placements

- 138 new characters: 118 human standings and portraits, 20 monster portraits; 256 PNGs.
- 24 unique heraldry PNGs: 3 kingdoms, 13 lordships, 8 documented faction crests. Shared guild emblems remain shared.
- Serin keeps her existing three outfits and nine facial expressions.
- All 139 characters have an activity-region placement derived from source location_id. Public faction members use their existing faction anchor when matched; others use their existing region anchor. Coordinates are representative, not exact live positions or new settlements.
- Regional cards show names, affiliations, portraits and meeting/exploration requests. Selecting a name opens that person's status card. Map selection does not teleport anyone or confirm a meeting.
- A confirmed NPC location_id update persists in optional npcStates and updates regional cards and the next GM context. Unknown region IDs are rejected.

## Checks completed

`node tampermonkey/build.mjs` rebuilt the game bundle and update manifest.
`node --test tests/*.test.mjs`: 100 passed, zero failures.

Checks cover all registered file paths, original region/faction coordinates, all 138 scene IDs, own-character dialogue/battle images, monster rendering, missing-image behavior, save roundtrip, movement context, participant art validation and staged image-health checks. Existing battle, engine, intro, launcher, quest and save checks also passed. Deferred thumbnails do not block update health checks; immediately loaded assets are still checked.

Bridge version 1, scene schema 1 and save version 1 remain unchanged. The existing installed launcher can apply UI 1.8.0 without reinstallation.

## Verification limits

No browser demonstration or click test was performed, following AGENTS.md. Actual ChatGPT/Tampermonkey execution and 20-turn gameplay/update testing were not performed and are not claimed as passed. Previous image-production transparency/CDN checks remain recorded in assets/characters/production/validation.json and jsdelivr_samples.json; this change preserves those image files and pins their existing commit.
