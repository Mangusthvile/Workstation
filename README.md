# Workstation

A desktop-style writing workstation that runs in the browser. Four draggable windows share one desktop:

- **Text Editor**: nine toggleable revision rules (proofreading, flow, lore rules, section splitting and more) sent to Gemini through the local server. Em dashes are stripped everywhere.
- **World Clock**: progress tracker for story events, quests and quotas, with thresholds, repeatable cycles and a Chronicle of completed events.
- **Dice Roller**: multiple dice groups, each with its own modifier and label.
- **Quick Scratchpad**: a plain notes pad.

Everything is saved in the browser automatically. **Ctrl+S** saves a full checkpoint, and the folder icon in the menu bar restores it or exports/imports a `.json` backup.

## Running it

Requires Node 20 or newer.

```bash
npm install
cp .env.example .env      # then put your key in GEMINI_API_KEY
npm run dev               # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Express + Vite dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `NODE_ENV=production npm start` | Serves `dist/` and the API (run `build` first) |
| `npm test` | Unit tests for the editing engine, diff, sanitizer and World Clock rules |
| `npm run lint` | Type-check |

## Layout

```
server.ts                    Express app: /api/edit (Gemini) and static hosting
server/editEngine.ts         Prompt building, section parsing, retry rules (pure, tested)
src/
  components/
    Desktop.tsx              Menu bar, dock, window stacking, save/load
    desktop/                 Snapshot format, Save & Load modal, menu bar clock
    window/WindowFrame.tsx   Shared draggable/resizable window used by every widget
    TextEditorWidget.tsx     Editor window
    Toolbar.tsx              The nine rule buttons (defined as data)
    OutputViewer.tsx         Result tabs: sections, full text, diff, applied rules
    DiceRollerWidget.tsx
    ScratchpadWidget.tsx
    eventTracker/            World Clock, split by concern:
      state.ts               Reducer: every World Clock action in one place
      logic.ts               Pure rules: progression, cycles, filters, summaries
      EventCard.tsx / HistoryCard.tsx / EventForm.tsx / ProgressDisplay.tsx / parts.tsx
  lib/                       Storage keys and debounced writes, shared hooks, browser helpers
  editPresets.ts             Toolbar presets
  textSanitizer.ts           Em dash removal (shared by browser and server)
  diffUtil.ts                Word-level Myers diff
tests/                       node:test suites (run with npm test)
```

See `CHANGES.md` for what the October 2026 optimization pass changed and why.
