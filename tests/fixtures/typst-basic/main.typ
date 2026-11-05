#set document(title: "Typst fixture")
#import "part.typ": sentence
= A small lecture
#sentence
Inline $x^2 + y^2$.
$ mat(1, 2; 3, 4) vec(x, y) = vec(5, 6) $
#figure(image("pixel.svg", width: 40pt), caption: [A local vector image.])
#table(columns: 2, [First], [Second], [$1/2$], [$sqrt(2)$])
#link("https://typst.app")[Typst]
#text(fill: rgb("123456"), weight: 700)[Explicit emphasis]
