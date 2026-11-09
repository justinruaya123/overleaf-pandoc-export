// Small additions to Touying's own animation markers.
// Import Touying's pause / meanwhile / alternatives from lib.typ as usual.
#import "@preview/touying:0.6.3" as _touying

/// Insert n ordinary Touying pause markers.
/// Example: #pauses(3)
#let pauses(n) = {
  assert(type(n) == int and n >= 0,
    message: "pauses expects a non-negative integer")
  for _ in range(n) {
    _touying.pause
  }
}

/// An additive name for the native Touying pause marker.
/// Both $ a = 1 pause + 2 $ and $ a = 1 mathpause + 2 $ work.
#let mathpause = _touying.pause

/// Insert several native pause markers from math mode.
/// Example: $ a = 1 #mathpauses(2) + 2 $
#let mathpauses(n) = pauses(n)
