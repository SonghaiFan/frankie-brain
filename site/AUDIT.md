# Brain introduction audit

## Actual app inspection — 2026-11-06

Opened https://brain-training-game.vercel.app in the shared Ego browser workspace. Selected Schulte Grid, inspected Default and Advanced settings (sizes 3–9, symbols, styles, order and shuffle), configured 3×3, completed a real sequence, and opened Replay. Opened Quick Math, inspected three difficulties, started a 60-second medium round and captured the actual task UI. Audio muted during capture. No app source or stored user history was modified; only a new walkthrough round was generated on this browser origin.

New unretouched UI captures: `site/assets/schulte-current.png`, `grid-current.png`, `replay-current.png`, `math-current.png`. Existing modules/GIF assets retained. Walkthrough time is explicitly not a benchmark.

## Code examined

- `src/index.css`, `src/components/ui/Typography.tsx`, `Button.tsx`: actual Klein blue, gray surfaces, typography hierarchy, 4px buttons, short transitions. Site inherits these tokens and uses system font fallbacks without introducing a font network dependency.
- `src/components/BrainTrainer.tsx`: two modules; validated browser local history limited to 300 entries; no account sync.
- `src/components/games/schulte/schulteCore.ts`: sizes 3–9; direct/reverse/random target order; letter conversion; Gorbov black/red same-value alternation; Fisher–Yates shuffle.
- `src/components/games/SchulteGame.tsx`, `schulte/SchulteMenuView.tsx`, `SchulteBoard.tsx`: presets, targeted mode based on slower number/cell histories, click correctness and error count; elapsed-time score; layout variants.
- `src/components/games/MathGame.tsx`: easy +/−, medium +/−/×, hard includes clean division; result/missing-operand questions; auto-advance and 60-second score.
- `src/components/SchulteReplay.tsx`, `SchulteStats.tsx`, `MathStats.tsx`: replay 0.5/1/2/4× and scrub; timing distributions, cell heatmaps, operation/response-time analysis.

The introduction demo is a small framework-free adaptation of actual grid presentation and shuffle/direct-order rules, not a claim that the full React game is embedded. It has no timer, persistence or app history side effects.

## Concept reference

[Owen et al. (2010), Putting brain training to the test, Nature](https://www.nature.com/articles/nature09042), DOI 10.1038/nature09042. Primary controlled-study reference for distinguishing trained-task performance from broader cognitive transfer. Used only for a concise score-interpretation note; the site makes no efficacy claim for this app.

## Validation

- Standard-library `python3 site/build.py --out /tmp/brain-intro-preview` generates EN root and `zh/`.
- Opened both local language pages at http://127.0.0.1:8312. Desktop has no horizontal overflow.
- Browser-tested demo wrong choice, all nine correct choices, completion and New grid reset (nine enabled cells).
- Local asset/link validation and mobile review are completed by the coordinating agent before publishing.
- Coordinated local link/asset checker: two pages, zero issues. `node --check site/demo.js` passed.
- Mobile browser at 390×844: EN and zh both `scrollWidth === innerWidth === 390`; screenshot reviewed. Desktop screenshot reviewed after image readiness. Per-page device override restored.
- Hero uses a centered CSS crop of the actual original wide capture to enlarge the app panel; source PNG remains untouched. Open Graph image copies the existing approved banner to `media/banner.png`.
