import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build} from './export-typst.mjs';

const args = process.argv.slice(2);
let directory;
try {
  if (args.length && (args.length !== 2 || args[0] !== '--typst' || !args[1])) {
    throw new Error('Usage: node check-typst-setup.mjs [--typst PATH]');
  }
  // A fresh project forces the compiler and all asset handling to run on every setup.
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'typst setup '));
  fs.writeFileSync(path.join(directory, 'part.typ'), '#let sentence = [Nested imports remain selectable.]\n');
  fs.writeFileSync(path.join(directory, 'pixel.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><path fill="blue" d="M0 0h40v40H0z"/></svg>');
  const source = path.join(directory, 'smoke.typ');
  fs.writeFileSync(source, `#set document(title: "Typst setup check")
#import "part.typ": sentence
= A small lecture
#sentence
Inline $x^2 + y^2$.
$ mat(1, 2; 3, 4) vec(x, y) = vec(5, 6) $
#figure(image("pixel.svg", width: 40pt), caption: [A local vector image.])
#table(columns: 2, [First], [Second], [$1/2$], [$sqrt(2)$])
`);
  const result = build(source, {profile:'native', ...(args.length ? {typst:args[1]} : {})});
  const html = fs.readFileSync(result.output, 'utf8');
  if (result.status !== 'ok' || result.mathCount < 4 || result.images < 1 ||
      !html.includes('Nested imports remain selectable.') || !/<table\b/.test(html) ||
      !/data:image\/svg\+xml/.test(html) || !/<svg\b/.test(html)) {
    throw new Error('Typst setup smoke-test content is incomplete.');
  }
  console.log(`Ready: ${result.compiler}; HTML, nested imports, local SVG images, tables, and SVG math all passed.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (directory) fs.rmSync(directory, {recursive:true, force:true});
}
