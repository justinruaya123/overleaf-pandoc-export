#import "scl-beamer/lib.typ": *
#import "scl-beamer/components/equations.typ": eq-alt, equation-lines
#import "scl-beamer/components/overlays.typ": pauses, mathpause, mathpauses

#show: scl-theme.with(
  config-info(title: [Static lecture fixture], subtitle: [Source-compatible SCL],
    author: [Fixture author], date: [2026], event: [Numerical analysis]),
  config-common(slide-level: 3),
  config-common(handout: true),
)
#title-slide()

= A navigable section

#slide(title: [Cumulative slide], subtitle: [All derivation states],
  setting: body => [Content added by slide setting. #body])[
  Before the pause. #pause After the pause. #pauses(2)
  #scl-block(title: [Readable block])[Semantic block content.]
  #alert-block(title: [Attention])[Alert block content.]
  - First list item.
  - Second list item.

  $ a pause = 1 mathpause $

  #eq-alt(([$x$], [$1 + 1$], [$x$], [$2$]))
  #eq-alt(([$y$],), ([$3$], [$4$]))
  #alternatives([First alternative.], [Second alternative.])
  #reference-entry(url: "https://example.org/reference")

  #table(columns: 2, [Method], [Order], [Euler], [1])

  #cetz.canvas({
    import cetz.draw: *
    line((0, 0), (1, 1))
    content((0.5, 1), [$x$])
  })
  #layout(size => [Layout callback content: $z = 2$.])
  #grid(columns: 2, [$p$], [$q$])
]

#final-slide[Closing words retained.]
