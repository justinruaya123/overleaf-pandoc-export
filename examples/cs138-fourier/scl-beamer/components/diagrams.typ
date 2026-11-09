// CeTZ 0.4.2 uses native curves and renders with Typst 0.15; the older 0.3.2
// release used by Touying 0.6.1's example relies on Typst's removed path element.
// `cetz` is exported for normal canvases and native drawing commands.
#import "@preview/cetz:0.4.2"
#import "@preview/touying:0.6.3" as _touying

/// A native CeTZ canvas with Touying incremental reveal support.
///
/// #cetz-canvas({
///   import cetz.draw: *
///   rect((0, 0), (3, 2))
///   (pause,)
///   circle((1.5, 1), radius: 0.5)
/// })
///
/// Pass all CeTZ canvas options normally, including length and padding.
/// Hidden draw instructions reserve their bounds to keep diagrams in place.
#let cetz-canvas = _touying.touying-reducer.with(
  reduce: cetz.canvas,
  cover: cetz.draw.hide.with(bounds: true),
)
