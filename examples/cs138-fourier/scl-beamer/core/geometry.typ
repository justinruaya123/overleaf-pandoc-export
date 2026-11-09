// TeX pt is 1/72.27 inch; Typst pt is 1/72 inch.
#import "settings.typ": theme-settings
#let texpt = 72 / 72.27 * 1pt
#let geometry = (
  width: theme-settings.canvas.width_mm,
  height: theme-settings.canvas.height_mm,
  sidebar: theme-settings.canvas.sidebar_width_mm,
  header: theme-settings.canvas.header_height_pt,
  rail: theme-settings.canvas.rail_width_pt,
  margin: theme-settings.canvas.margin_mm,
  body-size: theme-settings.sizes.body_pt,
  title-size: theme-settings.sizes.frame_title_pt,
  subtitle-size: theme-settings.sizes.frame_subtitle_pt,
  sidebar-size: theme-settings.sizes.navigation_pt,
)
