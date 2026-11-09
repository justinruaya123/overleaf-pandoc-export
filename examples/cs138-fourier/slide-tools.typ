// Lecture-specific composition; the SCL template itself stays unmodified.
#import "scl-beamer/lib.typ": *
#import "notes.typ": notes
#import "references.typ": references

#let source-line(keys) = text(size: 6.3pt, fill: colors.structure)[
  #keys.map(key => {
    let r = references.at(key)
    if r.url == none { [#r.label] } else { link(r.url, r.label) }
  }).join([ · ])
]

// Fixed body height and top alignment keep surrounding content stationary.
// The native eq-alt helper measures all alternatives and shares their width,
// ascent, descent, and scale. Do not replace it with per-state centered math.
#let frame(id, body, handout-only: false) = {
  let n = notes.at(id)
  slide(title: n.title, align: top)[
    #metadata((
      kind: "lecture-frame", id: id, handout_only: handout-only,
    )) <lecture-frame>
    #block(width: 100%, height: 63mm, breakable: false)[#body]
    #source-line(n.refs)
    #speaker-note[
      *Purpose:* #n.goal

      #n.say

      *Ask:* #n.ask

      *Sanity check:* #n.check

      *Next:* #n.transition
    ]
  ]
}

#let prompt(body) = block(height: 10mm, width: 100%)[
  #text(size: 11pt, fill: colors.structure, body)
]

#let stage(body, size: 13pt, height: 29mm) = block(
  height: height, width: 100%, breakable: false,
)[
  #set text(size: size)
  #v(3mm)
  #body
]

#let sanity(body) = block(width: 100%)[
  #text(size: 9pt)[#text(fill: colors.structure)[Check.] #body]
]

#let plot(name, height: 49mm) = align(center,
  image("assets/plots/" + name + ".svg", width: 100%, height: height, fit: "contain"),
)

#let ref-list(keys) = {
  set text(size: 7.7pt)
  for key in keys {
    let r = references.at(key)
    block(above: 1.2mm, below: 1.2mm)[
      #text(fill: colors.structure, weight: "bold")[#r.id · #r.author]
      #linebreak()
      #if r.url == none { r.title } else { link(r.url, r.title) }
      #linebreak()
      #text(size: 6.6pt, r.detail)
    ]
  }
}
