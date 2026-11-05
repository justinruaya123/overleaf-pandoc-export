# Typst content export

## Intent

Add a Typst equivalent of the existing LaTeX content exporter and use it on the supplied CS138 Numerical BVP project. Produce a PR and self-contained HTML files.

## Design

- Add a separate `export-typst.mjs` entry point; keep the LaTeX pipeline intact.
- Use the Typst compiler for language evaluation and math rendering. Do not parse mathematics or programming constructs with regular expressions.
- Compile semantic HTML from an isolated project copy. A source-compatible SCL adapter replaces presentation-only behavior in the copy: slides become sections, pauses reveal all content, equation alternatives become sequential derivation rows. The source tree remains unchanged.
- Keep prose, headings, lists, tables, captions and links as HTML. Render mathematics and position-dependent diagrams as inline SVG for consistent offline rendering.
- Support ordinary Typst documents through common HTML show rules and SCL/Touying through the targeted adapter. Reject unsupported content loss reported by the compiler.
- Embed local images, add responsive styles and record compiler warnings/counts in an adjacent report. Publish HTML only after validation succeeds.
- Default output: `build/<stem>.html` beside the input. Accept explicit output, project root, compiler and font paths. Resolve all CLI paths against the caller's working directory.

## Approaches considered

Native HTML plus a template adapter preserves readable content and matches this repository's existing output. Whole-slide SVG retains presentation geometry but sacrifices text flow and selection. A custom Typst parser duplicates a compiler and would silently mishandle functions/imports. The implementation uses the first approach.

## Scope

Generate all four lectures in the uploaded ZIP. Preserve the author's wording and mathematics. Export static cumulative content, not an animated presentation. Do not modify the uploaded project, publish a website, or merge the PR.
