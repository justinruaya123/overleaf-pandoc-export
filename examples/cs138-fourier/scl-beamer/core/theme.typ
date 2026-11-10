#import "@preview/touying:0.6.3": *
#import "colors.typ": palette, colors
#import "geometry.typ": geometry, texpt
#import "settings.typ": theme-settings
#import "../components/lists.typ": scl-list-style
#import "../components/sidebar.typ": frame-background
#import "../components/branding.typ": scl-background, scl-logos, scl-affiliation, tref

#let slide(title: auto, subtitle: none, align: auto, config: (:), repeat: auto, setting: body => body, composer: auto, ..bodies) = touying-slide-wrapper(self => {
  if title != auto { self.store.title = title }
  self.store.subtitle = subtitle
  if align != auto { self.store.align = align }
  self = utils.merge-dicts(self, config-page(background: frame-background(self)))
  let new-setting(body) = {
    show: setting
    // Beamer frames have one fixed canvas: large figures may overflow the
    // text area but must not silently create a second logical page.
    let overflow = self.store.overflow
    let canvas = block(width: 100%, breakable: overflow.allow_page_breaks, body)
    let sized = if overflow.mode == "shrink" {
      // Measure a complete overlay and reduce it only when it is too tall.
      // The minimum factor avoids illegibly tiny diagrams.
      layout(size => {
        let natural = measure(canvas)
        let ratio = if natural.height > 0pt {
          calc.min(overflow.content_scale, size.height / natural.height)
        } else { overflow.content_scale }
        let factor = calc.max(overflow.min_scale, ratio)
        scale(x: factor * 100%, y: factor * 100%, reflow: true, canvas)
      })
    } else if overflow.content_scale != 1 {
      scale(x: overflow.content_scale * 100%,
        y: overflow.content_scale * 100%, reflow: true, canvas)
    } else { canvas }
    if self.store.align == auto {
      block(width: 100%, height: 100%, breakable: overflow.allow_page_breaks,
        stack(dir: ttb, spacing: 0pt,
          overflow.top_weight * 1fr, sized, overflow.bottom_weight * 1fr))
    } else {
      std.align(self.store.align, sized)
    }
  }
  touying-slide(self: self, config: config, repeat: repeat, setting: new-setting, composer: composer, ..bodies)
})

