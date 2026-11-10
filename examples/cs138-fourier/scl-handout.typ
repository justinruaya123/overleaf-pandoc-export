// Optional lecture annotations; the upstream SCL template stays unchanged.
#import "scl-beamer/lib.typ" as scl
#import "scl-beamer/components/equations.typ" as equations

#let _input-bool(name, fallback) = {
  assert(type(fallback) == bool, message: name + " must be true or false")
  let value = sys.inputs.at(name, default: none)
  if value == none { return fallback }
  assert(value in ("true", "false"), message: "input " + name + " must be true or false")
  value == "true"
}

#let scl-theme(
  handout: false, handout-mode: "students", annotations: true, extensions: true,
  ..args, body,
) = {
  handout = _input-bool("handout", handout)
  annotations = _input-bool("annotations", annotations)
  extensions = _input-bool("extensions", extensions)
  handout-mode = sys.inputs.at("handout-mode", default: handout-mode)
  assert(handout-mode in ("lecturer", "students"),
    message: "handout-mode must be lecturer or students")
  scl.scl-theme(
    scl.config-common(handout: handout),
    ..args,
    // Existing config-common settings work; an explicit CLI input wins.
    if "handout" in sys.inputs { scl.config-common(handout: handout) } else { (:) },
    scl.config-store(handout-mode: handout-mode, annotations: annotations, extensions: extensions),
    body,
  )
}

#let _notes(body) = scl.touying-fn-wrapper((self: none, body) => {
  if self.handout and self.store.handout-mode == "lecturer" and self.store.annotations {
    context [#metadata((frame: scl.utils.slide-counter.get().first(), notes: body)) <scl-slide-notes>]
  }
}, body)

// Without a composer, the second block is notes. With a composer, all
// blocks retain their native meaning; professor notes use notes: [ ... ].
#let slide(notes: auto, ..args) = {
  let bodies = args.pos()
  if notes == auto {
    notes = if args.named().at("composer", default: auto) == auto and bodies.len() == 2 {
      bodies.pop()
    } else { none }
  }
  if notes != none {
    if bodies.len() == 0 { bodies.push([]) }
    let body = bodies.at(0)
    let marker = _notes(notes)
    bodies.at(0) = if type(body) == function {
      self => [#body(self)#marker]
    } else { body + marker }
  }
  scl.slide(..args.named(), ..bodies)
}

#let title-slide(notes: none, ..args) = {
  if notes == none { scl.title-slide(..args) }
  else { scl.title-slide(..args, _notes(notes)) }
}

#let handout(body, enabled: true) = {
  assert(type(enabled) == bool, message: "handout enabled must be true or false")
  if enabled {
    scl.touying-fn-wrapper((self: none, body) => {
      if self.handout and self.store.extensions { body }
    }, body)
  }
}

#let handout-slide(enabled: true, ..args) = {
  assert(type(enabled) == bool, message: "handout-slide enabled must be true or false")
  if enabled {
    scl.touying-slide-wrapper(self => {
      if self.handout and self.store.extensions { (slide(..args).value.fn)(self) }
    })
  }
}

// Reuse the original equation measurements; normal calls go straight to SCL.
#let eq-alt(items, expand: false, auto-pauses: auto, ..args) = {
  assert(type(expand) == bool, message: "eq-alt expand must be true or false")
  if not expand { return scl.eq-alt(items, auto-pauses: auto-pauses, ..args) }
  assert(type(items) == array, message: "eq-alt expects an array of equation entries")
  assert(args.pos().len() <= 1, message: "eq-alt accepts one interleaved array or two arrays")
  assert(auto-pauses == auto or type(auto-pauses) == bool,
    message: "eq-alt auto-pauses must be auto, true, or false")
  let legacy = args.pos().len() == 1
  let (lhs, rhs) = if legacy {
    (items, args.pos().first())
  } else {
    assert(calc.rem(items.len(), 2) == 0, message: "eq-alt expects an even number of entries")
    (
      items.enumerate().filter(pair => calc.rem(pair.first(), 2) == 0).map(pair => pair.last()),
      items.enumerate().filter(pair => calc.rem(pair.first(), 2) == 1).map(pair => pair.last()),
    )
  }
  assert(type(rhs) == array and lhs.len() > 0 and rhs.len() > 0,
    message: "eq-alt needs a nonempty array on each side")
  let width-factor = args.named().at("width-factor", default: 0.9)
  assert(type(width-factor) in (int, float) and width-factor > 0 and width-factor <= 1,
    message: "eq-alt width-factor must be greater than 0 and at most 1")
  let steps = calc.max(lhs.len(), rhs.len())
  block(width: 100%, breakable: false)[
    #for index in range(steps) {
      if index > 0 { scl.pause }
      equations._fit-eq-line(
        lhs.at(calc.min(index, lhs.len() - 1)),
        rhs.at(calc.min(index, rhs.len() - 1)),
        lhs, rhs, ..args.named(),
      )
    }
  ]
  let advance = if auto-pauses == auto { not legacy } else { auto-pauses }
  if not advance and steps > 1 { scl.jump(1 - steps, relative: true) }
}
