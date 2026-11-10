# LaTeX and Typst to offline HTML

Export a lecture to a standalone HTML file with selectable text and embedded graphics. Choose the workflow for your source format:

- [LaTeX](#latex-to-offline-html): `convert.cmd` and `export-latex.mjs`.
- [Typst](#typst-to-offline-html): `convert-typst.cmd` and `export-typst.mjs`.

## Complete Typst lecture example

[CS138: Fourier series](examples/cs138-fourier/README.md) uses the supplied
SCL title page, sidebar, bullets, blocks, contents, and DCS course notation.
The original template files are unchanged. Open `lecture.typ` in Typst Web;
the optional `scl-handout.typ` layer supplies `slide[content][notes]`.
`handout[]` and `handout-slide[]` add optional reading, while
`eq-alt(..., expand: true)` reveals equations downward.

Use the Typst exporter below for **continuous Pandoc HTML handouts**.
Each slide appears once, in order, inside a faint box with a modest title.
Lecturer annotations follow their slide; student exports omit them. The example's
[source guide](examples/cs138-fourier/README.md) and
[DCS source map](examples/cs138-fourier/validation/DCS-grounding.md) document
its authoring conventions and grounding.

## LaTeX to offline HTML

`export-latex.mjs` takes a LaTeX file as its positional parameter, prepares a separate copy for Pandoc, pre-renders diagrams and maths, and writes an HTML file. It does not modify the input `.tex`, its theme files, or the existing `output.html`.

### Two commands (Windows)

Keep the exporter folder beside your lecture folders. For example:

```text
your-work/
  latex-export/
    setup.cmd
    convert.cmd
    export-latex.mjs
    ...
  L1/
    L1-main.tex
    figs/
  L2/
    L2-main.tex
```

From `your-work`, run **setup once**:

```powershell
.\latex-export\setup.cmd
```

Then **convert any lecture**:

```powershell
.\latex-export\convert.cmd .\L1\L1-main.tex
```

The result is `L1/build/L1-main.html`. Images are resolved relative to `L1`, not to the exporter folder. You do not need to copy the script into each lecture folder or change directories.

For the lecture in this workspace:

```powershell
.\latex-export\convert.cmd .\CS138-L1.tex
```

More examples:

```powershell
# Choose the output location; all paths are relative to your current directory.
.\latex-export\convert.cmd .\L1\L1-main.tex --output .\exports\L1.html

# An arbitrary input path and explicit output path, including spaces:
.\latex-export\convert.cmd "C:\path to lecture\lecture.tex" --output "C:\path to export\lecture.html"

# You can also run from inside a lecture folder:
..\latex-export\convert.cmd .\L1-main.tex
```

`setup.cmd` installs the locked npm dependencies into `latex-export/node_modules`, then performs a real sample conversion to check Pandoc, LaTeX/TikZ, PDF image conversion, and math rendering. It can be rerun. It does not install system-wide software: Node.js and the external conversion tools below must be installed. Setup reports a specific error if a tool is unavailable. With a populated local npm cache, `setup.cmd -Offline` also works without network access.

The default output is `build/<input-name>.html` beside the input file. The HTML embeds every image and all rendered equations; it opens offline without JavaScript, font downloads, or a MathJax CDN. The original TeX for each equation remains in its HTML `data-tex` attribute.

The adjacent `<output-name>.export` directory contains `normalized.tex`, the equation inventory `math.json`, a machine-readable `report.json`, and cached diagram assets. The intermediate TeX is for Pandoc, not a replacement for the original PDF source.

### Requirements

- Node.js 18 or newer and the locked npm dependencies.
- Pandoc (tested with 3.11).
- `pdflatex`, with `standalone`, `amsmath`, `amssymb`, and TikZ, when the input contains TikZ.
- `dvisvgm` with working PDF support, or Poppler's `pdftoppm`, when the input contains TikZ or PDF images.
- Google Chrome for the optional browser test.

Executables are discovered on `PATH`; the script also checks the standard Windows Pandoc location, `C:\tools\TinyTeX`, and the Codex bundled Poppler runtime when available. Override paths explicitly if necessary:

```powershell
.\latex-export\convert.cmd .\CS138-L1.tex `
  --pandoc "C:\Program Files\Pandoc\pandoc.exe" `
  --pdflatex "C:\tools\TinyTeX\bin\windows\pdflatex.exe" `
  --pdftoppm "C:\poppler\Library\bin\pdftoppm.exe"
```

`--dvisvgm PATH` is also supported. On this machine, dvisvgm cannot read PDFs using the installed Ghostscript version, so diagrams and PDF figures use the automatic **220 dpi PNG fallback**. Equations remain vector SVG. Subsequent exports reuse the cached figures.

### What the exporter preserves

- Ordinary inline and display maths, custom source-defined macros, equation numbers, and equation references.
- `\systeme{...}` as a braced `aligned` system. Top-level commas separate equations; commas inside braces are preserved.
- Augmented `bmatrix` column specifications, including the vertical separator, by converting them to bracketed arrays.
- Standalone `tikzpicture` environments. A `center` block containing inline TikZ, `\DoTikzmark`, or `\colrow` is rendered as one unit, preserving coordinates and overlays. LaTeX runs twice.
- `\includegraphics` and `\pgfimage`, including extensionless local references and single-page PDFs.
- Beamer frame titles, blocks, all progressive reveal steps, and `\structure`/`\alert` content. Frames become sections on one scrollable page.
- Title-page text, including event/course, affiliation, and contact information, with inline formatting.
- `algorithmic` pseudocode using `\STATE`, `\FOR`/`\ENDFOR`, `\IF`/`\ENDIF`, `\RETURN`, and `\COMMENT`. The HTML preserves sequential line numbers (when requested), nesting, brace-delimited comments, and rendered maths. Long equations scroll within the algorithm on narrow screens. Other algorithm dialects and commands are not yet supported and fail explicitly.
- `\intertext` in unnumbered `align*` environments or standalone passages, exported as prose with inline mathematics preserved. `\mathpause` and presentation-only `\medskip` commands are omitted.
- Bare display equations with alignment markers receive an aligned rendering context while keeping their original TeX in the export data.
- Prose `\quad` and `\bigskip` spacing, without changing spacing commands inside mathematics. Wide inline equations scroll within the page on narrow screens.

The diagram preamble reuses source-defined commands and `\usetikzlibrary`. For additional TikZ styles, packages, or external definitions, pass `--tikz-preamble path/to/additions.tex`. Changing this file invalidates the diagram content cache. PDF-only theme backgrounds and the SCL logo-placement command are omitted; this is a content export, not a pixel-identical Beamer presentation.

### Validation

From the parent of `latex-export`:

```powershell
npm.cmd --prefix .\latex-export test
.\latex-export\convert.cmd .\CS138-L1.tex
node .\latex-export\tests\browser-check.mjs .\build\CS138-L1.html
```

The Node entry point also remains available directly: `node latex-export/export-latex.mjs L1/L1-main.tex`. On macOS/Linux, install the external tools, run `npm --prefix ./latex-export ci`, and use this Node command.

The build rejects unconverted raw LaTeX, missing local images, lost math expressions, unresolved equation references, duplicate equation labels, and MathJax parse errors. It writes the final HTML only after these checks succeed. A failed rebuild leaves any previous HTML in place and writes a failed report: check the exit code and report before distributing that older file.

The browser test runs Chrome with HTTP requests blocked, checks every math element and image, detects MathJax errors and stray TeX, verifies equation links and unique IDs, and checks desktop and mobile page overflow. It writes `browser-report.json` and screenshots of the relevant CS138 frames beside the build report. `BROWSER_EXECUTABLE` can select another installed Chromium-compatible browser. `PLAYWRIGHT_MODULE` can select an existing Playwright package directory.

The unit and integration tests cover source preservation, input/output paths with spaces, dollar display maths, nested matrix specifications, forward references, and intentional bad-input failures.

### Scope and limits

The script is designed for the constructs in this lecture plus ordinary LaTeX maths and standalone TikZ. It is not a general TeX interpreter. Unsupported commands fail explicitly so they can be adapted rather than silently disappear. External `\input`/`\include` files currently require a flattened input document. Remote images are rejected for the offline output. Overlay alternatives such as `\alt` and `\temporal` need an explicit export decision and are rejected. Inline coordinate-dependent TikZ outside a `center` block should be enclosed in a self-contained renderable block first.

Validation checks conversion and rendering, not the mathematical correctness of the lecture's statements or numerical calculations.

Repeated, unreferenced figure labels (such as `fig:placeholder`) generate a warning: the first HTML ID is retained and repeated IDs are omitted without removing figures or captions. References to a repeated figure label fail as ambiguous.

## Typst to offline HTML

`export-typst.mjs` uses the local Typst compiler's **experimental native HTML export**. It exports lecture content, with selectable text, embedded SVG mathematics and diagrams, and embedded local images. For the supported `scl-beamer` profile, every static overlay alternative and step is included in source order. The HTML does not animate slide transitions or incremental reveals, and it does not reproduce the PDF's exact slide layout.

### Requirements

- Node.js 18 or newer, including npm.
- [The Typst CLI](https://github.com/typst/typst#installation), version **0.15 or newer**, installed locally. Access to the Typst web editor does not install the CLI.
- This repository's locked npm dependencies, installed by `setup-typst.cmd` or `npm ci`.
- Any fonts and Typst packages needed by the source document. Package downloads may require network access during compilation unless already cached.

Ordinary Typst exports require Typst 0.15+ and the locked Node dependencies. Annotated handout exports additionally require Pandoc. The resulting HTML embeds its graphics for offline viewing.

### Two commands on Windows

Keep the exporter in a folder such as `latex-export` beside the course folders. Open PowerShell in their shared parent folder, then run setup once:

```powershell
.\latex-export\setup-typst.cmd
```

Setup installs the locked npm dependencies into the exporter folder with `npm ci`, then performs a real export of a small temporary document. The smoke check covers imports, inline and display mathematics, a local SVG image, and a table. It uses the exporter's own compiler checks.

Export the actual lecture entry file:

```powershell
.\latex-export\convert-typst.cmd ".\CS138 2.2 NumericalBVP\lectures\2_2_1_Shooting.typ"
```

Choose the `.typ` file that contains the lecture; an empty `main.typ` cannot produce lecture content. The default output for this example is:

```text
CS138 2.2 NumericalBVP/lectures/build/2_2_1_Shooting.html
CS138 2.2 NumericalBVP/lectures/build/2_2_1_Shooting.export/report.json
```

Open the HTML in a browser after the command succeeds. Input, output, root, and font paths are resolved from the terminal's current directory, so paths with spaces must be quoted.

If Typst is installed outside `PATH`, supply its executable explicitly:

```powershell
.\latex-export\setup-typst.cmd -Typst "C:\Typst tools\typst.exe"
.\latex-export\convert-typst.cmd ".\project\lectures\lecture.typ" `
  --root ".\project" `
  --output ".\exports\lecture.html" `
  --typst "C:\Typst tools\typst.exe" `
  --font-path "C:\Lecture fonts" `
  --font-path ".\project\extra fonts"
```

The setup `-Typst` argument applies to its smoke check only. For later exports, pass `--typst`, set the `TYPST` environment variable, or add Typst to `PATH`. To install dependencies from an already populated npm cache, use `setup-typst.cmd -Offline`; this does not populate missing Typst package caches.

### Command-line options

```text
node export-typst.mjs INPUT.typ [options]
```

| Argument or option | Meaning |
| --- | --- |
| `INPUT.typ` | Required lecture entry file. |
| `--output PATH` | Output HTML path. Defaults to `build/STEM.html` beside the input file; the report is written beside that HTML in `STEM.export/report.json`. |
| `--root PATH` | Project directory containing imports and assets. By default, the exporter uses the nearest ancestor containing `scl-beamer/lib.typ`, or the input file's directory if no such ancestor exists. |
| `--typst PATH` | Typst executable. Defaults to `TYPST` when set, otherwise `typst` on `PATH`. |
| `--font-path PATH` | Additional font directory; repeat the option for multiple directories. The project's `fonts` directory is also included when present. |
| `--profile auto` | Default. Selects the supported SCL adapter when its project marker is present; otherwise uses native HTML. |
| `--profile native` | Uses native Typst HTML without the SCL adapter. |
| `--profile scl` | Requires the supported `scl-beamer` project structure and enables its HTML adapter. |
| `--handout lecturer` | Continuous Pandoc HTML, with professor notes below each slide. |
| `--handout students` | Continuous Pandoc HTML with shared handout content and no professor notes. |
| `--handout off` | Ordinary content export, overriding handout settings in the source; skips Pandoc. |
| `--annotations true\|false` | Enables/disables professor-note rendering. |
| `--extensions true\|false` | Enables/disables `handout[]` and `handout-slide[]` additions. |
| `--pandoc PATH` | Pandoc executable for handouts; defaults to `PANDOC` or `pandoc` on `PATH`. |
| `--help` | Prints usage. |

For ordinary documents that import files from a parent directory, pass `--root` explicitly. For example, `project/lectures/lecture.typ` importing `../helpers.typ` needs `--root project`. All source imports and local assets must lie within the chosen project root. Source trees containing symbolic links are rejected.

On macOS or Linux, use the same Node entry point:

```sh
npm --prefix ./latex-export ci
node ./latex-export/check-typst-setup.mjs
node ./latex-export/export-typst.mjs ./project/lectures/lecture.typ --root ./project
```

From the exporter folder, the npm equivalent is:

```sh
npm run export:typst -- /path/to/project/lectures/lecture.typ --root /path/to/project
```

### Annotated handouts

```sh
node export-typst.mjs examples/cs138-fourier/lecture.typ --handout lecturer --output build/lecturer.html
node export-typst.mjs examples/cs138-fourier/lecture.typ --handout students --output build/students.html
```

Sources using the optional `scl-handout.typ` module can instead pass
`handout: true`, `handout-mode: "lecturer"` or `"students"`,
`annotations: true`, and `extensions: true` to its `scl-theme`.
CLI choices override source settings. Handout mode uses Pandoc's actual
HTML reader and standalone HTML writer while retaining the existing style
and mathematical SVG. Each selected slide appears once in source order,
with a faint border and a smaller heading. Lecturer notes flow below the
slide content. Student output excludes professor annotations.
The original template's multiple content blocks remain content; only the
opt-in helper treats the second block as notes when no composer is supplied.
With a composer, attach notes using the named `notes: [...]` argument.
`--handout off` restores ordinary content
export without rendering handout additions or invoking Pandoc.

### Content and scope

The exporter compiles a temporary copy of the selected project. Its native HTML adjustments and SCL adapter operate on that copy, leaving the original `.typ` sources, imports, and theme files intact.

- Text, headings, lists, and tables use HTML where supported by Typst.
- Mathematics and supported diagrams are rendered as SVG and embedded in the HTML.
- Tables with explicit `table.hline` or `table.vline` rules are embedded as SVG to preserve their rules and column alignment, including divided-difference arrays. Ordinary tables remain HTML.
- Local images are embedded so they do not depend on the original project directory when the HTML is opened.
- The SCL adapter preserves the content of all supported static overlay alternatives and steps in order. This may show several versions of content that occupied the same position on separate PDF slides.
- Presentation-only decoration, page geometry, transitions, and animation are outside the content export's scope.

Typst's HTML export remains experimental. Packages and custom macros that assume paged PDF layout may need HTML support before they can compile. The SCL adapter targets the supported project conventions; it is not a general conversion of every Beamer-like Typst package. Unsupported constructs or failed compilation are reported as errors instead of being silently discarded.

### Reports and validation

A successful export writes `status: "ok"` to the adjacent `STEM.export/report.json`, together with the compiler version, selected profile, content counts, source hashes, and warnings. Check the process exit status and report when rebuilding: a failed rebuild can leave the previous successful HTML in place.

Reports are replaced atomically, so an existing `report.json` symlink or hardlink cannot redirect a report write into a source file. Before publishing HTML, the exporter rejects external SVG resources, including filter images (`feImage`), and gives inline SVG identifiers unique prefixes. It also updates their stylesheet references and ID selectors using the locked `css-tree` dependency, preserving gradients and styles when graphics are combined.

From the exporter folder, run the Typst tests and optionally validate an exported HTML file in Chromium:

```sh
npm run test:typst
npx playwright install chromium
node tests/typst-browser-check.mjs /path/to/lecture.html
```

The browser command is also available as `npm run test:typst:browser -- /path/to/lecture.html`. It uses the installed Playwright module, or `PLAYWRIGHT_MODULE` for an explicit module location. Set `BROWSER_EXECUTABLE` to a compatible existing Chromium/Chrome executable instead of installing Chromium with Playwright.

The browser check compares the HTML with its adjacent report, checks selectable content, embedded images and SVG references, blocks network access and page JavaScript, and checks desktop and mobile rendering for overflow. It saves screenshots for inspection. These checks establish export integrity and rendering behavior; mathematical correctness still depends on the lecture source.

The Windows launcher tests run on Windows and are explicitly skipped on other systems. The setup smoke check can also be rerun directly with `node check-typst-setup.mjs [--typst PATH]`.

### SCL adapter license

The source-derived SCL adapter in [`typst/scl-html.typ`](typst/scl-html.typ) carries the original theme attribution and is licensed under GPL-3.0-or-later. See [`typst/LICENSE`](typst/LICENSE).
