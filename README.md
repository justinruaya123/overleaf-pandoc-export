# LaTeX to offline HTML

`export-latex.mjs` takes a LaTeX file as its positional parameter, prepares a separate copy for Pandoc, pre-renders diagrams and maths, and writes an HTML file. It does not modify the input `.tex`, its theme files, or the existing `output.html`.

## Two commands (Windows)

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

## Requirements

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

## What the exporter preserves

- Ordinary inline and display maths, custom source-defined macros, equation numbers, and equation references.
- `\systeme{...}` as a braced `aligned` system. Top-level commas separate equations; commas inside braces are preserved.
- Augmented `bmatrix` column specifications, including the vertical separator, by converting them to bracketed arrays.
- Standalone `tikzpicture` environments. A `center` block containing inline TikZ, `\DoTikzmark`, or `\colrow` is rendered as one unit, preserving coordinates and overlays. LaTeX runs twice.
- `\includegraphics` and `\pgfimage`, including extensionless local references and single-page PDFs.
- Beamer frame titles, blocks, all progressive reveal steps, and `\structure`/`\alert` content. Frames become sections on one scrollable page.
- `algorithmic` pseudocode using `\STATE`, `\FOR`/`\ENDFOR`, `\IF`/`\ENDIF`, `\RETURN`, and `\COMMENT`. The HTML preserves sequential line numbers (when requested), nesting, brace-delimited comments, and rendered maths. Long equations scroll within the algorithm on narrow screens. Other algorithm dialects and commands are not yet supported and fail explicitly.
- `\intertext` in unnumbered `align*` environments, exported as prose between equation displays. `\mathpause` and presentation-only `\medskip` commands are omitted.

The diagram preamble reuses source-defined commands and `\usetikzlibrary`. For additional TikZ styles, packages, or external definitions, pass `--tikz-preamble path/to/additions.tex`. Changing this file invalidates the diagram content cache. PDF-only theme backgrounds and the SCL logo-placement command are omitted; this is a content export, not a pixel-identical Beamer presentation.

## Validation

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

## Scope and limits

The script is designed for the constructs in this lecture plus ordinary LaTeX maths and standalone TikZ. It is not a general TeX interpreter. Unsupported commands fail explicitly so they can be adapted rather than silently disappear. External `\input`/`\include` files currently require a flattened input document. Remote images are rejected for the offline output. Overlay alternatives such as `\alt` and `\temporal` need an explicit export decision and are rejected. Inline coordinate-dependent TikZ outside a `center` block should be enclosed in a self-contained renderable block first.

Validation checks conversion and rendering, not the mathematical correctness of the lecture's statements or numerical calculations.

Repeated, unreferenced figure labels (such as `fig:placeholder`) generate a warning: the first HTML ID is retained and repeated IDs are omitted without removing figures or captions. References to a repeated figure label fail as ambiguous.
