// Static HTML adapter for the SCL Sidebar/Touying teaching theme.
// Theme API and equation helpers derived from the SCL Sidebar theme.
// Original theme: John Justine Villar. SPDX-License-Identifier: GPL-3.0-or-later
// This module is installed only in an isolated copy of the source project.
#import "/scl-beamer/colors.typ": *
#import "/scl-beamer/geometry.typ": *
#import "/scl-beamer/settings.typ": theme-settings
#import "/scl-beamer/components/tikz-cetz.typ": scl-tikz-smooth, scl-pgf-axis, scl-tikz-marks
#import "cetz-html.typ" as cetz

#let _info = state("scl-html-info", (:))
#let _handout = state("scl-html-handout", (
  enabled: false, audience: "students", annotations: true, extensions: true,
))
#let config-info(..options) = (kind: "info", values: options.named())
#let config-common(..options) = (kind: "common", values: options.named())

#let _input-bool(key, fallback) = {
  assert(type(fallback) == bool, message: key + " must be true or false")
  let value = sys.inputs.at(key, default: repr(fallback))
  assert(value in ("true", "false"), message: key + " must be true or false")
  value == "true"
}

// Pauses are content, because the source also places them directly in math.
#let pause = []
#let mathpause = []
#let pauses(n) = {
  assert(type(n) == int and n >= 0,
    message: "pauses expects a nonnegative integer")
  []
}
#let mathpauses = pauses
#let equation-lines(body, trailing-row: false) = body

#let _element(tag, body, classes: none) = context {
  if target() == "html" {
    let attrs = if classes == none { (:) } else { (class: classes) }
    html.elem(tag, attrs: attrs, body)
  } else { body }
}

#let scl-theme(mode: "standard", navigation-depth: 2, handout: false,
  handout-mode: "students", annotations: true, extensions: true, ..arguments) = {
  let positional = arguments.pos()
  assert(positional.len() > 0, message: "scl-theme needs a document body")
  let body = positional.last()
  let info = (:)
  for config in positional.slice(0, positional.len() - 1) {
    if type(config) == dictionary and config.at("kind", default: none) == "info" {
      info += config.values
    } else if type(config) == dictionary and config.at("kind", default: none) == "common" {
      handout = config.values.at("handout", default: handout)
    }
  }
  // Keep the bundled source font available for math and framed diagrams.
  set text(font: theme-settings.fonts.body)
  show math.equation: set text(font: theme-settings.fonts.math)
  _info.update(info)
  let audience = sys.inputs.at("handout-mode", default: handout-mode)
  assert(audience in ("lecturer", "students"),
    message: "handout-mode must be lecturer or students")
  let settings = (
    enabled: _input-bool("handout", handout), audience: audience,
    annotations: _input-bool("annotations", annotations),
    extensions: _input-bool("extensions", extensions),
  )
  _handout.update(settings)
  // Grid and layout callbacks need a fixed layout region, unlike flowing prose.
  show grid: it => context {
    if target() == "html" {
      html.elem("div", attrs: (class: "typst-diagram"),
        html.frame(block(width: 720pt, it)))
    } else { it }
  }
  if settings.enabled {
    html.elem("main", attrs: (
      class: "handout-source", "data-handout-mode": audience,
      "data-annotations": repr(settings.annotations),
      "data-extensions": repr(settings.extensions),
    ), body)
  } else { body }
}
#let scl-beamer = scl-theme

// layout is a callback function rather than a selectable element. Export a
// source-compatible wrapper for the explicit layout call in the lecture.
#let layout(callback) = context {
  if target() == "html" {
    html.elem("div", attrs: (class: "typst-diagram"),
      html.frame(block(width: 720pt, std.layout(callback))))
  } else { std.layout(callback) }
}

#let _slide-notes(notes) = context {
  let settings = _handout.get()
  if settings.enabled and settings.audience == "lecturer" and settings.annotations and notes != none {
    _element("aside", classes: "lecturer-notes", notes)
  }
}

#let _slide(title: none, subtitle: none, align: auto, config: (:),
  repeat: auto, setting: body => body, composer: auto, notes: auto,
  annotated: false, ..arguments) = context {
  assert(arguments.named().len() == 0, message: "Unsupported HTML slide option")
  assert(composer == auto or type(composer) in (array, int),
    message: "Custom slide composer functions need an HTML adapter")
  let bodies = arguments.pos()
  let notes = notes
  if annotated and notes == auto and composer == auto and bodies.len() == 2 {
    notes = bodies.pop()
  }
  if notes == auto { notes = none }
  // Columns become consecutive blocks in the reading document. Every
  // authored body stays public unless the optional notes helper selected it.
  let body = bodies.map(body => _element("div", body)).sum(default: [])
  _element("section", classes: "slide", [
    #if title != none { _element("h2", classes: "slide-title", title) }
    #if subtitle != none { _element("p", classes: "slide-subtitle", subtitle) }
    #setting(body)
    #_slide-notes(notes)
  ])
}
#let slide = _slide
#let slide-with-notes = _slide.with(annotated: true)

