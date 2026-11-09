// Explicit bibliography entries with Beamer's original reference icons.
// For automatically managed citations use native Typst cite / bibliography.
#import "../colors.typ": colors, xcolor-mix
#import "../geometry.typ": texpt
#import "../settings.typ": theme-settings

#let _reference-icon(kind) = {
  assert(kind in ("book", "online", "article"),
    message: "reference kind must be book, online, or article")
  let dimensions = (
    book: (14, 12),
    online: (14, 14),
    article: (11, 14),
  ).at(kind)
  image("../assets/bib-" + kind + ".svg",
    width: dimensions.at(0) * texpt,
    height: dimensions.at(1) * texpt)
}

/// A display entry using a book, online, or article icon.
/// `url` links the title; when no title is supplied, it becomes the label.
#let reference-entry(
  kind: "article",
  author: none,
  title: none,
  details: none,
  url: none,
) = {
  assert(author != none or title != none or details != none or url != none,
    message: "reference-entry needs an author, title, details, or URL")
  assert(url == none or type(url) == str,
    message: "reference-entry url must be a string")
  let entry-title = if url == none { title } else {
    link(url, if title == none { url } else { title })
  }
  let lines = (
    if author != none { text(fill: colors.structure, author) },
    if entry-title != none { text(fill: colors.body, entry-title) },
    if details != none {
      text(fill: xcolor-mix(colors.structure, colors.background, 65%), details)
    },
  ).filter(it => it != none)
  block(width: 100%, breakable: false)[
    #set text(font: theme-settings.fonts.small, size: theme-settings.sizes.bibliography_pt)
    #set par(leading: 2 * texpt, spacing: 0pt)
    #grid(
      columns: (14 * texpt, 1fr),
      column-gutter: 8 * texpt,
      align: (center + top, left + top),
      _reference-icon(kind),
      lines.join(linebreak()),
    )
  ]
}

/// Stack an array of reference-entry contents with consistent spacing.
#let scl-bibliography(entries, spacing: 5 * texpt) = {
  assert(type(entries) == array and entries.all(it => type(it) == content),
    message: "scl-bibliography expects an array of reference-entry contents")
  stack(dir: ttb, spacing: spacing, ..entries)
}
