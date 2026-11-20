# Talonbox

54 classic card games in the browser — one for every card in a full deck, Jokers included.
Solitaire, solo and dungeon games, casino tables, trick-taking and party games against computer opponents
who each have a name and a hidden playing style.
React + TypeScript + Vite + Tailwind CSS, with Zustand and Motion. Everything runs in the browser; nothing is saved on a server.

```
npm install
npm run dev           # http://localhost:5173
npm test              # rule tests (Vitest)
npm run e2e           # browser tests (Playwright, uses the Chrome installed on this machine)
npm run lint          # Oxlint
npm run format        # Prettier
npm run check         # typecheck + lint + format check + rule tests
npm run build         # typecheck + production build
```

Append `?seed=<number>` to a game URL (e.g. `#/play/klondike?seed=42`) to replay a specific deal.

## Layout

| Path                         | What lives there                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `src/core/`                  | Cards, decks, seeded RNG, shuffle, shared rule helpers: poker hands, trick-taking, rummy melds (no React)          |
| `src/engine/`                | `createGameStore` (undo, rule variants, auto steps, clock) and `<GameScreen>` (control bar, hints, sounds, result) |
| `src/ui/`                    | `<Card>` (faces and backs are SVG), `<Pile>`, `<Table>`, `<Seat>`, `<TrickTable>`, drag and drop                   |
| `src/games/<id>/`            | One folder per game: `logic.ts`, `logic.test.ts`, `Board.tsx`, `index.ts`                                          |
| `src/games/registry.ts`      | Game catalog, lazy loaders, categories and table tones                                                             |
| `src/games/guides.ts`        | The how-to-play guide for every game                                                                               |
| `src/games/cpuLevel.ts`      | Easy / Normal / Hard setting, opponent names, hidden personalities and decision timing                             |
| `src/pages/home/previews.ts` | The miniature table drawn for each game in the home gallery                                                        |
| `e2e/`                       | Playwright tests, including layout checks on phones held both ways                                                 |

## Adding a game

1. Write the rules as pure functions in `src/games/<id>/logic.ts` implementing `GameRules<S, A>`:
   `setup(rng, options)`, `reduce(state, action)` (return the same object for illegal moves) and `status(state)`.
   Optional: `auto(state)` for CPU turns or timed steps, `hint(state)` for the Hint button, `stuck(state)` for the
   "no more useful moves" notice, `score` and `summary`. Randomness during play must come from a seed in the state.
2. Add `logic.test.ts`.
3. Build `Board.tsx` from `Pile`/`Card`. Moving a card between piles in state is enough; it animates by its ID.
   Wrap the board in `DragProvider` to enable drag and drop between piles that have an `id`.
   Size cards with `columnsStyle(columns, maxWidth, tall)` so the table also fits a phone held sideways.
4. Export a `GameDefinition` from `index.ts`, then add the metadata and loader in `registry.ts`.
5. Add the game's guide to `src/games/guides.ts` and its miniature table to `src/pages/home/previews.ts`.
   `src/games/catalog.test.ts` fails until both exist.
6. Pick the game's `category` in `registry.ts`: `solitaire`, `special` (solo and dungeon), `casino`, `trick-taking`
   or `cpu` (table and party games). The category sets the home filter and the table colour.
7. Rule variants go in the definition's `options` (use `CPU_OPTION` for computer opponents); the chosen values arrive
   as the second argument of `setup`, and players change them from the Rules panel (their last choice is remembered).
8. Computer opponents: call `drawSeats(rng, n)` from `cpuLevel.ts` after dealing to give each one a name and a hidden
   personality, use `TRAITS` to bias their choices, and `tempo()` for the `delayMs` of their `auto` steps.
   Set `undoable: false` on games with hidden cards or opponents.

## Notes

- Set `og:image` in `index.html` to an absolute URL once the site has a domain; some social networks ignore relative paths.
- Lint uses Oxlint because typescript-eslint does not support TypeScript 7 yet.