#let handout(body, enabled: true) = context {
  assert(type(enabled) == bool, message: "handout enabled must be true or false")
  let settings = _handout.get()
  if enabled and settings.enabled and settings.extensions { body }
}

#let handout-slide(enabled: true, ..arguments) = context {
  assert(type(enabled) == bool, message: "handout-slide enabled must be true or false")
  let settings = _handout.get()
  if enabled and settings.enabled and settings.extensions { slide-with-notes(..arguments) }
}

#let title-slide(notes: none, ..options) = context {
  let info = _info.get() + options.named()
  let title = info.at("title", default: [])
  _element("section", classes: "slide title-slide", [
    #_element("h1", title)
    #for key in ("subtitle", "author", "event", "date", "institution", "email") {
      let value = info.at(key, default: none)
      if value != none {
        _element("p", classes: "title-" + key, value)
      }
    }
    #options.pos().sum(default: [])
    #_slide-notes(notes)
  ])
}

#let final-slide(body, ..options) = {
  _element("section", classes: "slide final-slide", body)
}

#let alert(body) = text(fill: colors.alert, body)
#let structure(body) = text(fill: colors.structure, body)
#let hover(body) = body
#let scl-block(title: none, kind: "normal", width: 100%, radius: 0pt,
  title-color: auto, full-width: false, body) = {
  _element("aside", classes: "scl-block " + kind, [
    #if title != none { _element("div", classes: "scl-block-title", title) }
    #body
  ])
}
#let alert-block(title: none, full-width: false, body) = {
  scl-block(title: title, kind: "alert", full-width: full-width, body)
}
#let example-block(title: none, full-width: false, body) = {
  scl-block(title: title, kind: "example", full-width: full-width, body)
}
#let hover-block(title: none, body) = scl-block(title: title, body)

// Retain every alternative in source order instead of choosing one overlay.
#let alternatives(..options) = {
  for item in options.pos() { _element("div", classes: "overlay-step", item) }
}
#let only(..options) = options.pos().last()
#let uncover = only

#let _math-content(item) = {
  if type(item) != content { return item }
  if item.func() == math.equation { return item.body }
  if item.has("children") {
    return item.children.map(_math-content).sum(default: [])
  }
  item
}

#let eq-alt(items, symbol: $=$, ali: center, width-factor: 0.9,
  auto-pauses: auto, gutter: 0.6em, expand: false, ..legacy) = {
  assert(type(items) == array, message: "eq-alt expects an array of equation entries")
  assert(legacy.named().len() == 0 and legacy.pos().len() <= 1,
    message: "eq-alt accepts one interleaved array or two arrays: lhs, rhs")
  assert(type(width-factor) in (int, float) and width-factor > 0 and width-factor <= 1,
    message: "eq-alt width-factor must be greater than 0 and at most 1")
  assert(auto-pauses == auto or type(auto-pauses) == bool,
    message: "eq-alt auto-pauses must be auto, true, or false")
  assert(type(expand) == bool, message: "eq-alt expand must be true or false")
  let (lhs, rhs) = if legacy.pos().len() == 1 {
    let rhs = legacy.pos().first()
    assert(type(rhs) == array, message: "eq-alt expects both legacy arguments to be arrays")
    (items, rhs)
  } else {
    assert(calc.rem(items.len(), 2) == 0,
      message: "eq-alt expects an even number of entries: LHS, RHS, ...")
    (
      items.enumerate().filter(pair => calc.rem(pair.first(), 2) == 0).map(pair => pair.last()),
      items.enumerate().filter(pair => calc.rem(pair.first(), 2) == 1).map(pair => pair.last()),
    )
  }
  assert(lhs.len() > 0 and rhs.len() > 0,
    message: "eq-alt needs at least one entry on each side")
  for i in range(calc.max(lhs.len(), rhs.len())) {
    let left = _math-content(lhs.at(calc.min(i, lhs.len() - 1)))
    let right = _math-content(rhs.at(calc.min(i, rhs.len() - 1)))
    math.equation(block: true, numbering: none,
      left + _math-content(symbol) + right)
  }
}

#let cetz-canvas = cetz.canvas

#let reference-entry(kind: "article", author: none, title: none,
  details: none, url: none) = {
  assert(kind in ("book", "online", "article"), message: "Unsupported reference kind")
  assert(author != none or title != none or details != none or url != none,
    message: "reference-entry needs an author, title, details, or URL")
  assert(url == none or type(url) == str, message: "reference-entry URL must be a string")
  _element("div", classes: "reference-entry", [
    #if author != none { _element("p", author) }
    #if title != none or url != none {
      _element("p", if url == none { title } else {
        link(url, if title == none { url } else { title })
      })
    }
    #if details != none { _element("p", details) }
  ])
}
#let scl-bibliography(entries, spacing: 5 * texpt) = {
  assert(type(entries) == array, message: "scl-bibliography expects an array")
  _element("section", classes: "bibliography", entries.sum(default: []))
}
