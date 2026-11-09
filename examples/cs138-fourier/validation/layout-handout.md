# Lecture layout verification

**Overall result: PASS**

Checked 132 physical PDF pages and 22 frames containing `eq-alt`.
The relation origin is its left baseline point. Its full range is measured across every equation reveal and all following reveals.

## Equation anchors

| Frame | Pages | States | Horizontal drift (pt) | Vertical drift (pt) | Result |
|---|---|---:|---:|---:|---|
| one_mode | 7-12 | 5 | 0.000000 | 0.000000 | pass |
| energy | 13-16 | 3 | 0.000000 | 0.000000 | pass |
| euler | 19-23 | 4 | 0.000000 | 0.000000 | pass |
| rotate | 24-26 | 3 | 0.000000 | 0.000000 | pass |
| quantize | 27-31 | 4 | 0.000000 | 0.000000 | pass |
| average | 34-37 | 3 | 0.000000 | 0.000000 | pass |
| isolate | 41-46 | 5 | 0.000000 | 0.000000 | pass |
| coefficient | 47-49 | 2 | 0.000000 | 0.000000 | pass |
| best | 50-53 | 3 | 0.000000 | 0.000000 | pass |
| real | 57-60 | 3 | 0.000000 | 0.000000 | pass |
| geometry | 61-62 | 2 | 0.000000 | 0.000000 | pass |
| pair | 63-66 | 3 | 0.000000 | 0.000000 | pass |
| series | 67-69 | 2 | 0.000000 | 0.000000 | pass |
| formulas | 70-73 | 3 | 0.000000 | 0.000000 | pass |
| tent_coeff | 78-82 | 4 | 0.000000 | 0.000000 | pass |
| filter | 84-88 | 4 | 0.000000 | 0.000000 | pass |
| example | 89-92 | 3 | 0.000000 | 0.000000 | pass |
| general | 94-96 | 2 | 0.000000 | 0.000000 | pass |
| log | 97-99 | 2 | 0.000000 | 0.000000 | pass |
| heat | 100-103 | 3 | 0.000000 | 0.000000 | pass |
| rigor | 114-117 | 3 | 0.000000 | 0.000000 | pass |
| laplace | 124-126 | 2 | 0.000000 | 0.000000 | pass |

## Text bounds

Body x = 14.173 to 385.512 pt; body bottom = 246.614 pt. Sidebar begins at 399.685 pt.
Header text and the template's small sidebar navigation/badges are excluded. A 0.75 pt allowance avoids font-metric overhang noise.

No extracted body text extends beyond those bounds.

## Source/build consistency

Source frame IDs, PDF page count, and frame map agree.

## Scope and limits

- Stage search band: baseline y = 65-155 pt. The first reveal must have one full-size math relation in this band. Smaller summation subscripts and prompt/footer relations cannot become the anchor.
- Alignment tolerance: 0.3 pt in each direction by default. Missing, ambiguous, custom-symbol, or multiple-derivation frames fail review.
- These checks measure PDF glyph positions and text bounding boxes. They do not prove that all vector artwork, images, or clipping paths are correct. Visual slide inspection remains necessary.
- The JSON records candidate glyphs, every selected state, file hashes, and exact tolerances so the result is auditable.
