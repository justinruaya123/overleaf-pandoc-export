# CS138 — Fourier Series

An editable lecture using the existing **SCL Beamer** title page, sidebar,
fonts, and slide layout. The source starts with `title-slide()` and a
contents slide. Its mathematics and notation follow the supplied DCS
lectures and handouts; see `validation/DCS-grounding.md` in the repository.

## Open in Typst Web

Upload the extracted project and select **`lecture.typ`** as the main file.
Edit `slides.typ` for the content and `notes.typ` for the professor's notes.
The project needs no generated thumbnails or frame maps.

Typst resolves the pinned preview packages: Touying 0.6.3, CeTZ 0.4.2,
and oxifmt 1.0.0. Keep the included `fonts`, `assets`, and `scl-beamer`
folders alongside the source. With a local Typst 0.15+ compiler:

```sh
typst compile --root . --font-path fonts lecture.typ lecture.pdf
```

The default lecture has 39 pages before animation states: title, contents,
31 teaching frames, and six reference frames. The six optional reading
frames make 45 pages in the handout export. The SCL slide counter excludes
the title page.

## Handout settings

At the top of `slides.typ`:

```typst
#let handout-options = (
  handout: false,
  handout-mode: "students", // "lecturer" or "students"
  annotations: true,
  extensions: true,
)
```

The dictionary is passed to `scl-theme.with`. Compiler inputs with these
same names override the source values. `handout: false` is the ordinary
lecture path. `extensions: false` skips shared additions and optional
reading slides; `annotations: false` skips professor notes.

Typst Web previews the native slide content. **The annotated handout layout
is a Pandoc HTML export**, using the repository command below.

## Authoring

```typst
#slide(title: [One mode])[
  If $f=A y_n$, try $u=D y_n$.
  #eq-alt((
    [$D y_n-D y_n''$], [$A y_n$],
    [$(1+lambda_n)D$], [$A$],
    [$D$], [$A/(1+lambda_n)$],
  ), expand: true)
  #handout[
    The eigenfunction is not identically zero, so its scalar amplitudes
    must agree. No division by its pointwise values is needed.
  ]
][
  Ask students to predict the multiplier before revealing the final row.
]

#handout-slide(title: [For further reading])[
  Extra bullets, calculations, and ordinary Typst mathematics go here.
][
  Optional professor notes for this page.
]
```

- The first block is slide content; the second block is professor notes.
- `handout[]` adds shared material in either handout audience.
- `handout-slide[]` adds a complete page only when handouts are enabled.
- Both helpers accept `enabled: false` to disable an individual block.
- `eq-alt(..., expand: true)` reveals aligned rows downward. Its default
  retains the existing replacement behavior. Both forms share column widths
  across states. Ordinary `pause` remains available.

The helpers add no fixed-height content boxes or blank padding.

## Export annotated handouts through Pandoc

From the `overleaf-pandoc-export` repository, after `npm ci`, with Typst 0.15+
and Pandoc on `PATH`:

```sh
node export-typst.mjs examples/cs138-fourier/lecture.typ --handout lecturer --output build/fourier-lecturer.html
node export-typst.mjs examples/cs138-fourier/lecture.typ --handout students --output build/fourier-students.html
```

The lecturer export has four panels: current slide and its notes, followed
by the immediate next page and that page's notes. Pages advance as
`[1,2]`, `[2,3]`, and so on; the last page has no next-page panel. The next
page comes from the same ordered document, including enabled optional
reading. Student exports contain the slide content and shared additions,
without professor notes.

```sh
# Ordinary lecture content, overriding a source-configured handout.
node export-typst.mjs examples/cs138-fourier/lecture.typ --handout off

# Lecturer layout with optional material and professor notes disabled.
node export-typst.mjs examples/cs138-fourier/lecture.typ --handout lecturer --extensions false --annotations false
```

`--typst PATH` and `--pandoc PATH` select explicit executables. Handout mode
passes semantic Typst HTML through Pandoc's HTML reader and HTML writer,
preserving mathematical SVG, figures, links, and the existing export styles.
Plain exports do not invoke Pandoc. The resulting HTML is self-contained.

## Course conventions and assets

- Interval `[-L,L]`, full period `2L`, and `omega_0 = pi/L`.
- The DCS real coefficient `a_0` is the mean; the series starts with `a_0`.
- Complex coefficients `C_n`; generalized coefficients `c_n`.
- L7's sign convention: `L[y] = (p y')' + qy = -lambda r y`.

The complete reading list is in `BIBLIOGRAPHY.md` and `REFERENCES.md`.
The reproducible plotting notebook remains in the repository at
`notebooks/fourier-plots.ipynb`; its exported SVG figures are included in
the Typst-only ZIP. Component provenance is recorded in `THIRD_PARTY.md`.
