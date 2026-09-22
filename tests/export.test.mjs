import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {normalizeLatex, extractRenderBlocks, renderMath, stripComments, build} from '../export-latex.mjs';

test('systeme equations survive as aligned maths', () => {
  const {text, counts} = normalizeLatex(String.raw`\systeme{6x_1-2x_2=10,11.5x_1-3.85x_2=17}`);
  assert.match(text, /\\begin\{aligned\}/);
  assert.match(text, /6x_1-2x_2&=10/);
  assert.match(text, /11\.5x_1-3\.85x_2&=17/);
  assert.equal(counts.systems, 1);
});

test('matrix column separators and nested matrices survive', () => {
  const {text} = normalizeLatex(String.raw`$\begin{bmatrix}[r|r]1&\begin{bmatrix}2\end{bmatrix}\end{bmatrix}$`);
  assert.equal(text, String.raw`$\left[\begin{array}{r|r}1&\begin{bmatrix}2\end{bmatrix}\end{array}\right]$`);
});

test('nested matrices with two column specifications both close correctly', () => {
  const {text} = normalizeLatex(String.raw`$\begin{bmatrix}[r|r]1&\begin{bmatrix}[r]2\end{bmatrix}\end{bmatrix}$`);
  assert.equal(text, String.raw`$\left[\begin{array}{r|r}1&\left[\begin{array}{r}2\end{array}\right]\end{array}\right]$`);
});

test('Beamer wrappers preserve nested content and all overlay steps', () => {
  const {text} = normalizeLatex(String.raw`\onslide<6->\structure{$\Rightarrow [x]^T = [2]^T$} \only<2>{\textbf{Done}}`);
  assert.match(text, /\\textbf\{\$\\Rightarrow/);
  assert.match(text, /\\textbf\{Done\}/);
  assert.doesNotMatch(text, /onslide|structure|only/);
});

test('remember-picture coordinates and their overlay are extracted together', () => {
  const source = String.raw`before\begin{center}$\DoTikzmark{a}1\DoTikzmark{b}$\colrow[red]{a}{b}\end{center}after`;
  const {text, blocks} = extractRenderBlocks(source);
  assert.equal(blocks.length, 1);
  assert.match(blocks[0], /DoTikzmark/);
  assert.match(blocks[0], /colrow/);
  assert.doesNotMatch(text, /DoTikzmark|colrow/);
  assert.ok(text.startsWith('before'));
  assert.ok(text.endsWith('after'));
});

test('comments respect escaped percent and escaped backslash', () => {
  assert.equal(stripComments('a\\%b %gone\nc\\\\%gone\nd'), 'a\\%b \nc\\\\\nd');
});

test('MathJax rejects unknown commands instead of drawing error text', () => {
  assert.throws(() => renderMath([{tex: String.raw`\definitelyUnknown{x}`, display: false}]), /Undefined control sequence/);
  const output = renderMath([{tex: String.raw`\frac{1}{2}`, display: false}]);
  assert.match(output[0], /<svg/);
  assert.doesNotMatch(output[0], /merror/);
});

test('forward equation references resolve, missing references fail', () => {
  const output = renderMath([
    {tex:String.raw`\eqref{later}`,display:false},
    {tex:String.raw`\begin{equation}\label{later}x=1\end{equation}`,display:true},
  ]);
  assert.doesNotMatch(output[0], /data-c="3F"/);
  assert.throws(() => renderMath([{tex:String.raw`\eqref{missing}`,display:false}]), /Unresolved equation reference/);
});

test('parameterized export handles spaces and dollar display maths without changing input', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'latex export test '));
  const input = path.join(directory, 'a document.tex');
  const output = path.join(directory, 'result.html');
  const source = String.raw`\documentclass{article}\begin{document}Inline $x$; display $$x^2$$.\systeme{x+y=3,x-y=1}\end{document}`;
  fs.writeFileSync(input, source);
  const report = build(input,{output});
  assert.equal(report.mathCount,3);
  assert.equal(report.systems,1);
  assert.equal(fs.readFileSync(input,'utf8'),source);
  assert.match(fs.readFileSync(output,'utf8'), /data-tex/);
});

test('equation references already inside maths are not wrapped again', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-refs-'));
  const input = path.join(directory, 'refs.tex');
  fs.writeFileSync(input, String.raw`\documentclass{article}\begin{document}\begin{equation}\label{x}x=1\end{equation}See $\eqref{x}$ and \eqref{x}.\end{document}`);
  const report = build(input);
  assert.equal(report.mathCount, 3);
});

test('an explicit renewcommand takes precedence over an earlier definition', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-macros-'));
  const input = path.join(directory,'macros.tex');
  fs.writeFileSync(input, String.raw`\documentclass{article}\newcommand{\valuex}{1}\renewcommand{\valuex}{2}\begin{document}$\valuex$\end{document}`);
  const report = build(input);
  const maths = JSON.parse(fs.readFileSync(path.join(path.dirname(report.output),'macros.export','math.json'),'utf8'));
  assert.equal(maths[0].tex,'2');
});

test('bad maths and unconverted prose fail without publishing an HTML file', () => {
  for (const [name,body,pattern] of [
    ['bad-math',String.raw`$\notARealCommand{1}$`,/Undefined control sequence/],
    ['missing-prose',String.raw`\unknownWrapper{do not lose me}`,/Unconverted LaTeX/],
  ]) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-negative-'));
    const input = path.join(directory,name+'.tex'), output = path.join(directory,name+'.html');
    const source = String.raw`\documentclass{article}\begin{document}` + body + String.raw`\end{document}`;
    fs.writeFileSync(input,source);
    assert.throws(() => build(input,{output}),pattern);
    assert.equal(fs.existsSync(output),false);
    assert.equal(fs.readFileSync(input,'utf8'),source);
  }
});

test('a different input document compiles and embeds a standalone TikZ picture', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-tikz-'));
  const input = path.join(directory,'diagram.tex');
  const source = String.raw`\documentclass{article}\usepackage{tikz}\begin{document}A vector $x$.\begin{tikzpicture}\draw[red,thick,->] (0,0)--(1,1);\end{tikzpicture}\end{document}`;
  fs.writeFileSync(input,source);
  const report = build(input);
  assert.equal(report.tikzBlocks,1);
  assert.equal(report.mathCount,1);
  assert.equal(report.images.filter(image => image.kind === 'embedded').length,1);
  assert.match(fs.readFileSync(report.output,'utf8'), /src="data:image\/(?:svg\+xml|png);base64,/);
  assert.equal(fs.readFileSync(input,'utf8'),source);
});
