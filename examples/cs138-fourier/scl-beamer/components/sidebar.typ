#import "@preview/touying:0.6.3": utils
#import "../colors.typ": palette, colors
#import "../geometry.typ": texpt
#import "../settings.typ": theme-settings

#let nav-text(font: theme-settings.fonts.body, weight: "bold", fill: colors.title, size: theme-settings.sizes.navigation_pt, body) = {
  set text(font: font, size: size, weight: weight, fill: fill, top-edge: "cap-height", bottom-edge: "baseline")
  set par(justify: false, leading: 2.53 * texpt, spacing: 0pt)
  set block(spacing: 0pt)
  body
}

#let sidebar-background(self) = {
  let w = self.page.width
  let h = self.page.height
  let sw = self.store.sidebar-width
  let hh = self.store.header-height
  let rw = self.store.rail-width
  let right-side = self.store.sidebar-side == right
  let sx = if right-side { w - sw } else { 0pt }
  let rx = if right-side { sx - rw / 2 } else { sw + rw / 2 }
  place(top + left, dx: sx,
    image("../assets/sb.png", width: sw, height: h, fit: "stretch"))
  place(top + left, dx: sx,
    rect(width: sw, height: h, stroke: none, fill: if right-side { colors.sidebar-tint.transparentize(30%) } else { palette.dark-blue.transparentize(20%) }))
  place(top + left, dx: if right-side { 0pt } else { sw },
    rect(width: w - sw, height: hh - rw / 2, stroke: none, fill: white))
  place(top + left, dx: if right-side { 0pt } else { sw }, dy: hh,
    line(length: w - sw, stroke: colors.rail + rw))
  place(top + left, dx: rx, dy: hh,
    line(end: (0pt, h - hh), stroke: colors.rail + rw))
}

