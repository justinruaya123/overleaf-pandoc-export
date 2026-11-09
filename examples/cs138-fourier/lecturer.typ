// Lecturer view of the same lecture. Run build.py after editing slides.typ.
// The slide previews are generated from the actual SCL Beamer PDF pages.
// The full handout map includes optional reading, even though live slides
// omit those frames. Do not substitute the live build/frames.json map.
#import "notes.typ": notes

#let manifest = json(sys.inputs.at("frames", default: "build/handout-frames.json"))
#assert(manifest.schema_version == 1, message: "Run build.py to refresh the frame maps.")
#assert(
  manifest.at("view", default: "live") == "handout",
  message: "Use handout-frames.json for the complete lecturer guide; run build.py.",
)
#let frames = manifest.frames
#let ink = rgb("18364A")
#let accent = rgb("0069A8")
#let muted = rgb("54616E")
#let rule = rgb("CED6DC")

#set page(
  paper: "a4",
  flipped: true,
  margin: (x: 10mm, y: 9mm),
  footer: context grid(
    columns: (1fr, auto),
    text(size: 7pt, fill: muted)[CS138 / Fourier series / Lecturer guide],
    text(size: 7pt, fill: muted)[#counter(page).display() / #frames.len()],
  ),
)
#set text(font: "Latin Modern Sans", size: 9pt, fill: ink)
#set par(leading: 2.1pt, spacing: 3.5pt, justify: false)
#show math.equation: set text(font: "Latin Modern Math")
#set math.equation(numbering: none)
#show math.equation.where(block: true): set block(above: 3pt, below: 3pt)
#set list(indent: 0.9em, body-indent: 0.4em, spacing: 2pt)
#set enum(indent: 0.9em, body-indent: 0.4em, spacing: 2pt)

#let section(title, body) = if body != none and body != [] {
  text(size: 7.6pt, weight: "bold", fill: accent, upper(title))
  v(0.7mm)
  body
  v(2mm)
}

#let note-body(note, handout-only: false) = {
  section("Purpose", note.goal)
  section(if handout-only { "Read / explore" } else { "Say / develop" }, note.say)
  if note.at("states", default: ()).len() > 0 {
    section("Reveal cues", enum(..note.states))
  }
  section("Ask", note.ask)
  section("Check / expected response", note.check)
  section("Transition", note.transition)
  if note.refs.len() > 0 {
    section("References", text(size: 7.5pt, fill: muted, note.refs.join("; ")))
  }
}

#let notes-panel(frame-id, body) = layout(size => {
  let panel = block(width: size.width, breakable: false, body)
  assert(
    measure(panel).height <= 171mm,
    message: "Lecturer notes for '" + frame-id
      + "' exceed one page. Shorten these notes before rebuilding.",
  )
  panel
})

#let preview(path, width) = box(
  width: width,
  stroke: 0.45pt + rule,
  fill: white,
  image(path, width: width),
)

#for (index, frame) in frames.enumerate() {
  if index > 0 { pagebreak() }
  assert(frame.id in notes, message: "Missing notes for frame '" + frame.id + "'.")
  let note = notes.at(frame.id)
  let handout-only = frame.at("handout_only", default: false)
  let next-reading = if index + 1 < frames.len() {
    frames.at(index + 1).at("handout_only", default: false)
  } else { false }
  let current-caption = if handout-only {
    [Current reading: handout-only extension]
  } else {
    [Current slide: final reveal]
  }
  let next-caption = if next-reading {
    [Next in handout: optional reading · 0 min]
  } else if handout-only {
    [Next in handout: opening reveal]
  } else {
    [Next slide: opening reveal]
  }
  if handout-only {
    assert(note.minutes == 0, message: "Optional reading must have 0 live minutes.")
  }
  [#metadata((kind: "lecturer-frame", id: frame.id)) <lecturer-frame>]
  block(height: 14mm, width: 100%)[
    #grid(
      columns: (1fr, auto),
      column-gutter: 5mm,
      align: (left, right),
      text(size: 15.5pt, weight: "bold")[#note.title],
      [
        #text(size: 10pt, weight: "bold")[
          #if handout-only [Optional reading · ]#note.minutes min
        ]
        #linebreak()
        #text(size: 8pt, fill: muted)[Frame #frame.number / #frames.len()]
      ],
    )
  ]
  v(3mm)
  grid(
    columns: (127mm, 1fr),
    column-gutter: 7mm,
    align: (left + top, left + top),
    [
      #text(size: 8pt, weight: "bold", fill: accent)[
        #current-caption
      ]
      #v(1.5mm)
      #preview(frame.final_image, 127mm)
      #v(1mm)
      #text(size: 7.5pt, fill: muted)[
        #if handout-only [Handout only · ]
        #frame.overlay_count #if frame.overlay_count == 1 [reveal] else [reveals]
      ]
      #v(5mm)
      #if frame.next_id != none {
        assert(frame.next_id in notes, message: "Missing notes for next slide.")
        text(size: 8pt, weight: "bold", fill: accent)[
          #next-caption
        ]
        v(1mm)
        text(size: 8pt, fill: muted, notes.at(frame.next_id).title)
        v(1.5mm)
        preview(frame.next_image, 96mm)
      } else {
        text(size: 8pt, weight: "bold", fill: accent)[Lecture complete]
      }
    ],
    notes-panel(frame.id, note-body(note, handout-only: handout-only)),
  )
}
