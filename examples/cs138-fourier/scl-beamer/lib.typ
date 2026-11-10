// SPDX-License-Identifier: GPL-3.0-or-later
// Original SCLsidebar Beamer theme: John Justine Villar.
// The derived Touying theme is GPL-3.0-or-later.
// Latin Modern fonts retain the upstream GUST Font License and metadata;
// see ctan.org/pkg/lm and ctan.org/pkg/lm-math.
// External dependencies: Touying 0.6.3 and CeTZ 0.4.2.
//
// A reusable Touying theme. Import this one file; standard Touying APIs remain available.
#import "@preview/touying:0.6.3": *
#import "colors.typ": *
#import "geometry.typ": *
#import "components/branding.typ": *
#import "components/blocks.typ": *
#import "components/equations.typ": eq-alt, equation-lines
#import "components/overlays.typ": pauses, mathpause, mathpauses
#import "components/diagrams.typ": cetz, cetz-canvas
#import "components/references.typ": reference-entry, scl-bibliography
#import "theme.typ": *

// A descriptive alias for authors who prefer the package name in the show rule.
#let scl-beamer = scl-theme
#import "components/tikz-cetz.typ": scl-tikz-smooth, scl-pgf-axis, scl-tikz-marks
