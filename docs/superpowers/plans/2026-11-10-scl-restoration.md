# SCL restoration and continuous handout plan

> **For agentic workers:** Use the existing implementation agents and a final independent review. The user has authorized restoring the original template and simplifying the export.

**Goal:** Preserve the existing SCL presentation and export handout content as one continuous HTML document.

**Architecture:** Restore the vendored SCL template to its recorded upstream revision. Put optional handout helpers in one separate module, and author the lecture using native lists, blocks, and bibliography entries. Keep the existing Typst-to-Pandoc pipeline but remove current/next page duplication and the four-panel layout.

**Tech Stack:** Typst/Touying, Node.js, Pandoc, existing HTML/CSS.

**Spec:** User correction of 10 November 2026: revert to the faithful SCL template, build additions on top, include additional slides only for handouts, and export one long HTML page with faint slide boxes and smaller slide titles.

## Constraints and decisions

- Preserve DCS mathematics, notation, source references, and teaching notes.
- Keep the original template's typography, bullets, blocks, sidebar, and slide composer API.
- Retain the opt-in handout syntax and backward-compatible audience switches.
- Lecturer annotations flow below their slide; student exports omit them.
- Every selected slide occurs once, in source order, with no next-slide preview.
- Use existing dependencies and natural document flow; no new presentation framework.

## Tasks

- [x] Compare all template sources against the recorded upstream Git revision and restore the two modified components.
- [x] Move optional handout and accumulating-equation helpers outside the original template; verify ordinary slides and multi-body composition remain compatible.
- [x] Replace the Fourier lecture's custom prompt/stage/check styling with native SCL lists and blocks; restore a presentation-style contents list and bibliography.
- [x] Remove four-panel export construction and CSS; use subtle slide boundaries and modest headings in a continuous Pandoc HTML document.
- [x] Verify annotation gates, optional-slide order, links, original component rendering, and desktop/mobile HTML flow.
- [x] Prepare the updated README, PR description, rebuilt Typst-only ZIP, and continuous student HTML example for final publication.

## Review focus

- Ordinary native slides must match the original template; two slide bodies with an explicit composer must remain two columns.
- Handout-only content must not be laid out in lecture mode.
- The contents list must have working destinations without document-style dot leaders or reveal-page numbers.
- Each exported slide and its anchor must occur once, including optional reading pages.
- Lecturer notes must never appear in student exports; math and diagrams must remain legible at desktop and mobile widths.