#let title-slide(config: (:), multiple-authors: false, ..args) = touying-slide-wrapper(self => {
  let info = self.info + args.named()
  self = utils.merge-dicts(self, config, config-common(freeze-slide-counter: true), config-page(margin: 0pt, header: none, footer: none, background: scl-background(width: self.page.width, height: self.page.height)))
  let body = {
    set text(fill: colors.title)
    set text(top-edge: "baseline", bottom-edge: "baseline")
    set par(leading: 14.4 * texpt, spacing: 0pt)
    context {
      let title-box = block(width: self.page.width - 2 * theme-settings.placement.title_left_mm, {
        set par(leading: 14.4 * texpt, spacing: 0pt)
        text(font: theme-settings.fonts.display, top-edge: "baseline", bottom-edge: "baseline", size: theme-settings.sizes.title_pt, info.title)
      })
      let subtitle-box = block(width: self.page.width - 2 * theme-settings.placement.title_left_mm, {
        set par(leading: 14.4 * texpt, spacing: 0pt)
        text(font: theme-settings.fonts.display, top-edge: "baseline", bottom-edge: "baseline", size: theme-settings.sizes.subtitle_pt, fill: colors.author, info.subtitle)
      })
      let title-extra = measure(title-box).height
      let subtitle-extra = measure(subtitle-box).height
      place(top + left, dx: theme-settings.placement.title_left_mm, dy: theme-settings.placement.title_top_pt, title-box)
      place(top + left, dx: theme-settings.placement.title_left_mm, dy: theme-settings.placement.subtitle_top_pt + title-extra, subtitle-box)
      if info.date != none {
        place(top + left, dx: theme-settings.placement.title_left_mm, dy: if multiple-authors { self.page.height - theme-settings.placement.date_bottom_multi_mm } else { theme-settings.placement.date_top_pt + title-extra + subtitle-extra }, block[
          #set par(leading: 12 * texpt)
          #text(size: theme-settings.sizes.body_pt, fill: colors.date, info.at("event", default: [SCL Presentation]))\
          #text(size: theme-settings.sizes.body_pt, fill: colors.date, utils.display-info-date(self))
        ])
      }
    }
    context {
      let author-box = block(width: self.page.width - 2 * theme-settings.placement.title_left_mm, {
        set par(leading: 12.1 * texpt, spacing: 0pt)
        text(font: theme-settings.fonts.display, top-edge: "baseline", bottom-edge: "baseline", size: theme-settings.sizes.subtitle_pt * 11 / 12, fill: colors.author, info.author)
      })
      let author-extra = measure(author-box).height
      let author-y = if multiple-authors { self.page.height - theme-settings.placement.author_bottom_multi_mm } else { self.page.height - theme-settings.placement.author_bottom_pt - author-extra }
      place(top + left, dx: theme-settings.placement.title_left_mm, dy: author-y, author-box)
      place(top + left, dx: theme-settings.placement.title_left_mm, dy: author-y + author-extra + theme-settings.placement.author_affiliation_gap_pt, block(width: self.page.width - 2 * theme-settings.placement.title_left_mm)[
        #set par(leading: 9 * texpt)
        #text(font: theme-settings.fonts.small, size: theme-settings.sizes.small_pt, fill: colors.institution, info.institution)
        #if info.at("email", default: none) != none [\ #text(size: theme-settings.sizes.small_pt, font: theme-settings.fonts.mono, fill: colors.author, link("mailto:" + info.email, info.email))]
      ])
    }
    place(bottom + right, dx: -theme-settings.placement.logo_right_mm, dy: -theme-settings.placement.logo_bottom_mm, scl-logos())
    args.pos().sum(default: none)
  }
  touying-slide(self: self, body)
})

#let final-slide(config: (:), website: "http://scl.dcs.upd.edu.ph", body) = touying-slide-wrapper(self => {
  self = utils.merge-dicts(self, config, config-common(freeze-slide-counter: true), config-page(margin: 0pt, header: none, footer: none, background: scl-background(width: self.page.width, height: self.page.height, ending: true)))
  touying-slide(self: self, {
    place(top + left, dy: self.page.height * theme-settings.placement.final_caption_top_percent - 0.126pt, block(width: self.page.width, align(center, text(font: theme-settings.fonts.display, size: theme-settings.sizes.title_pt, fill: white, body))))
    place(top + left, dy: self.page.height - theme-settings.placement.final_logos_bottom_mm, block(width: self.page.width, align(center, scl-logos())))
    // Match the reference's centered monospaced URL box and its TeX-space offset.
    place(top + left, dx: -1.6587pt, dy: self.page.height - theme-settings.placement.final_url_bottom_mm - 0.712pt, block(width: self.page.width, align(center, text(size: theme-settings.sizes.footnote_pt, fill: white, font: theme-settings.fonts.mono, link(website, website)))))
  })
})

#let part-slide(title: auto, number: auto, config: (:), body: none) = touying-slide-wrapper(self => {
  self = utils.merge-dicts(self, config, config-page(margin: theme-settings.canvas.margin_mm, header: none, footer: none, background: scl-background(width: self.page.width, height: self.page.height)))
  touying-slide(self: self, align(center + horizon, {
    set text(size: theme-settings.sizes.title_pt, fill: colors.title)
    if number != none { [Part #if number == auto { context numbering("I", counter(heading).get().at(0, default: 1)) } else { numbering("I", number) }]; parbreak() }
    if title == auto { utils.display-current-heading(level: 1) } else { title }
    body
  }))
})

