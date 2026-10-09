# New-game ChatGPT handoff — UI 2.1.3 / launcher 1.2.0

The localhost preview previously downloaded GitHub settings but had no transport to ChatGPT. The launcher only ran on ChatGPT pages. This change adds a local-to-new-chat transfer through the same Tampermonkey script and its shared extension storage.

## User flow

1. Install/update launcher 1.2.0 in Chrome or Edge; allow it on ChatGPT and the local game page. Log in to ChatGPT.
2. Open http://127.0.0.1:4184/?game=1 in that browser. Start a new game and complete its character/name/region choices.
3. Completion automatically transfers the exact GitHub snapshot already loaded and the newly created save into a fresh ChatGPT tab. A second connect-button click is not required. The visible connection button is a retry/continuation option.
4. The new ChatGPT launcher loads the latest UI with that save, attaches the complete settings file, and sends the first GM request. It uses the existing composer and response reader; no API key or new API service is introduced.
5. The engine requires a settings_loaded acknowledgement matching the commit/file count before accepting the first GM scene. This checks the response contract, not the model's internal comprehension.

The URL contains only a random transfer ID. Setting text, GM secrets and player state are not put in the URL. Only same-window/same-origin messages from the local game on port 4184 are accepted. Transfers expire after ten minutes and are consumed once. An existing /c/ conversation cannot consume a new-chat transfer. The original local save is preserved. An unrecognized composer/file input, missing launcher, login problem or failed upload is reported without claiming successful settings delivery or automatically resending.

## Verification

Automated checks cover complete settings, invalid/incomplete packets, matching origins, duplicate transfer suppression, expiry, refusal to overwrite existing conversations, automatic new-game completion, full-file bootstrap dispatch and collapsed attachment-menu discovery. The game bundle and generated launcher are rebuilt; all 158 repository tests pass. The current 194-file snapshot produces a 973,647-character attachment, within the supported size. Launcher syntax checks pass.

Actual browser/ChatGPT/Tampermonkey execution and 20-turn play have not been verified. The extension must be installed in the browser running the local game; a standalone preview without the extension cannot deliver messages across to a different browser. Launcher 1.2.0 adds localhost permissions and an open-tab grant, so this transport change requires a launcher update once. Later ordinary UI updates continue to use the existing update mechanism. Bridge, scene schema and save versions remain 1.
