# Template, fonts, and asset provenance

| Component | Origin and version | License location |
|---|---|---|
| SCL Beamer Typst implementation | User's `justinruaya123/scl-beamer-typst`, commit `e44fbc3065970836dca3d1a61cb8111474185959`, 2026-10-15. | `scl-beamer/LICENSE` — GPL-3.0-or-later. |
| SCL branding and component artwork | User's actual SCL conversion bundle; original SCLsidebar design credited to John Justine Villar. | Original notices retained in `scl-beamer/` and `scl-beamer/assets/`. |
| Bibliography icons | Artwork shipped with the SCL template. | `scl-beamer/assets/BIBLIOGRAPHY-ICONS.md`. |
| Latin Modern fonts | Official Latin Modern and Latin Modern Math fonts, retaining upstream family names and metadata. | `fonts/GUST-FONT-LICENSE.txt`. |
| Touying | 0.6.3, pinned preview package (cached in the repository). | `packages/preview/touying/0.6.3/LICENSE` — MIT. |
| CeTZ | 0.4.2, pinned preview package (cached in the repository). | License files in `packages/preview/cetz/0.4.2/` — LGPL-3.0-or-later. |
| oxifmt | 1.0.0, transitive Typst dependency. | License files in `packages/preview/oxifmt/1.0.0/` — MIT OR Apache-2.0. |

The lecture content, CeTZ quarter-turn diagram, notebook, and mathematical
plots were prepared for this CS138 lecture. The plots use no external
data, screenshots, or animation frames. Sanderson's conceptual
freeze-and-average explanation is attributed in the slides, notes, and
bibliography. His source code and artwork are not copied into this bundle.

The supplied course PDFs and L7 ZIP were used to check terminology,
notation, and continuity. They are identified in the bibliography and
remain separate from this source package.

The format revision adds optional handout content, professor-note metadata,
and accumulating equation rows to the supplied SCL implementation. Its
original title-page, sidebar, font, and geometry implementations are retained.
The Typst-only ZIP resolves preview packages by their pinned imports; the
repository retains their offline cache and license files.
