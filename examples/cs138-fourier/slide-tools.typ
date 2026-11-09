// Small content helpers; slide geometry comes from the existing SCL theme.
#import "scl-beamer/lib.typ": *
#import "notes.typ": notes
#import "references.typ": references

#let source-line(keys) = text(size: 6.3pt, fill: colors.structure)[
  #keys.map(key => {
    let r = references.at(key)
    if r.url == none { [#r.label] } else { link(r.url, r.label) }
  }).join([ · ])
]

// Pass this as the second block of #slide[content][notes].
// It is excluded from live slides and from student exports.
#let teaching-notes(id) = {
  let n = notes.at(id)
  n.say
  if n.ask != [] { parbreak(); [*Ask.* #n.ask] }
  if n.check != [] { parbreak(); [*Check.* #n.check] }
}

#let prompt(body) = block(text(fill: colors.structure, body))

#let stage(body, size: 13pt) = block(width: 100%, breakable: false)[
  #set text(size: size)
  #body
]

#let sanity(body) = block[
  #text(size: 9pt)[#text(fill: colors.structure)[Check.] #body]
]

#let plot(name, height: 49mm) = align(center,
  image("assets/plots/" + name + ".svg", width: 100%, height: height, fit: "contain"),
)

#let ref-list(keys) = {
  set text(size: 7.7pt)
  for key in keys {
    let r = references.at(key)
    block[
      #text(fill: colors.structure, weight: "bold")[#r.id · #r.author]
      #linebreak()
      #if r.url == none { r.title } else { link(r.url, r.title) }
      #linebreak()
      #text(size: 6.6pt, r.detail)
    ]
  }
}
