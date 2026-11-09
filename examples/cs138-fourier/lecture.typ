// Main entry point. Rebuild previews with `python build.py` after editing.
// `--input handout=true` selects the lecturer's current/next/notes layout.
// Default live slides omit curious-student extensions. Student handouts
// include them; `--input show-extensions=true` previews all reveal states.
#if sys.inputs.at("handout", default: "false") == "true" {
  include "lecturer.typ"
} else {
  include "slides.typ"
}
