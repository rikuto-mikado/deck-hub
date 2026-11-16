# Talonbox

Fifteen classic card games in the browser — solitaire, casino and table games against the computer.
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
| `src/core/`                  | Cards, decks, seeded RNG, shuffle, shared rule helpers (no React)                                                  |
| `src/engine/`                | `createGameStore` (undo, rule variants, auto steps, clock) and `<GameScreen>` (control bar, hints, sounds, result) |
| `src/ui/`                    | `<Card>` (faces and backs are SVG), `<Pile>`, `<Table>`, `<Seat>`, drag and drop                                   |
| `src/games/<id>/`            | One folder per game: `logic.ts`, `logic.test.ts`, `Board.tsx`, `index.ts`                                          |
| `src/games/registry.ts`      | Game catalog, lazy loaders, table tones                                                                            |
| `src/games/guides.ts`        | The how-to-play guide for every game                                                                               |
| `src/games/cpuLevel.ts`      | Easy / Normal / Hard setting shared by games with computer players                                                 |
| `src/pages/home/previews.ts` | The miniature table drawn for each game in the picker                                                              |
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
6. Rule variants go in the definition's `options` (use `CPU_OPTION` for computer opponents); the chosen values arrive
   as the second argument of `setup`, and players change them from the Rules panel (their last choice is remembered).

## Notes

- Set `og:image` in `index.html` to an absolute URL once the site has a domain; some social networks ignore relative paths.
- Lint uses Oxlint because typescript-eslint does not support TypeScript 7 yet.
