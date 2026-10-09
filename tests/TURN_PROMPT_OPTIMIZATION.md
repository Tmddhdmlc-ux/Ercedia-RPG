# Continuation request optimization — UI 2.1.69

Initial settings preparation and explicit settings synchronization still read the
complete approved settings. After an acknowledged setup or a validated turn in
the current mounted conversation, action requests reuse those rules and include
relevant live context. Restoring a save resets that trust and uses a full first
request. Failed responses never establish it. Pending settings attachments also
force the full path.

The request always retains the current player, inventory, clock, engine state,
quest log, loadout, scoped NPC memories, relationships and available backgrounds.
Selected choice kind/quest_id, action text and active dungeon determine optional
trade, crafting, exploration, epic, growth and combat context. These filters
change request packaging, not action validation or settlement.

The biggest removed field is the global `loot.dungeon_pools` list (about 212,000
characters). The UI already consumes these pools for its own loot lottery; GM
requests retain the lottery rules without duplicating the pools.

Reproducible example: `defaults()` with `gameState` set to W1 / 솔브린 마을 /
1000-01-01 / 09:00, request ID `req`, comparing `actionPrompt` default and
`{compact:true}`. Counts are JavaScript string characters, not model tokens.

| Action | Full | Continuation | Reduction |
| --- | ---: | ---: | ---: |
| 세린에게 안부를 묻는다. | 244717 | 6494 | 97% |
| 상점에서 견적을 확인한다. | 244718 | 11350 | 95% |
| 던전을 탐색한다. | 244713 | 17890 | 93% |

Automated coverage checks reduction, state preservation, choice metadata,
active-dungeon context, failed-response fallback, and the actual UI's switch to
compact requests and reset after restoration. Existing response-repair and
settings-confirmation tests remain applicable. Live ChatGPT response latency,
Tampermonkey installation and a 20-turn play session were not measured here.