#let scl-theme(
  mode: "standard",
  aspect-ratio: "16-9",
  width: geometry.width, height: geometry.height,
  sidebar-width: geometry.sidebar, sidebar-side: theme-settings.canvas.sidebar_side,
  header-height: geometry.header, margin: geometry.margin,
  align: auto, navigation-depth: theme-settings.canvas.navigation_depth,
  hide-title: false, hide-author: false, hide-institute: false,
  hide-all-subsections: false, hide-other-subsections: false,
  ..args, body,
) = {
  assert(mode in ("standard", "default"), message: "mode must be standard or default")
  assert(sidebar-side in (left, right), message: "sidebar-side must be left or right")
  if aspect-ratio != "16-9" {
    let ratio = aspect-ratio.split("-").map(float)
    assert(ratio.len() == 2 and ratio.all(v => v > 0), message: "aspect-ratio must be a positive ratio such as 16-9 or 4-3")
    height = width * ratio.at(1) / ratio.at(0)
  }
  show: touying-slides.with(
    config-page(width: width, height: height, fill: colors.background,
      margin: (left: margin + if sidebar-side == left { sidebar-width } else { 0pt },
        right: margin + if sidebar-side == right { sidebar-width } else { 0pt },
        top: header-height + theme-settings.canvas.header_gap_mm, bottom: theme-settings.canvas.bottom_gap_mm),
      header: none, footer: none, header-ascent: 0pt, footer-descent: 0pt),
    config-common(slide-fn: slide, new-section-slide-fn: none, show-strong-with-alert: false, zero-margin-header: false, zero-margin-footer: false,
      page-preamble: self => context [#metadata((frame: utils.slide-counter.get().first(), subslide: self.subslide)) <scl-page-info>]),
    config-methods(
      init: (self: none, body) => {
        set text(font: theme-settings.fonts.body, size: theme-settings.sizes.body_pt, fill: colors.body, lang: "en")
        set par(justify: false, leading: theme-settings.spacing.paragraph_leading_pt, spacing: theme-settings.spacing.paragraph_spacing_pt)
        show: scl-list-style
        set math.mat(delim: "[")
        show math.equation: set text(font: theme-settings.fonts.math)
        // LaTeX inline math is kept as one wrap unit, unlike Typst's
        // default relational-math line breaks.
        show math.equation.where(block: false): it => box(it)
        set math.equation(numbering: none)
        show math.equation.where(block: true): set block(above: theme-settings.spacing.equation_above_pt, below: theme-settings.spacing.equation_below_pt)
        // LaTeX tabular has no grid unless the author writes \hline / |.
        // Existing mathematical array adapters specify these values too.
        set table(stroke: none, inset: (x: 0.5em, y: 0.25em))
        show figure.caption: set text(font: theme-settings.fonts.caption, size: theme-settings.sizes.caption_pt)
        show figure.caption: it => [#text(fill: colors.structure)[#it.supplement:] #it.body]
        show footnote.entry: set text(font: theme-settings.fonts.small, size: theme-settings.sizes.footnote_pt)
        show raw: set text(font: theme-settings.fonts.mono, size: theme-settings.sizes.body_pt)
        show bibliography: set text(font: theme-settings.fonts.small, size: theme-settings.sizes.bibliography_pt)
        show link: it => it
        body
      },
      alert: (self: none, body) => text(fill: colors.alert, body),
    ),
    config-colors(primary: colors.structure, primary-dark: palette.dark-blue, neutral-darkest: colors.body, neutral-lightest: white),
    config-info(title: [SCL Presentation], short-title: auto, subtitle: none, author: none, date: none, institution: scl-affiliation),
    config-store(align: align, title: self => utils.display-current-heading(depth: self.slide-level), subtitle: none,
      sidebar-width: sidebar-width, sidebar-side: sidebar-side, header-height: header-height,
      body-margin: margin, rail-width: geometry.rail, navigation-depth: navigation-depth,
      overflow: theme-settings.overflow,
      hide-title: hide-title, hide-author: hide-author, hide-institute: hide-institute,
      hide-all-subsections: hide-all-subsections, hide-other-subsections: hide-other-subsections),
    ..args,
  )
  body
}
