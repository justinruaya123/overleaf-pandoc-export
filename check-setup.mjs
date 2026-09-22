import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from './export-latex.mjs';

const directory = fileURLToPath(new URL('.setup-check/', import.meta.url));
fs.mkdirSync(directory, {recursive:true});
const source = path.join(directory,'smoke.tex');
fs.writeFileSync(source, String.raw`\documentclass{article}
\usepackage{tikz}
\begin{document}
Inline $x^2$ and a system: \systeme{x+y=3,x-y=1}
\begin{tikzpicture}\draw[red,thick,->] (0,0)--(1,1);\end{tikzpicture}
\end{document}
`);
try {
  // A fresh output directory forces the external tools to run on every setup.
  const runDirectory = fs.mkdtempSync(path.join(directory,'run-'));
  const result = build(source, {output:path.join(runDirectory,'smoke.html')});
  if (result.mathCount !== 2 || result.systems !== 1 || result.tikzBlocks !== 1) throw new Error('Setup smoke-test content is incomplete');
  const figure = result.images.find(image => image.kind === 'tikz');
  console.log(`Ready: Pandoc, LaTeX/TikZ, ${path.extname(figure.file).slice(1).toUpperCase()} figure conversion, and SVG math all passed.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
