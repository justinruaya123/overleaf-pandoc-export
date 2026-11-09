# Reading guide and source map

The canonical bibliography is **references.typ**. A clickable full list is in [BIBLIOGRAPHY.md](BIBLIOGRAPHY.md). Each entry contains an ID, a short slide-footer label, title, author, bibliographic detail, URL, and its role in this lesson. Footer IDs refer to that dictionary; they do not mean that a source follows this lecture's exact order.

## Suggested student reading order

1. **Recall the allowed modes — L7 and T111.** Revisit the periodic eigenvalue problem, then Trench §11.1, Problem 5. The course's earlier L7 uses L for the full period. This Fourier lecture uses `[−L,L]`, so its full period is **2L** and its frequencies are `nπ/L`.
2. **Understand the complex exponential — O24.** Read Orloff §§4.6–4.6.2 (pp. 5–6). Separate the even and odd terms of the exponential series, then connect the resulting cosine and sine coordinates to the unit circle.
3. **See how one coefficient is isolated — S19 and C3.** In Sanderson's lesson, use “Waves and rotation,” “The integration trick,” and “Pull out any other term.” Then read Chen §3.2, equations (3.6)–(3.9). Counter-rotate one frequency to make it stationary, then average. The averaging uses equal increments of the input parameter, not equal arc lengths around the drawn curve.
4. **Connect the formula to projection — H43 and H24.** Read Herman's generalized basis expansion and the course deck's generalized coefficient formula (H24, PDF p. 44). Orthogonality determines the finite projection coefficients; completeness is an additional statement.
5. **Recover real series and read the convergence statement — T112, C1, and C3.** Trench §11.2 agrees with this lecture's undivided constant. Definition 11.2.3 and Theorem 11.2.4 state the piecewise-smooth hypothesis and the limits at jumps and periodic endpoints. Chen Chapter 1 supplies useful partial-sum pictures; Chapter 3 relates real and complex coefficients.

**Further reading:** T113 treats half-range expansions. H62 and T132 explain weighted Sturm–Liouville expansions. FT09 previews the passage from discrete frequencies to a continuous transform; LP08 provides the one-sided Laplace connection. These are extensions, not prerequisites for the core coefficient calculation.

## Convention translation

The lecture follows the CS138 decks and Trench:

\[
f(x)\sim a_0+\sum_{n\ge1}\left[a_n\cos(n\pi x/L)+b_n\sin(n\pi x/L)\right],
\qquad a_0=\frac1{2L}\int_{-L}^{L}f(x)\,dx.
\]

Chen writes the constant as \(a_0^{\rm Chen}/2\). Thus

\[
a_0^{\rm Chen}=2a_0^{\rm course}.
\]

With positive-exponent synthesis and negative-exponent analysis,

\[
f(x)\sim\sum_{n\in\mathbb Z}C_ne^{in\pi x/L},
\qquad C_n=\frac1{2L}\int_{-L}^{L}f(x)e^{-in\pi x/L}\,dx.
\]

For a real target,

\[
C_0=a_0^{\rm course},\qquad
C_n=\frac{a_n-ib_n}{2},\qquad
C_{-n}=\frac{a_n+ib_n}{2}=\overline{C_n}\quad(n\ge1).
\]

The lecture uses \(\langle f,g\rangle=\int f\overline g\), linear in the first slot. Chen normalizes the inner product differently in his real and complex sections; the projection ratio is unchanged when a fixed inner product is multiplied by a positive constant. His Chapter 1–3 formulas use period \(2\pi\); the formulas above rescale the period to \(2L\). Sources: **H24, C3, T112**.

## Source roles and limits

| IDs | Role in the lecture |
|---|---|
| L7, V21, H24 | Course prerequisites, notation, familiar projection language, and local examples. |
| C1, C3, H43, T111, T112 | Core mathematical explanation: modes, coefficients, real/complex correspondence, and convergence qualifications. |
| H62, T132, T113 | Generalized eigenfunction expansions and changes of boundary conditions. Periodic multiplicity must be distinguished from separated-boundary simplicity. |
| S19 | Visual organization and the freeze/average explanation; its period-one convention is rescaled here. |
| O24 | Elementary Euler formula and the power-series connection, with a real input variable. |
| FT09 | Frequency spacing \(\Delta\omega=2\pi/T\) and the scaling needed when a Fourier sum becomes an integral. |
| LP08 | Only the one-sided definition and convergence qualification in equations (6), (7), and (11). For \(s=\sigma+i\omega\), the kernel is \(e^{-\sigma t}e^{-i\omega t}\) on \(t\ge0\); taking \(\sigma=0\) requires convergence. |
| H1822, HIST37 | Historical primary texts: Fourier's 1822 heat treatise and Sturm and Liouville's 1837 paper on generalized series of differential-equation solutions. |
| F14, C04, SB98 | Instructor preparation for brief prediction, comparison, and explanation activities. |

The teaching studies support active engagement, predictions before demonstrations, and preparing for explanation through contrasting cases. They do not establish that this particular Fourier sequence, timing, or illustration is uniquely optimal. The activity design is an adaptation of their findings. **F14** is a broad STEM meta-analysis; **C04** studies physics demonstrations; **SB98** studies learning from psychology cases.

## Historical framing

This lecture is a **modern reconstruction for students who already know boundary-value problems and projection**. Its route from a periodic BVP through Euler's formula, coefficient extraction, and operator inversion is our teaching design. Do not present it as a transcript of Fourier's discovery or attribute modern Hilbert-space or complex-coordinate language to the original investigators.

Two primary sources support the narrow historical comparison. In **H1822**, Fourier introduces the heat problem as finding future temperatures from a known initial distribution; the original French work was published in **1822**. The linked Cambridge page reproduces an excerpt from that original text and identifies its original publication date; its 2009/2010 reissue dates are not the original date. **HIST37** is Sturm and Liouville's **1837** joint paper about expanding functions in series of solutions to a parameter-dependent differential equation. Thus starting with the later SL framework is a deliberate classroom reconstruction. These two records do not establish every earlier priority claim about vibrating strings, or the first occurrence of every Fourier formula. S19 supplies visual and physical motivation, not primary evidence for those priority claims.

## Course-source provenance

The local course sources were checked directly: the L7 TeX source inside **CS138_L7_BVP1.zip**, **CS 138 Fourier Series.pdf**, **CS138_Lec3.pdf**, **fst01.pdf**, and **fst03.pdf**. Original uploads are not bundled with this lecture; consult the copies provided for the course.

H24's final slide names Kiusalaas's *Numerical Methods in Engineering w/ Python 3* and Heath's *Scientific Computing: An Introductory Survey*. Those books were not independently inspected for this lecture, and the slide does not identify editions. They are therefore not promoted to verified sources in this bibliography.

## Importing the bibliography

```typst
#import "references.typ": references, reference-groups

#let source = references.at("C3")
// source.id, source.label, source.title, source.author,
// source.detail, source.url, source.role
```

Use `source.label` for a readable footer and `source.id` for a compact key. For sources with `url: none`, render the label as ordinary text. The dictionary is independent of the slide theme and does not change any layout helpers.
