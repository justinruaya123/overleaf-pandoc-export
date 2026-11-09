# CS138 — Discovering Fourier series

An editable **SCL Beamer / Typst** lecture built around the question:

> We know the periodic eigenfunctions. How much of each is in a given function?

The core follows one problem, **u − u″ = f with periodic boundary conditions**.
It develops complex exponentials, discovers coefficient extraction by
counterrotation and averaging, recognizes orthogonal projection, recovers
the real Fourier formulas, and solves the original problem by scalar
division. A periodic tent supplies a function whose coefficients must be
discovered rather than read off.

**32 core frames / 90 minutes.** The default live presentation ends with
six reference frames, for **38 logical frames**. Both handouts also include
six optional extensions for curious students, for **44 logical frames**.
Those extensions are hidden during the live lecture. PDF reveal pages are
individual click states, not additional topics. All mathematical text
remains native, editable Typst.

## Start here

Use Python 3.12 or later. From the extracted project directory:

```sh
python -m pip install -r requirements-build.txt
python build.py
```

The Python Typst package contains the compiler; a separate Typst executable
is not needed for this route. The builder uses the included fonts and the
included package cache, so compilation does not need to download Typst
packages. It creates:

| Output | Purpose |
|---|---|
| `build/lecture.pdf` | Default live presentation: 38 logical frames with click-by-click reveal states; extensions are hidden. |
| `build/student-handout.pdf` | All 44 frames in their final states, including optional reading and the coefficient reference; no lecturer notes. |
| `build/lecturer-handout.pdf` | All 44 frames, one landscape A4 page each: current final slide, next opening slide, and the teaching guide. Optional readings are marked **0 min**. |
| `build/frames.json` | Live physical-page map matching `lecture.pdf`, used by the live layout check. |
| `build/handout-reveals.pdf` | Complete 44-frame reveal deck retained locally for preview generation and full-view layout checks. |
| `build/handout-frames.json` | Complete physical-page map matching `handout-reveals.pdf`, with the lecturer guide's preview chain. |
| `build/previews/` | Current/next thumbnails generated from the complete rendered deck. |

The ZIP includes the current preview assets and complete handout map so the lecturer
layout can be compiled immediately. **Run `python build.py` after changing
slides or reveal states** to refresh those assets.

## Entry points and editable files

| File | Edit here for |
|---|---|
| `lecture.typ` | Main entry point; `handout=true` selects the complete lecturer guide. |
| `slides.typ` | Student slide content, native math, pauses, and equation states. |
| `notes.typ` | Commented teaching guide: purpose, script, question, sanity check, transition, timing, and reveal cues. |
| `slide-tools.typ` | Fixed slide-body and equation-stage layout, citations, and figure placement. |
| `lecturer.typ` | Current/next/notes handout layout. |
| `references.typ` | Canonical source metadata and links. |
| `REFERENCES.md` | Reading order, notation translation, source roles, and historical framing. |
| `BIBLIOGRAPHY.md` | Clickable full bibliography. |
| `notebooks/fourier-plots.ipynb` | All plotting functions, mathematical formulas, exports, and numerical checks. |
| `scl-beamer/` | The actual supplied SCL template implementation and branding. |
| `fonts/`, `packages/` | Bundled fonts and pinned Typst dependencies. |

### With the Typst command-line compiler

The Python builder is the verified complete build route. With a compatible
Typst CLI, the equivalent entry points are:

```sh
typst compile --root . --font-path fonts --package-cache-path packages lecture.typ build/lecture.pdf
typst compile --root . --font-path fonts --package-cache-path packages --input student-handout=true lecture.typ build/student-handout.pdf
typst compile --root . --font-path fonts --package-cache-path packages --input handout=true lecture.typ build/lecturer-handout.pdf
```

The last command uses the existing `build/handout-frames.json` and preview files.
Refresh them with `python build.py` after an edit. In a Typst web project,
upload the whole folder, choose `lecture.typ`, and retain the fonts and
assets. `lecturer.typ` can also be selected directly for the guide.

### Live and handout modes

| Input to `lecture.typ` | Frames | Output behavior |
|---|---:|---|
| No input | 38 | Live reveals; six optional extensions are hidden; references remain at the end. |
| `student-handout=true` | 44 | Final-state slides, including optional reading; no teaching notes. |
| `handout=true` | 44 | Lecturer guide with current/next previews and teaching notes, including optional reading marked **0 min**. |
| `show-extensions=true` | 44 | All reveal states, including optional extensions, for previewing or auditing. |

The six extension frames remain in `slides.typ`, inside the
`show-extensions` gate and marked `handout-only: true`. A student handout
always includes them. `build.py` explicitly enables `show-extensions=true`
when generating the full reveal deck and its previews, while preserving a
separate default live deck and page map. To preview that complete reveal
deck with the CLI:

```sh
typst compile --root . --font-path fonts --package-cache-path packages --input show-extensions=true lecture.typ build/handout-reveals.pdf
```

