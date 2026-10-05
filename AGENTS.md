# AGENTS.md

## Project Shape
- Static HTML5 Canvas game; there is no package manifest, bundler, dependency install, or configured test runner.
- `index.html` is the only page and loads `game.js` directly with a plain `<script>` tag.
- Game logic, rendering, input, state, and the main loop all live in `game.js`.

## Run And Verify
- Open `index.html` directly in a browser, or run `npx serve .` from the repo root and visit `http://localhost:3000`.
- There are no automated build/lint/test commands in this repo; verify changes by playing in the browser.

## Editing Notes
- Keep browser-compatible plain JavaScript; do not introduce imports, modules, npm scripts, or build tooling unless explicitly requested.
- Canvas size is duplicated: `index.html` sets `width="800" height="600"`, and `game.js` uses `const W = 800` / `const H = 600`; update both if changing dimensions.
- Existing UI text and comments are mostly Spanish; match that style for player-facing text.
