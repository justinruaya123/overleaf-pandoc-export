// Content metadata and figures; all visual components use the SCL template.
#import "scl-beamer/lib.typ": *
#import "notes.typ": notes
#import "references.typ": references

#let source-line(keys) = block(text(size: 6.3pt, fill: colors.structure)[
  #keys.map(key => {
    let r = references.at(key)
    if r.url == none { [#r.label] } else { link(r.url, r.label) }
  }).join([ · ])
])

// Pass this as the second block of #slide[content][notes].
// It is excluded from live slides and from student exports.
#let teaching-notes(id) = {
  let n = notes.at(id)
  n.say
  if n.ask != [] { parbreak(); [*Ask.* #n.ask] }
  if n.check != [] { parbreak(); [*Check.* #n.check] }
}

#let plot(name, height: 49mm) = align(center,
  image("assets/plots/" + name + ".svg", width: 100%, height: height, fit: "contain"),
)

#let ref-list(keys) = scl-bibliography(
  keys.map(key => {
    let r = references.at(key)
    reference-entry(
      kind: if key in ("H43", "H62", "T111", "T112", "T113", "T132", "H1822") {
        "book"
      } else if key in ("HIST37", "F14", "C04", "SB98") {
        "article"
      } else { "online" },
      author: r.author,
      title: r.title,
      details: r.label,
      url: r.url,
    )
  }),
)
