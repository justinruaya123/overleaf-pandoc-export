// Common content rules for Typst's native HTML target.
#let export-document(body) = {
  // Native HTML currently omits text styling; preserve explicit emphasis/colors.
  show text: it => context {
    if target() == "html" {
      assert(type(text.fill) == color,
        message: "HTML text export supports solid colors only")
      let styles = ()
      if text.fill != black { styles.push("color:" + text.fill.to-hex()) }
      if text.weight != "regular" and text.weight != 400 {
        let weights = (thin: 100, extralight: 200, light: 300, medium: 500,
          semibold: 600, bold: 700, extrabold: 800, black: 900)
        styles.push("font-weight:" + str(weights.at(str(text.weight), default: text.weight)))
      }
      if text.style != "normal" { styles.push("font-style:" + text.style) }
      if styles.len() == 0 { it } else {
        html.elem("span", attrs: (style: styles.join(";")), it)
      }
    } else { it }
  }
  // Framing mathematics keeps the original math layout and embeds all glyphs.
  show math.equation: it => context {
    if target() == "html" {
      let tag = if it.block { "div" } else { "span" }
      let classes = if it.block { "typst-math display" } else { "typst-math" }
      // Font cap-height metrics can omit tall limits/descenders from the frame.
      // Use actual glyph bounds so scroll containers never clip the equation.
      html.elem(tag, attrs: (class: classes),
        html.frame(pad(0.5pt,
          text(top-edge: "bounds", bottom-edge: "bounds", it))))
    } else { it }
  }
  // Native HTML currently omits table.hline/vline and column alignment.
  // Keep ruled mathematical arrays intact; ordinary tables remain HTML.
  show table: it => context {
    if target() == "html" and it.children.any(child =>
      child.func() in (table.hline, table.vline)) {
      html.elem("div", attrs: (class: "typst-table"), html.frame(it))
    } else { it }
  }
  show align: it => context {
    if target() == "html" { it.body } else { it }
  }
  show h: it => context {
    if target() == "html" { [ ] } else { it }
  }
  show v: it => context {
    if target() == "html" { [] } else { it }
  }
  body
}
