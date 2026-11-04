// Keep CeTZ's module interface: sources call cetz.canvas and import cetz.draw.
#import "@preview/cetz:0.4.2" as native-cetz
#import "@preview/cetz:0.4.2": draw

#let canvas(..arguments) = context {
  if target() == "html" {
    html.elem("div", attrs: (class: "typst-diagram"),
      html.frame(native-cetz.canvas(..arguments)))
  } else { native-cetz.canvas(..arguments) }
}
