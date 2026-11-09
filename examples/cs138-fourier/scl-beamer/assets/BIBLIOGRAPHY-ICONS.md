# Bibliography icons

`bib-book.svg`, `bib-online.svg`, and `bib-article.svg` are faithful SVG conversions of the Beamer distribution's `beamericonbook.pdf`, `beamericononline.pdf`, and `beamericonarticle.pdf`. Conversion preserves the original artwork; the Typst component uses the dimensions declared by Beamer's default inner theme (14 × 12, 14 × 14, and 11 × 14 TeX points respectively).

Source project: [Beamer](https://github.com/josephwright/beamer), `base/` directory. The local originals came from the TeX Live Beamer distribution. The book and article drawing sources credit Till Tantau, copyright 2007. Beamer distributes these assets under its GNU General Public License and/or LaTeX Project Public License terms; see the upstream [license](https://github.com/josephwright/beamer/blob/main/LICENSE.md). This bundle distributes the converted assets under the GPL terms alongside its GPL license.

The icons were converted with PyMuPDF's PDF-to-SVG renderer. They are included for runtime use; compiling a Typst presentation requires no LaTeX installation.
