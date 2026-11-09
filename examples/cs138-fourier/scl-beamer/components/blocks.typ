#import "@preview/touying:0.6.3": touying-fn-wrapper
#import "../colors.typ": colors, palette
#import "../geometry.typ": texpt
#import "../settings.typ": theme-settings

// Native blocks keep their children visible to Touying's overlay walker.
#let scl-block(title: none, kind: "normal", width: 100%, radius: 0pt, title-color: auto, full-width: false, body) = {
  assert(kind in ("normal", "alert", "example"), message: "block kind must be normal, alert, or example")
  if full-width {
    // SCL uses frame textwidth inside lists. Right-align an oversized native
    // block to cancel the list inset; no context or deferred body is needed.
    let frame-width = (theme-settings.canvas.width_mm
      - theme-settings.canvas.sidebar_width_mm
      - 2 * theme-settings.canvas.margin_mm)
    return align(right, block(width: frame-width, align(left,
      scl-block(title: title, kind: kind, radius: radius,
        title-color: title-color, body))))
  }
  let normal = kind == "normal"
  let heading-color = if title-color != auto { title-color } else if kind == "alert" { colors.alert } else if kind == "example" { rgb("008000") } else { colors.block-title }
  // SCL overrides the normal block only. Beamer's inherited alert/example
  // blocks have colored title text and transparent title/body backgrounds.
  let title-fill = if normal { colors.structure } else { none }
  pad(x: -theme-settings.spacing.block_inset_pt, block(width: width, above: theme-settings.spacing.block_above_pt, below: theme-settings.spacing.block_below_pt, breakable: false)[
    #if title != none {
      // Natural glyph depth matters: descenders and parentheses make the
      // original Beamer title boxes taller. A fixed baseline box loses it.
      block(width: 100%, above: 0pt, below: 0pt, fill: title-fill, inset: (x: theme-settings.spacing.block_inset_pt, top: if normal { theme-settings.spacing.block_title_top_pt } else { 3.45 * texpt }, bottom: if normal { theme-settings.spacing.block_title_bottom_pt } else { 4.94 * texpt }), radius: (top: radius),
        text(font: theme-settings.fonts.display, top-edge: if normal { "bounds" } else { "cap-height" }, bottom-edge: "bounds", size: theme-settings.sizes.block_title_pt, fill: heading-color, title))
    }
    #if normal { v(-0.5 * texpt) }
    // With the bundled body face, the first prose baseline is 12 TeXpt
    // below the white panel's top, matching Beamer's body strut.
    #block(width: 100%, above: 0pt, below: 0pt, fill: if normal { white } else { none }, inset: (x: theme-settings.spacing.block_inset_pt, top: if normal { theme-settings.spacing.block_top_pt } else { 0pt }, bottom: if normal { theme-settings.spacing.block_title_top_pt } else { 0pt }), radius: (bottom: radius), body)
  ])
}

#let alert-block(title: none, full-width: false, body) = scl-block(title: title, kind: "alert", full-width: full-width, body)
#let example-block(title: none, full-width: false, body) = scl-block(title: title, kind: "example", full-width: full-width, body)
#let hover-block(title: none, body) = align(center, scl-block(title: title, width: 80%, radius: 3pt, title-color: white, body))

#let hover(body) = touying-fn-wrapper((self: none) => {
  // A zero-size anchor gives the real page position even inside a centered
  // slide, a list, or a column. The modal always covers the whole page.
  box(width: 0pt, height: 0pt, context {
    let pos = here().position()
    let modal-width = (self.page.width - self.store.sidebar-width - 2 * self.store.body-margin) * 90%
    place(top + left, dx: -pos.x, dy: -pos.y,
      rect(width: self.page.width, height: self.page.height, fill: black.transparentize(25%), stroke: none))
    place(top + left, dx: -pos.x, dy: -pos.y,
      block(width: self.page.width, height: self.page.height,
        align(center + horizon, block(width: modal-width, body))))
  })
})
