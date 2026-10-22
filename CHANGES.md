# October 2026 optimization pass

Everything you could do before still works the same way, with the same saved data. Browser saves and downloaded `.json` backups from the old version load unchanged (same storage keys, same snapshot format).

## Speed

Measured on production builds with all four widgets open (average of 3 runs in headless Chrome):

| | Before | After |
| --- | --- | --- |
| Script time while idle (per 10 s) | 6.8 ms | 1.7 ms |
| Script time to type 315 characters in the editor | 387 ms | 183 ms |
| JavaScript downloaded on first load | 422 KB (110 KB gzip) | 292 KB (90 KB gzip) |

What made the difference:

- **The menu bar clock re-rendered the whole desktop every second**, including every open widget. It is now its own component that updates once a minute.
- **Widgets are memoized with stable callbacks.** Clicking inside a window that is already in front no longer re-renders anything; bringing one window forward no longer re-renders the others.
- **World Clock**: the create/edit form keeps its own state (it used to be 17 `useState` hooks in the parent, so every keystroke re-rendered every card). Event and Chronicle cards are memoized, so advancing one event re-renders one card.
- **Browser storage writes are debounced** instead of running `JSON.stringify` + `localStorage.setItem` on every keystroke and click. Pending writes are flushed before saving, restoring, or leaving the page, so nothing is lost.
- **World Clock and Dice Roller load on first open** (they are closed by default).
- **Diff view** is computed only when its tab is open, with a proper algorithm (a 6,000-word document diffs in about 4 ms).
- **The em dash sanitizer** skips its nine regex passes when the text has nothing to fix (most keystrokes).
- **Server**: Vite is only loaded in development; built assets get a one-year cache header; the Gemini request is cancelled if the browser disconnects.

## Bugs fixed

1. **Diff view was unreliable.** The old greedy diff dropped spaces (words ran together) and reported matching words as removed and re-added. In 3,000 randomized tests it could not reproduce the original text two times out of three. The new diff is exact and minimal. It also compares against the text you actually submitted, not whatever is in the editor now.
2. **World Clock alerts could silently fail and Chronicle entries could duplicate.** History was written from inside another state update and the alert read back through closure variables, which React does not guarantee. All World Clock changes now go through one pure reducer.
3. **Threshold cards were styled backwards.** A broken class expression gave reached thresholds on light cards no styling and gave locked ones the amber "reached" look.
4. **Light-on-light text in dark mode.** Several World Clock labels used `dark:` classes, so with the OS in dark mode they turned pale on white cards. They now follow the card's own theme.
5. **Chronicle "expand cycles" did nothing on first click** for records with two or more cycles.
6. **Clicking the last step block of a repeatable event** finished the cycle but did not log it to the Chronicle (the Advance button did). Both now log it.
7. **Dice Roller hid your most recent roll after a page reload.** Rolls now use the browser's cryptographic random generator with no modulo bias. Dice per group are capped at 100 and sides at 2 to 1,000.
8. **Ctrl+Enter fired the AI edit from anywhere**, including while typing in the Scratchpad, while the editor was minimized, or while an edit was already running. It now only works when focus is inside the editor, and never double-submits.
9. **Typing `--` or a double space mid-sentence threw the cursor to the end of the text.** The cursor now stays where you are typing.
10. **Rule settings popover**: clicking the same chevron again re-opened it instead of closing it.
11. **Window resizing** jumped when a left or top edge hit the minimum size (Scratchpad, Dice Roller, World Clock), and the World Clock could be dragged off screen. All windows now share one frame with consistent limits.
12. **Restoring a damaged backup could crash the desktop.** Backups are validated first. If saving fails because browser storage is full, you now get a message instead of a silent failure.
13. **"Remove Base Events"** now removes the sample Chronicle record right away (it used to disappear only after a reload).
14. **`npm install` failed** with a dependency conflict (an unused `esbuild` pin clashed with Vite 8). Removed the unused `esbuild`, `autoprefixer` and `motion` packages.
15. **Server**: a rule group with every sub-option turned off used to add a blank instruction to the prompt; section headers are now recognized even if the model varies the spacing or case; a missing `GEMINI_API_KEY` gives a clear message; requests are validated and capped at 200,000 characters.
16. A few World Clock messages used em dashes, which clashed with the app's own no-em-dash rule. They now use colons.

## Small additions

- Menus and the samples dropdown close when you click outside them or press Escape; Escape also closes the Save & Load dialog.
- Double-click a window's title bar to toggle full screen.
- `npm test` runs 23 unit tests covering the World Clock rules, diff, sanitizer and prompt builder.

## Code structure

- The 3,930-line World Clock file is now a folder of focused modules (largest file about 600 lines). The "advance an event" rules were written out three times; they now exist once in `eventTracker/logic.ts`.
- Four copies of the window drag/resize code (about 200 lines each) became one `WindowFrame` component.
- The nine toolbar buttons and the four Save & Load summary tiles are defined as data instead of copied markup. Toolbar presets live in `src/editPresets.ts`.
- Storage keys live in one file (`src/lib/storage.ts`).
- The server imports the same `removeEmDashes` and `EditConfig` the browser uses instead of keeping its own copies.
