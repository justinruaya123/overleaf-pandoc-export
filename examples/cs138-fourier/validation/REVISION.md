# Format and handout revision — 9 November 2026

## Verified behavior

- The original SCL title background, affiliation/logos, sidebar, font settings,
  and default slide geometry are used. A native contents slide follows the title.
- The lecture-specific fixed-height body/prompt/equation boxes are removed.
- Native `slide[content][notes]`, `handout[]`, `handout-slide[]`, and expanding
  `eq-alt` work with compiler-input overrides and disabled-rendering gates.
- The default lecture has 39 logical pages / 119 animation pages. The native
  final-state handout has 45 pages, including six optional readings.
- Lecturer Pandoc output shows rolling current/next page pairs, with their
  respective notes. Student output omits professor notes. Off mode skips Pandoc.
- Both named source settings and `config-common(handout: true)` are honored.
- Percentage-width grids have a bounded rendering region; all five lecture
  grids retain their diagrams and mathematical labels.

## Checks

| Check | Result |
|---|---|
| `npm test`, with Typst and Chromium configured | 61 tests: 53 passed, 8 Windows-only skips, 0 failures. |
| Native compiler | Typst 0.15.1; lecture and native handout compile without warnings. |
| Pandoc | Pandoc 3.1.3; real lecturer/student HTML passes through its reader and writer. |
| Browser | Chromium 136.0.7103.25; lecture, lecturer, and student outputs pass offline desktop/mobile checks with JavaScript disabled. |
| Graphics and text | No clipped equation or diagram bounds, collapsed images, unresolved SVG references, duplicate IDs, or horizontal page overflow in browser checks. Native PDF text-bounds checks also pass. |
| Lecturer order | Every next panel matches the immediate next page and its notes; the final page has no next panel. |
| Source ZIP | 74 source/asset files; extracted project compiles directly with its pinned Typst packages. No generated previews or Python build files are required. |
| Independent review | No remaining must-fix findings after correcting source handout-setting compatibility. |

The mathematical conventions and derivations were retained; see
`DCS-grounding.md` and `MATHEMATICS.md`. Generated QA files remain outside
the source package.
