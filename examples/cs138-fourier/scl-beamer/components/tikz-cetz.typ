// Native CeTZ counterparts of the supported static TikZ/PGFPlots primitives.
// All coordinates, series, functions and labels remain editable Typst.
#import "@preview/cetz:0.4.2"
#import "../geometry.typ": texpt
#import "../settings.typ": theme-settings

// PGF's smooth handler uses a cubic support displacement of .2775*tension
// times the vector from the preceding to the following knot. Its endpoints
// have zero tangent. This is not a substitute spline fit.
#let scl-tikz-smooth(points, tension: 0.5, ..style) = {
  import cetz.draw: *
  assert(points.len() >= 2)
  let d = i => if i == 0 or i == points.len() - 1 { (0, 0) } else {
    let a = points.at(i - 1)
    let b = points.at(i + 1)
    ((b.at(0) - a.at(0)) * .2775 * tension,
      (b.at(1) - a.at(1)) * .2775 * tension)
  }
  merge-path(..style, {
    for i in range(points.len() - 1) {
      let a = points.at(i)
      let b = points.at(i + 1)
      let da = d(i)
      let db = d(i + 1)
      bezier(a, b, (a.at(0) + da.at(0), a.at(1) + da.at(1)),
        (b.at(0) - db.at(0), b.at(1) - db.at(1)))
    }
  })
}

#let scl-pgf-axis(
  width: 200, height: 120, limits: (0, 1, 0, 1),
  x-ticks: (), y-ticks: (), x-label: [], y-label: [],
  domain: (0, 1), samples: 25, smooth: false, show-grid: false,
  grid-stroke: gray + .4pt, axis-stroke: black + .4pt,
  tick-stroke: black + .4pt,
  legend-at: (.98, .98), legend-anchor: "north-east",
  legend-fill: white, legend-stroke: black, series: (),
) = {
  import cetz.draw: *
  let (xmin, xmax, ymin, ymax) = limits
  let map-point(p) = (
    (p.at(0) - xmin) / (xmax - xmin) * width,
    (p.at(1) - ymin) / (ymax - ymin) * height,
  )
  let tick = 4 * texpt / 1pt
  let text-label(body) = text(font: theme-settings.fonts.body, size: 10 * texpt, body)
  if show-grid {
    for x in x-ticks {
      let xx = map-point((x, ymin)).at(0)
      line((xx, 0), (xx, height), stroke: grid-stroke)
    }
    for y in y-ticks {
      let yy = map-point((xmin, y)).at(1)
      line((0, yy), (width, yy), stroke: grid-stroke)
    }
  }
  rect((0, 0), (width, height), stroke: axis-stroke)
  for x in x-ticks {
    let xx = map-point((x, ymin)).at(0)
    line((xx, 0), (xx, tick), stroke: tick-stroke)
    line((xx, height), (xx, height - tick), stroke: tick-stroke)
    content((xx, -3), text-label($#str(x)$), anchor: "north")
  }
  for y in y-ticks {
    let yy = map-point((xmin, y)).at(1)
    line((0, yy), (tick, yy), stroke: tick-stroke)
    line((width, yy), (width - tick, yy), stroke: tick-stroke)
    content((-3, yy), text-label($#str(y)$), anchor: "east")
  }
  content((width / 2, -19), text-label(x-label), anchor: "north")
  content((-24, height / 2), text-label(y-label), angle: 90deg)
  let mapped-series = series.map(entry => {
    let points = if "function" in entry {
      range(samples).map(i => {
        let x = domain.at(0) + i * (domain.at(1) - domain.at(0)) / (samples - 1)
        (x, (entry.function)(x))
      })
    } else { entry.data }
    (style: entry, points: points.map(map-point))
  })
  // CeTZ 0.4.2 has no clip instruction. Use a native Typst clipping box
  // around a fixed-bounds CeTZ canvas, not an external image.
  let curves = cetz.canvas(length: 1pt, {
    import cetz.draw: *
    hide(rect((0, 0), (width, height), stroke: none), bounds: true)
    floating({
      for entry in mapped-series {
        if smooth {
          scl-tikz-smooth(entry.points, stroke: entry.style.stroke)
        } else {
          line(..entry.points, stroke: entry.style.stroke)
        }
      }
    })
  })
  content((0, 0), box(width: width * 1pt, height: height * 1pt,
    clip: true, curves), anchor: "south-west")
  // PGFPlots does not clip marker paths by default.
  for entry in mapped-series {
    if entry.style.marker != "none" {
      for p in entry.points {
        circle(p, radius: entry.style.marker-radius,
          fill: entry.style.marker-fill, stroke: entry.style.marker-stroke)
      }
    }
  }
  let entries = series.filter(s => s.label != [])
  if entries.len() > 0 {
    let rows = ()
    for entry in entries {
      rows.push(cetz.canvas(length: 1pt, {
        import cetz.draw: *
        line((0, 0), (16, 0), stroke: entry.stroke)
        if entry.marker != "none" {
          circle((8, 0), radius: entry.marker-radius,
            fill: entry.marker-fill, stroke: entry.marker-stroke)
        }
      }))
      rows.push(text-label(entry.label))
    }
    let legend = block(fill: legend-fill, stroke: legend-stroke + .4pt,
      inset: 3pt, std.grid(columns: (auto, auto), column-gutter: 4pt,
        row-gutter: 2pt, align: (center + horizon, left + horizon), ..rows))
    content((legend-at.at(0) * width, legend-at.at(1) * height),
      legend, anchor: legend-anchor)
  }
}

// Native paths for PGF's legacy to, stealth and latex tips. Unlike CeTZ's
// default triangle, their dimensions depend on TeX points and line width.
#let scl-tikz-marks(unit: 1cm) = {
  import cetz.draw: *
  let point = texpt / unit
  register-mark("scl-pgf-to", style => {
    let w = style.canvas-thickness
    let d = .28 * point + .3 * w
    merge-path(stroke: (paint: style.stroke.paint,
      thickness: .8 * style.stroke.thickness, cap: "round", join: "round"), {
      bezier((-3*d, 4*d), (.75*d, 0), (-2.75*d, 2.5*d), (0, .25*d))
      bezier((.75*d, 0), (-3*d, -4*d), (0, -.25*d), (-2.75*d, -2.5*d))
    })
    anchor("tip", (.21 * point + .625 * w, 0))
    anchor("base", (-.84 * point - 1.3 * w, 0))
  })
  register-mark("scl-pgf-stealth", style => {
    let d = .28 * point + .3 * style.canvas-thickness
    line((5*d, 0), (-3*d, 4*d), (0, 0), (-3*d, -4*d),
      close: true, stroke: none, fill: style.stroke.paint)
    anchor("tip", (5*d, 0))
    anchor("base", (-3*d, 0))
  })
  register-mark("scl-pgf-latex", style => {
    let d = .28 * point + .3 * style.canvas-thickness
    merge-path(stroke: none, fill: style.stroke.paint, close: true, {
      bezier((9*d, 0), (-d, 3.75*d), (6.3333*d, .5*d), (2*d, 2*d))
      line((-d, 3.75*d), (-d, -3.75*d))
      bezier((-d, -3.75*d), (9*d, 0), (2*d, -2*d), (6.3333*d, -.5*d))
    })
    anchor("tip", (9*d, 0))
    anchor("base", (-d, 0))
  })
}
