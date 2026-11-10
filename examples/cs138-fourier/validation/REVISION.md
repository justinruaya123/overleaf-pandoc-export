# SCL restoration and continuous handouts — 10 November 2026

## Template and source

- All 22 vendored template `.typ` files match the original SCL implementation
  at `justinruaya123/scl-beamer-typst@e44fbc3065970836dca3d1a61cb8111474185959`.
- The opt-in `scl-handout.typ` file wraps the original functions. It preserves
  explicit composers, callback bodies, ordinary equation behavior, and native
  title/bullet/block rendering. Original and wrapped component fixtures produce
  byte-identical SVG pages.
- Fourier slides use native triangular lists, SCL definition/example blocks,
  and bibliography entries. The contents slide follows the supplied Fourier
  PDF: blue linked section names without dot leaders or page numbers.
- The old `prompt`, `stage`, and `sanity` visual wrappers are removed.
- Handout additions and professor notes keep their independent rendering gates.

## Continuous export

Pandoc produces one scrolling HTML document with a faint border around each
slide and a smaller slide title. Every selected slide appears once in source
order. Lecturer notes follow their own content; student output omits them.
The old next-page copies, four-panel grid, and forced page breaks are removed.

| Output | Slides | Professor-note sections |
|---|---:|---:|
| Ordinary lecture HTML | 39 | 0 |
| Student handout HTML | 45 | 0 |
| Lecturer handout HTML | 45 | 45 |

The six optional pages occur before the references. All contents destinations
resolve; IDs are unique. Seven SCL block elements and 71 semantic lists are
preserved in the handouts. Off mode succeeds without a Pandoc executable.

## Fresh verification

| Check | Result |
|---|---|
| `npm run test:typst` | 39 tests: 33 passed, 6 Windows-only skips, 0 failures. |
| Full `npm test` | 66 tests: 54 passed, 2 environmental failures, 10 skips. The two unchanged LaTeX/TikZ tests cannot run because this environment lacks `pdflatex.fmt`; skips are 8 Windows-only and 2 browser tests. |
| Native compiler | Typst 0.15.1; lecture has 119 reveal pages / 39 logical slides, and the final-state handout has 45 pages. Both compile successfully. |
| Native visual inspection | Contents, triangular bullets, normal/example blocks, coefficient derivation, and bibliography inspected against the original SCL examples. No text crosses page boundaries. |
| HTML export | Real Pandoc 3.1.11.1 reader/writer; source-order, note privacy, optional-slide, link, and unique-ID checks pass. |
| Browser rendering | Not verified this session. The execution sandbox blocks Chromium sockets; automatic approval review rejected the elevated launch. The available browser interface blocks local-file URLs. |
| Source package | The 75-file Typst-only ZIP passes integrity and source-byte checks. Both lecture and handout entrypoints compile from the extracted ZIP, with no text outside page boundaries. |
| Independent review | No remaining must-fix issue found in source fidelity, native API compatibility, handout ordering, or annotation privacy. |

The mathematical conventions and derivations are retained; see
`DCS-grounding.md` and `MATHEMATICS.md`. Generated QA files remain outside
the Typst source package.
