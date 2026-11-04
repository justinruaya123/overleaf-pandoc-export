# Typst HTML Export Implementation Plan

> **For agentic workers:** Use the project design and independent focused tasks; verify integration before opening the PR.

**Goal:** Add Typst-to-offline-HTML export and deliver the four Numerical BVP lectures.

**Architecture:** Node orchestrates an isolated copy, invokes Typst native HTML export with common show rules and an SCL adapter, then validates and publishes the self-contained result.

**Tech Stack:** Node.js 18+, Typst CLI 0.15+, `@xmldom/xmldom`, `css-tree` 3.2.1, existing Node test runner and Playwright.

**Spec:** `docs/superpowers/specs/2026-11-04-typst-html-design.md`

## Global constraints

- Preserve source bytes and existing LaTeX behavior.
- Maintain offline output with semantic text and embedded graphics.
- Preserve all alternative equation steps; omit animation timing.
- Fail without replacing successful HTML when compilation or validation fails.
- Use the existing repository's Node module and test conventions.

## Review focus

- Imports/assets outside the entry-point directory and paths containing spaces.
- Output collisions, recursive staging and symlinks.
- Missing compiler/assets or unsupported HTML constructs causing silent loss.
- Duplicate SVG identifiers and local/remote resource references.
- Math inside tables, captions, diagrams and equation alternatives.

## Task 1: Export pipeline

- [x] Add behavioral tests for source preservation, nested imports, offline resources, atomic failure and CLI validation.
- [x] Add `export-typst.mjs` with `build(input, options)` and common HTML rules/styles.
- [x] Verify a real ordinary Typst fixture with equations, image, table and import.

## Task 2: SCL content adapter

- [x] Add a source-compatible adapter and integration fixture for slides, pauses, alternatives, blocks and diagrams.
- [x] Preserve static derivation steps and author text using Typst evaluation.
- [x] Compile all four uploaded lectures; verify frame counts and content/graphics.

## Task 3: User workflow and delivery

- [x] Add Windows launcher, npm export command, setup check and usage documentation.
- [x] Run repository tests and offline desktop/mobile browser checks.
- [x] Obtain independent code review and resolve material findings, including atomic report writes, external SVG filter resources, and SVG stylesheet references after ID namespacing.
- [x] Generate the four self-contained lecture HTML files and combined course HTML.
- [ ] Commit the branch, open the remote PR against `master`, and deliver the HTML files.

## Validation evidence

- Final repository suite: 42 tests, 34 passed, 8 Windows-only tests skipped, zero failures. Windows launchers were not executed in this Linux environment.
- Real compilation and setup smoke checks used Typst 0.15.0 through a local CLI shim around its Python binding. A standalone Typst CLI binary was not exercised here.
- All four lectures compiled with unchanged source hashes: 123 sections, 635 rendered mathematics elements, and 18 embedded images in total.
- Chromium 153.0.8010.0 passed offline desktop and 390 px mobile checks for the four lectures and combined HTML, with no network requests, broken images, unresolved SVG references, duplicate IDs, clipped mathematics, or page overflow.
