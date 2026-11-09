// SCL Beamer list geometry. Both native `-` and `+` lists stay editable.
// The right-facing triangle is vector geometry, not a font-dependent glyph.
#import "../settings.typ": theme-settings
#import "../colors.typ": colors

#let scl-item-triangle(depth) = {
  // Beamer's MSAM10 triangle uses 10pt, 9pt, 8pt at levels 1-3.
  // Size depends on the global theme, not local text() size overrides.
  let scale = calc.max(0.8, 1 - 0.1 * depth)
  let em = theme-settings.sizes.body_pt * scale
  let w = 0.777778 * em
  let h = 0.579102 * em
  box(width: w, height: h, baseline: h * 0.45,
    polygon(fill: colors.structure, stroke: none,
      (0pt, 0pt), (w, h / 2), (0pt, h)))
}

#let scl-enum-label(..numbers) = {
  let values = numbers.pos().map(str)
  let label = values.join(".") + if values.len() == 1 { "." } else { "" }
  text(fill: colors.structure, label)
}

#let scl-list-style(body) = {
  // Match SCL Beamer's marker/body anchors, not Typst's default dot/dash.
  set list(
    marker: scl-item-triangle,
    indent: theme-settings.spacing.list_indent_pt,
    body-indent: theme-settings.spacing.list_body_indent_pt
      - theme-settings.spacing.bullet_width_em,
    spacing: theme-settings.spacing.list_spacing_pt,
  )
  show list: it => {
    set par(leading: theme-settings.spacing.list_line_leading_pt)
    set list(spacing: theme-settings.spacing.nested_list_spacing_pt)
    // This show rule applies to nested descendants, not the outer list.
    show list: set text(size: 0.9 * theme-settings.sizes.body_pt)
    show list: set par(leading: theme-settings.spacing.nested_list_leading_pt)
    it
  }
  // Beamer's 1., 2.1, 2.1.1 labels remain blue and hierarchical.
  set enum(
    full: true,
    numbering: scl-enum-label,
    indent: theme-settings.spacing.list_indent_pt,
    body-indent: theme-settings.spacing.enum_body_indent_pt,
    spacing: theme-settings.spacing.list_spacing_pt,
  )
  show enum: it => {
    set par(leading: theme-settings.spacing.list_line_leading_pt)
    set enum(indent: theme-settings.spacing.nested_enum_indent_pt,
      spacing: theme-settings.spacing.nested_enum_spacing_pt)
    show enum: set text(size: 0.9 * theme-settings.sizes.body_pt)
    show enum: set par(leading: theme-settings.spacing.nested_list_leading_pt)
    it
  }
  body
}
