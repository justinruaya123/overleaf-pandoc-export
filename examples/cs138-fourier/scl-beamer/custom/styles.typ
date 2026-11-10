// Thin author helpers: native text content remains visible to Touying.
// Import explicitly; use std.red/std.green/std.blue when a color value is needed.
#import "../settings.typ": theme-settings
#import "../colors.typ": colors

#let red(body) = text(fill: theme-settings.accents.red, body)
#let green(body) = text(fill: theme-settings.accents.green, body)
#let blue(body) = text(fill: theme-settings.accents.blue, body)
#let structure(body) = text(fill: colors.structure, body)

// Touying 0.6.1 alert is a delayed marker, unsafe in measured math contexts.
// Keep the original static math styling; prose still uses native #alert.
#let math-alert(body) = text(fill: colors.alert, body)

// Match LaTeX text-in-math fonts; size still follows the math/script context.
#let math-text(body, small: false) = text(
  font: (
    if small { theme-settings.fonts.small } else { theme-settings.fonts.body },
    // Preserve the configured math face for equations nested in prose.
    theme-settings.fonts.math,
  ),
  body,
)
