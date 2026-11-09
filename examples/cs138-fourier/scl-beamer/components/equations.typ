// Equation derivations that retain the LE2 and misc/custom.typ calling styles.
#import "@preview/touying:0.6.3" as _touying
#import "overlays.typ": pauses
#import "../settings.typ": theme-settings

/// Source-compatible aligned equations without repeated per-slide set rules.
/// This is native content: Touying can still see pauses and keyframes inside.
#let equation-lines(body, trailing-row: false) = {
  set par(leading: theme-settings.spacing.align_leading_pt)
  show math.equation.where(block: true): set block(
    above: theme-settings.spacing.align_above_pt,
    below: theme-settings.spacing.align_below_pt,
  )
  body
  if trailing-row { v(theme-settings.spacing.align_blank_row_pt) }
}

// Place equation bodies in one native math run. This preserves the math axis
// for fractions, roots, sums, matrices, and the relation between both sides.
#let _math-content(it) = {
  if type(it) != content {
    return it
  }
  if it.func() == math.equation {
    return it.body
  }
  if _touying.utils.is-sequence(it) {
    return it.children.map(_math-content).sum(default: [])
  }
  it
}

#let _inline-display(body) = math.equation(
  block: false,
  numbering: none,
  math.display(body),
)

#let _fit-eq-line(
  lhs,
  rhs,
  all-lhs,
  all-rhs,
  symbol: $=$,
  width-factor: 0.9,
  ali: center,
  gutter: 0.6em,
) = layout(size => {
  let left-sides = all-lhs.map(_math-content)
  let right-sides = all-rhs.map(_math-content)
  let lhs = _math-content(lhs)
  let rhs = _math-content(rhs)
  let relation = _math-content(symbol)

  let measure-math(it) = measure(_inline-display(it)).width
  let allowed = size.width * width-factor
  let symbol-width = measure-math(relation)
  let gutter-width = measure(h(gutter)).width
  let lhs-width = measure-math(lhs)
  let rhs-width = measure-math(rhs)
  let max-lhs = calc.max(..left-sides.map(measure-math))
  let max-rhs = calc.max(..right-sides.map(measure-math))
  let min-width = max-lhs + symbol-width + max-rhs + 2 * gutter-width
  let half-width = (allowed - symbol-width - 2 * gutter-width) / 2

  // Center the relation when both sides fit; otherwise give the longer side
  // the space it needs. Every overlay uses these same columns and scale.
  let (left-col, right-col) = if max-lhs <= half-width and max-rhs <= half-width {
    (half-width, half-width)
  } else if min-width <= allowed {
    (allowed - symbol-width - 2 * gutter-width - max-rhs, max-rhs)
  } else {
    (max-lhs, max-rhs)
  }

  // An invisible native math run contributes the same ascent and descent to
  // every step. Backtrack before the phantom: placing the backtrack after a
  // very wide phantom can shift the visible equation out of a narrow region.
  let phantom = (..left-sides, relation, ..right-sides).sum(default: [])
  let phantom-width = measure-math(phantom)
  let line = _inline-display([
    #h(-phantom-width)#hide(phantom)
    #h(left-col - lhs-width)#lhs#h(gutter)#relation#h(gutter)#rhs#h(right-col - rhs-width)
  ])
  let natural-width = left-col + symbol-width + right-col + 2 * gutter-width
  let ratio = calc.min(1.0, allowed / natural-width) * 100%

  align(ali, block(width: allowed, breakable: false)[
    #align(center)[#scale(x: ratio, y: ratio, reflow: true, line)]
  ])
})

/// Show successive left/right equation pairs in the same position.
/// With expand: true, retain earlier pairs as vertically aligned rows.
///
/// Preferred interleaved form (as in misc/custom.typ):
///   #eq-alt(([$x$], [$1+1$], [$x$], [$2$]))
/// This advances the timeline by one pause between adjacent pairs.
///
/// Existing LE2 form:
///   #eq-alt(([$x$],), ([$1+1$], [$2$]))
/// Each side repeats its last entry if lengths differ. This form retains the
/// LE2 default: it reserves its overlays without advancing following content.
/// Use #pauses(n) or auto-pauses: true to advance following content.
///
/// auto-pauses: true / false overrides the default for either form.
#let eq-alt(
  items,
  symbol: $=$,
  ali: center,
  width-factor: 0.9,
  auto-pauses: auto,
  expand: false,
  gutter: 0.6em,
  ..legacy,
) = {
  assert(type(items) == array, message: "eq-alt expects an array of equation entries")
  assert(legacy.named().len() == 0 and legacy.pos().len() <= 1,
    message: "eq-alt accepts one interleaved array or two arrays: lhs, rhs")
  assert(type(width-factor) in (int, float) and width-factor > 0 and width-factor <= 1,
    message: "eq-alt width-factor must be a number greater than 0 and at most 1")
  assert(auto-pauses == auto or type(auto-pauses) == bool,
    message: "eq-alt auto-pauses must be auto, true, or false")
  assert(type(expand) == bool, message: "eq-alt expand must be true or false")

  let is-legacy = legacy.pos().len() == 1
  let (lhs, rhs) = if is-legacy {
    let rhs = legacy.pos().first()
    assert(type(rhs) == array,
      message: "eq-alt expects both legacy arguments to be arrays")
    (items, rhs)
  } else {
    assert(calc.rem(items.len(), 2) == 0,
      message: "eq-alt expects an even number of entries: LHS, RHS, LHS, RHS, ...")
    (
      items.enumerate().filter(pair => calc.rem(pair.first(), 2) == 0).map(pair => pair.last()),
      items.enumerate().filter(pair => calc.rem(pair.first(), 2) == 1).map(pair => pair.last()),
    )
  }
  assert(lhs.len() > 0 and rhs.len() > 0,
    message: "eq-alt needs at least one entry on each side")

  let steps = calc.max(lhs.len(), rhs.len())
  let rows = range(steps).map(i => _fit-eq-line(
    lhs.at(calc.min(i, lhs.len() - 1)),
    rhs.at(calc.min(i, rhs.len() - 1)),
    lhs,
    rhs,
    symbol: symbol,
    width-factor: width-factor,
    ali: ali,
    gutter: gutter,
  ))

  let advance = if auto-pauses == auto { not is-legacy } else { auto-pauses }
  if expand {
    block(width: 100%, breakable: false)[
      #for (index, row) in rows.enumerate() {
        if index > 0 { _touying.pause }
        row
      }
    ]
    if not advance and steps > 1 {
      _touying.jump(1 - steps, relative: true)
    }
  } else {
    block(width: 100%, breakable: false)[
      #_touying.alternatives(repeat-last: true, stretch: false, ..rows)
    ]
    if advance and steps > 1 {
      pauses(steps - 1)
    }
  }
}
