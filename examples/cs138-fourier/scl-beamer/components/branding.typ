// Institutional branding is supplied by the project owner.
// The code licence does not relicense institutional logos or trademarks.
#import "../colors.typ": palette, colors
#import "../geometry.typ": texpt
#import "../settings.typ": theme-settings

#let scl-affiliation = [Scientific Computing Laboratory\
Department of Computer Science\
University of the Philippines Diliman]

#let scl-logos(height: 10mm) = {
  box(height: height, image("../assets/scllogoondark.png", height: height))
  h(1.5mm)
  box(height: height, image("../assets/dcslogo.png", height: height))
  h(1mm)
  box(height: height, image("../assets/uplogo.png", height: height))
}

#let scl-sidebar-logo(height: 30 * texpt) = image("../assets/scllogoctrtrans.png", height: height)

#let scl-background(width: theme-settings.canvas.width_mm, height: theme-settings.canvas.height_mm, ending: false) = {
  image("../assets/SCLbgdark.png", width: width, height: height, fit: "stretch")
  place(top + left, rect(
    width: width, height: height, stroke: none,
    fill: (if ending { colors.ending-tint } else { colors.title-tint }).transparentize(20%),
  ))
}

#let tref(address, body: auto) = text(fill: colors.author, font: theme-settings.fonts.mono, link("mailto:" + address, if body == auto { address } else { body }))
#let chref(dest, body) = text(fill: colors.structure, link(dest, body))
