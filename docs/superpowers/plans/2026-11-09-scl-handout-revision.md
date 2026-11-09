# SCL handout revision

**Goal:** Apply the user's format corrections to the existing SCL lecture and
amend PR #1, retaining the DCS-grounded mathematics.

**Approach:** Keep the supplied title, sidebar, fonts, and slide functions.
Use native Typst content and small compatible helpers. Generate annotated
handouts through the existing Typst/Pandoc HTML exporter; remove the separate
Python preview/booklet pipeline. The user's detailed correction supplies the
implementation scope and authorization.

## Changes

- [x] Restore title-slide() and a contents slide; remove fixed content padding.
- [x] Support slide[content][notes], handout[], handout-slide[], and
  eq-alt(..., expand: true) with the existing SCL template.
- [x] Keep student content separate from professor notes. Lecturer pages show
  current slide/notes above the immediate next slide/notes from one sequence.
- [x] Add opt-in handout audience and rendering flags; retain the ordinary
  fast lecture path and existing exporter behavior.
- [x] Compile native slides; test Pandoc exports, note privacy, page order,
  optional content, equation alignment, and offline rendering.
- [x] Prepare the PR #1 update and the editable Typst source and required assets
  in the source ZIP, with no generated previews or Python build dependency.

## Verification focus

Source-configured handouts must match CLI selection; disabled blocks must not
be rendered; a next-page copy must have unique anchors and correct notes;
the last page has no fabricated next page; title and contents precede the
course sections. Preserve existing SCL and plain Typst export tests.