Optional current/next captions in the lecturer guide describe handout
reading. They do not add an activity or time allocation to the live core.

## Reveal and alignment conventions

Use **native `#pause`**, without parentheses, for a new reveal. Keep one
equation in view with the template's interleaved `#eq-alt` form:

```typst
#stage[
  #eq-alt((
    [$D y_n-D y_n''$], [$A y_n$],
    [$D y_n+D lambda_n y_n$], [$A y_n$],
    [$(1+lambda_n)D y_n$], [$A y_n$],
    [$(1+lambda_n)D$], [$A$],
    [$D$], [$A/(1+lambda_n)$],
  ))
]
#pause
#sanity[The constant mode is unchanged.]
```

`eq-alt` measures **all** alternatives, reserves a shared left column,
relation position, right column, ascent, and descent, and applies a common
scale if necessary. The lecture also fixes the surrounding stage height
and uses top-aligned frames. A shorter last expression therefore retains
the same equals-sign position and baseline as the longer intermediate
expressions. Add a pause after `eq-alt` when the check should appear only
after the final algebraic step.

Use explicit grouping in Typst math: `(dif x)/x`,
`sin((n pi ln x)/(ln 2))`, and `(ln 2)/2`. The project checks these
expressions as mathematical displays, not merely as source text that
compiles.

The source also attaches native `speaker-note` content. The custom handout
adds the next-slide preview that the template's ordinary final-state
handout does not provide.

## Suggested 90-minute progression

The frame timings in `notes.typ` total 90 minutes, including the brief
prediction and explanation activities.

| Time | Question driving the section | Core frames |
|---|---|---|
| 0–11 min | Why would eigenfunction coordinates solve a new BVP? | 1–5 |
| 11–24 min | Why are sine and cosine coordinates of an exponential? | 6–10 |
| 24–44 min | How can we isolate one unknown coefficient? | 11–16 |
| 44–67 min | How do real waves and the tent arise from those coefficients? | 17–24 |
| 67–90 min | How do the coordinates simplify operators and generalize? | 25–32 |

The teaching notes use **predict → reveal → explain → check**. The final
problem removes the worked scaffolding: for `f = 1 + 2 cos(3x)`, students
recover both coefficient conventions and solve the BVP. The notes cite
the learning research behind these choices without claiming that this
particular sequence has itself been experimentally validated.

Optional frames cover the historical order, the analytic justification
for twice differentiating the BVP solution, a coefficient reference,
half-range expansions, the Fourier-transform limit, and the Laplace
connection. They are outside the 90-minute allocation, included in both
handouts, and hidden from the default live presentation.

## Conventions to preserve

- **Interval:** `[-L,L]`; **full period:** `2L`; **fundamental frequency:**
  `ω₀ = π/L`. L7 used `L` for the full period; the transition is explicit.
- **Real constant:** `a₀` is the mean, with no factor `1/2` in front of it.
- **Complex coefficients:** uppercase `Cₙ`; positive exponent in synthesis,
  negative exponent in analysis; `C₋ₙ = conjugate(Cₙ)` for real functions.
- **Generalized coefficients:** lowercase `cₙ`, with the L7 weight `r` in
  both projection integrals.
- **SL sign:** `𝓛[y] = (p y′)′ + qy = −λ r y`, matching L7.
- **Convergence:** finite projection is established before completeness is
  invoked; mean-square and pointwise conclusions remain distinct.

## Reproduce the plots

```sh
python -m pip install -r requirements-plots.txt
```

Open `notebooks/fourier-plots.ipynb` in a notebook editor and **Run All**
from either the project root or the `notebooks` directory. Every formula,
helper, and export is defined in that one notebook. It reads no external
data or plotting script. It regenerates the SVG assets and PNG previews
under `assets/plots/`, and contains the numerical sanity checks. Rebuild
the lecture after changing a figure.

The notebook includes the normalized periodic modes, unit circle,
conjugate pair, freeze/average illustration, tent partial sums, operator
filtering, heat-mode decay, and the series-to-transform preview.

## Verification

After building, run:

```sh
python verify_layout.py
python verify_layout.py --view handout
```

The reports record equation-anchor coordinates across reveal states and
check body bounds in both the live and complete decks. The delivered project also includes a mathematical
review summary and the build results in `validation/`. Geometry checks
supplement visual inspection; they do not replace it.

## Template and dependencies

The SCL implementation is from `justinruaya123/scl-beamer-typst`, commit
`e44fbc3065970836dca3d1a61cb8111474185959` (15 October 2026), with its real
branding and Latin Modern fonts. The native equation helper is retained.
Builds were verified with Typst **0.15.2**, Touying **0.6.3**, CeTZ
**0.4.2**, and oxifmt **1.0.0**. Licenses and source provenance are listed
in `THIRD_PARTY.md` and retained with the corresponding components.
