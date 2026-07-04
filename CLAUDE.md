# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Dumply — a Chrome MV3 **side panel** extension for brain-dumping tasks. Users dump free-form text; an AI "detective penguin" (Alfredo) splits it into tasks/events/feelings, prioritizes with MoSCoW, and syncs with Google Calendar. Vanilla JS, no framework, no build step, no package.json.

## Commands

- **Run**: load unpacked at `chrome://extensions` (Developer mode → Load unpacked → repo root). The side panel is `sidepanel.html`; `fullpage.html` is the same app as a full tab.
- **Syntax check**: `node --check <file>` (no linter is configured).
- **Tests**: ad-hoc runner files (`lib/*.test.js`), no test framework. Run in the extension's DevTools console (`IconsTest.run()`, `TagsW5H1Test.run()`), or in Node for DOM-free modules:
  ```sh
  node -e "const fs=require('fs');eval(fs.readFileSync('lib/tags.js','utf8')+'\nglobal.AlfredoTags=AlfredoTags;');eval(fs.readFileSync('lib/tags.test.js','utf8'));"
  ```

## Architecture

### Globals + script order, not modules

Every JS file is an IIFE exposing one global (`AlfredoStorage`, `AlfredoTags`, `AlfredoAI`, `AlfredoI18n`, `DumplyIcons`, …). `app/*.js` files additionally share bare globals (`state`, `t()`, `$`, `persist()`, `renderAll()`, …) across files. Load order is defined by the `<script>` lists at the bottom of **both** `sidepanel.html` and `fullpage.html`: `lib/*` first, then `app/core.js` → views → `app/handlers.js` near-last. New files must be added to both HTML files in dependency order.

**Cache-bust convention**: every script tag carries `?v=N`. When you edit a JS file, bump its `?v=` in both `sidepanel.html` and `fullpage.html`.

### State

One state object persisted by `lib/storage.js` under `chrome.storage` key `alfredo_ext_v2`. `DEFAULT_STATE` there is the schema source of truth: `memos` (tasks/feelings/ponders), `timeline` (events), `remember` (follow-ups), `condition` (energy/mood), `settings` (BYOK API keys, provider, language, theme, user dictionary of proper nouns). `background.js` (service worker: alarm → notification, calendar sync trigger) reads the same key directly. Task-memo field defaults live in `memoTaskFields()` in `app/core.js` — add new memo fields there.

### Brain-dump parsing pipeline (the core feature)

`makeSense()` in `app/handlers.js`:

1. **AI path**: `AlfredoAI.extractDump()` (`lib/ai.js`) sends a bilingual (ko/en) prompt to the user's provider — Anthropic/OpenAI/Gemini behind one `chat()` abstraction, BYOK keys in settings. Returns intent-level items.
2. **Local fallback** (no key / AI failure): `extractDumpLocal()` uses rule-based classifiers in `lib/tags.js` (`classifyLine`, `parseComposeInput`, `extractFiveW1H`).
3. `materializeDumpItem()` routes by `kind`: `event`(+time) → `state.timeline`, `remember` → `state.remember`, `task`/`feeling`/`ponder` → `state.memos`, `done` → dropped. Duplicates are skipped; `relatedTo` links prep tasks to events and back-fills deadlines.

Item taxonomy (`kind`): `event` / `task` / `remember` / `feeling` / `ponder` / `done`. Each parsed item also carries **5W1H** fields — `who`/`where`/`how`/`why` (when = `date`/`time`, what = `title`) — extracted by both the AI prompt and `AlfredoTags.extractFiveW1H()` particle rules. They're stored as `memo.w5h1`, mapped on events to `with`/`location` (how/why → `notes`), and shown as 👥/📍/🔧/💡 chips in the parse rationale (inbox 🔎 line and detail view).

Every dump-created memo gets a parse trace (`parseRationale`, `parseSnapshot`) via `attachParseTrace()` — the judgment log (`lib/decisions.js`) references it, so keep it populated when adding parse outputs.

### AI prompt conventions (`lib/ai.js`)

Prompts are per-language (`ko`/`en`) plain strings selected via `getLang()`, demand JSON-only responses, and are parsed by regex-matching the first `[...]`/`{...}` then validated/clamped field-by-field. Faithfulness rules (keep user's wording, never invent names/dates) are load-bearing — preserve them when editing prompts. All new response fields need sanitization in the corresponding extract function.

### i18n

All UI strings go through `t(key, ...args)` from `lib/i18n.js` (dictionary lookup, `ko` fallback; values may be functions taking args). Static HTML uses `data-i18n` attributes. See `I18N_GUIDE.md` for adding a language. User-visible strings hardcoded in JS are a bug except where existing code branches on `AlfredoI18n.lang() === 'en'` inline.

### Not the extension

`landing/` is the static marketing site (deployed via Vercel — PR previews come from there); `src/assets/` holds design assets. Neither is loaded by the extension.
