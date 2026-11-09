// SCL Sidebar theme, port of John Justine Villar's 2015–2017 Beamer theme.
// SPDX-License-Identifier: GPL-3.0-or-later

// Palette values originate from theme.py -> settings.typ.
#import "settings.typ": theme-settings
#let palette = (
  up-maroon: theme-settings.palette.up_maroon,
  dark-blue: theme-settings.palette.dark_blue,
  dark-blue-1: theme-settings.palette.dark_blue_1,
  dark-blue-2: theme-settings.palette.dark_blue_2,
  dark-blue-3: theme-settings.palette.dark_blue_3,
  light-blue: theme-settings.palette.light_blue,
  gray: theme-settings.palette.gray,
  gray-text: theme-settings.palette.gray_text,
  gray-blue: theme-settings.palette.gray_blue,
)

// xcolor mixes are performed in sRGB, not Typst's perceptual color space.
#let xcolor-mix(a, b, amount) = {
  color.mix((a, amount), (b, 100% - amount), space: rgb)
}

#let colors = (
  structure: xcolor-mix(palette.dark-blue, palette.light-blue, 15%),
  frame-title: xcolor-mix(palette.dark-blue, palette.light-blue, 65%),
  body: xcolor-mix(palette.gray-text, white, 80%),
  background: xcolor-mix(palette.gray, white, 30%),
  rail: xcolor-mix(black, white, 35%),
  rail-active: xcolor-mix(black, white, 65%),
  // The source's DeviceCMYK 0,0,.3,0 renders as #FFFAC2. Typst quantizes
  // CMYK to 8-bit values; using its measured sRGB avoids a one-byte shift.
  block-title: theme-settings.roles.block_title,
  alert: theme-settings.roles.alert,
  sidebar-shaded: theme-settings.roles.sidebar_shaded,
  sidebar-author: xcolor-mix(white, palette.dark-blue, 80%),
  sidebar-tint: xcolor-mix(black, palette.dark-blue, 10%),
  title-tint: xcolor-mix(palette.dark-blue, palette.light-blue, 80%),
  ending-tint: xcolor-mix(palette.dark-blue, black, 99%),
)
#let colors = colors + (
  title: xcolor-mix(white, colors.structure, 90%),
  author: xcolor-mix(white, colors.structure, 85%),
  date: xcolor-mix(white, colors.structure, 75%),
  institution: xcolor-mix(white, colors.structure, 65%),
)

// Explicit names used in SCL sources remain convenient in Typst.
#let UPmaroon = palette.up-maroon
#let SCLdarkblue = palette.dark-blue
#let SCLdarkblue1 = palette.dark-blue-1
#let SCLdarkblue2 = palette.dark-blue-2
#let SCLdarkblue3 = palette.dark-blue-3
#let SCLlightblue = palette.light-blue
#let SCLgray = palette.gray
#let SCLgraytext = palette.gray-text
#let SCLgrayblue = palette.gray-blue