#let sidebar-navigation(self) = context {
  let w = self.page.width
  let h = self.page.height
  let sw = self.store.sidebar-width
  let hh = self.store.header-height
  let rw = self.store.rail-width
  let right-side = self.store.sidebar-side == right
  let sx = if right-side { w - sw } else { 0pt }
  let rx = if right-side { sx - rw / 2 } else { sw + rw / 2 }
  let nav-size = theme-settings.sizes.navigation_pt
  let nav-width = sw - 2 * theme-settings.spacing.sidebar_nav_inset_pt
  let current-page = here().page()
  let heads = query(heading).filter(it => it.level <= self.store.navigation-depth and it.outlined)
  let current = heads.filter(it => it.location().page() <= current-page).at(-1, default: none)
  let short-title = if self.info.short-title == auto { self.info.title } else { self.info.short-title }

  set par(justify: false, leading: 2.5 * texpt, spacing: 0pt)
  set block(spacing: 0pt)
  set text(font: theme-settings.fonts.body, size: nav-size, weight: "bold", fill: colors.title,
    top-edge: "cap-height", bottom-edge: "baseline")

  place(top + left, dx: sx, dy: 2.5pt,
    box(width: sw, align(center, image("../assets/scllogoctrtrans.png", width: sw - 0.8pt))))

  let y = hh + theme-settings.spacing.sidebar_nav_top_pt
  if not self.store.hide-title {
    let title-body = block(width: sw * 90%, nav-text(align(center, short-title)))
    place(top + left, dx: sx + sw * 5%, dy: y + 0.129pt, link((page: 1, x: 0pt, y: 0pt), title-body))
    y += measure(title-body).height + theme-settings.spacing.nav_title_gap_pt
  }
  if not self.store.hide-author {
    let short-author = self.info.at("short-author", default: self.info.author)
    let author-body = block(width: sw * 90%, nav-text(font: theme-settings.fonts.small, weight: "regular", fill: colors.sidebar-author, align(center, short-author)))
    place(top + left, dx: sx + sw * 5%, dy: y - 0.015pt, author-body)
    y += measure(author-body).height + theme-settings.spacing.nav_author_gap_pt
  }
  let active-y = none
  let first-entry = true
  for entry in heads {
    let active = current != none and entry.location() == current.location()
    let relevant = if self.store.hide-all-subsections { entry.level == 1 } else if self.store.hide-other-subsections and entry.level > 1 {
      let parents = heads.filter(it => it.level == 1 and it.location().page() <= entry.location().page())
      let now-parents = heads.filter(it => it.level == 1 and it.location().page() <= current-page)
      parents.at(-1, default: none) == now-parents.at(-1, default: none)
    } else { true }
    if not relevant { continue }
    if not first-entry {
      y += if entry.level > 1 { theme-settings.spacing.nav_subsection_gap_pt }
        else { theme-settings.spacing.nav_item_gap_pt }
    }
    first-entry = false
    let indent = (entry.level - 1) * 2 * texpt
    let nav = block(width: nav-width - indent, nav-text(fill: if active { white } else { colors.sidebar-shaded },
      size: if entry.level > 1 { theme-settings.sizes.navigation_subsection_pt } else { nav-size },
      weight: if entry.level > 1 { "regular" } else { "bold" }, entry.body))
    place(top + left, dx: sx + theme-settings.spacing.sidebar_nav_inset_pt + indent, dy: y + 0.361pt, link(entry.location(), nav))
    if active { active-y = y + 2 * texpt }
    y += measure(nav).height
  }
  if active-y != none {
    let info = query(<scl-page-info>).filter(it => it.location().page() == current-page).at(0, default: none)
    let current-number = if info != none { info.value.frame } else { utils.slide-counter.get().first() }
    // PGF's circular node grows with its label; Beamer's two-digit badges
    // are approximately 3.5 mm across instead of the 3 mm minimum.
    let radius = if current-number < 10 { 1.5mm } else { 1.75mm }
    place(top + left, dx: if right-side { 0pt } else { sw }, dy: hh,
      line(length: w - sw, stroke: colors.rail-active + rw))
    place(top + left, dx: rx, dy: hh,
      line(end: (0pt, active-y - hh), stroke: colors.rail-active + rw))
    place(top + left, dx: rx - radius, dy: active-y - radius,
      circle(radius: radius, fill: white, stroke: colors.rail + 0.8 * texpt,
        align(center + horizon, text(size: theme-settings.sizes.badge_pt, weight: "bold", fill: black, str(current-number)))))
  }
  place(top + left, dx: rx - 1.75mm, dy: h - 2mm - 1.75mm,
    circle(radius: 1.75mm, fill: white, stroke: colors.rail + 1.2 * texpt,
      align(center + horizon, text(size: theme-settings.sizes.badge_pt, weight: "regular", fill: black, utils.last-slide-number))))

  if not self.store.hide-institute {
    let event = self.info.at("short-event", default: self.info.at("event", default: [SCL Presentation]))
    place(top + left, dx: sx, dy: h - 12.904pt, box(width: sw, align(center, text(size: theme-settings.sizes.badge_pt, top-edge: "baseline", bottom-edge: "baseline", event))))
    place(top + left, dx: sx, dy: h - 7.472pt, box(width: sw, align(center, text(size: theme-settings.sizes.badge_pt, top-edge: "baseline", bottom-edge: "baseline", utils.display-info-date(self)))))
  }
}

#let frame-heading(self) = context {
  let sw = self.store.sidebar-width
  let hh = self.store.header-height
  let left-offset = if self.store.sidebar-side == right { self.store.body-margin } else { sw + self.store.body-margin }
  let content-width = self.page.width - sw - 2 * self.store.body-margin
  let has-subtitle = self.store.subtitle != none
  let title = utils.call-or-display(self, self.store.title)
  let title-body = block(width: content-width, {
    set par(leading: 9.5 * texpt, spacing: 0pt)
    set text(font: theme-settings.fonts.display, size: theme-settings.sizes.frame_title_pt, fill: colors.frame-title, top-edge: "bounds", bottom-edge: if has-subtitle { "baseline" } else { "bounds" })
    title
    if has-subtitle {
      linebreak()
      text(font: theme-settings.fonts.small, size: theme-settings.sizes.frame_subtitle_pt, top-edge: "baseline", bottom-edge: "bounds", self.store.subtitle)
    }
  })
  let title-height = measure(title-body).height
  // Leave the rail and its stroke clear when a wrapped heading needs fitting.
  let available = hh - 2 * texpt - 2 * self.store.rail-width
  let fitted = if theme-settings.overflow.title_autofit and title-height > available {
    scale(calc.max(theme-settings.overflow.title_min_scale, available / title-height) * 100%, reflow: true, origin: top + left, title-body)
  } else { title-body }
  place(top + left, dx: left-offset, dy: texpt,
    block(width: content-width, height: hh, align(left + horizon, fitted)))
}

#let frame-background(self) = {
  sidebar-background(self)
  sidebar-navigation(self)
  frame-heading(self)
}
