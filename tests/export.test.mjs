import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
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
  const {text} = normalizeLatex(String.raw`\onslide<6->\structure{$\Rightarrow [x]^T = [2]^T\mathpause = y$} \only<2>{\textbf{Done}}`);
  assert.match(text, /\\textbf\{\$\\Rightarrow/);
  assert.match(text, /\\textbf\{Done\}/);
  assert.doesNotMatch(text, /onslide|structure|only|mathpause/);
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

test('resized layouts retain nested scale boxes and TikZ in one render block', () => {
  const equation = String.raw`\resizebox{0.99\textwidth}{!}{$Q=\scalebox{1.18}{$\begin{bmatrix}1\end{bmatrix}$}$}`;
  const picture = String.raw`\begin{center}\resizebox{0.95\textwidth}{!}{\begin{tikzpicture}\draw (0,0)--(1,1);\end{tikzpicture}}\end{center}`;
  const {text, blocks} = extractRenderBlocks(`Before ${equation} between ${picture} after.`);
  assert.deepEqual(blocks, [equation, picture]);
  assert.doesNotMatch(text, /resizebox|scalebox|tikzpicture/);
  assert.match(text, /Before[\s\S]*between[\s\S]*after\./);
  assert.equal((text.match(/\\includegraphics/g) || []).length, 2);
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

test('prose spacing survives Pandoc without changing equation spacing or source bytes', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-prose-spacing-'));
  const input = path.join(directory, 'spacing.tex');
  const source = String.raw`\documentclass{beamer}\begin{document}
\begin{frame}{Spacing}
\begin{itemize}
\item Before\bigskip After\quad next.
\end{itemize}
\bigskip
\begin{block}{More Accurate}
Inline $a\quad b$ and display \[c\qquad d\].
\end{block}
\end{frame}\end{document}`;
  fs.writeFileSync(input, source);
  const report = build(input);
  const html = fs.readFileSync(report.output, 'utf8');
  const maths = JSON.parse(fs.readFileSync(path.join(directory, 'build', 'spacing.export', 'math.json'), 'utf8'));
  assert.equal(report.frames, 1);
  assert.match(html, /Before<span class="latex-bigskip"[^>]*><\/span>After\u2003next\./);
  assert.match(html, /<div class="latex-bigskip"[^>]*><\/div>\s*<h4[^>]*>More Accurate<\/h4>/);
  assert.deepEqual(maths, [
    {tex: String.raw`a\quad b`, display: false},
    {tex: String.raw`c\qquad d`, display: true},
  ]);
  assert.equal(fs.readFileSync(input, 'utf8'), source);
});

test('wide inline equations remain scrollable within a mobile page', {skip: !process.env.BROWSER_EXECUTABLE}, async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-mobile-math-'));
  const input = path.join(directory, 'wide.tex');
  fs.writeFileSync(input, String.raw`\documentclass{beamer}\begin{document}
\begin{frame}{Second Derivative}\begin{itemize}\item Thus
$\implies\displaystyle f''(x)\approx p_2''(X=x)=\frac{f(x)-2f(x+h)+f(x+2h)}{h^2}+\mathcal{O}(h^{1})$.
\end{itemize}\end{frame}\end{document}`);
  const report = build(input);
  const {chromium} = await import('playwright');
  const browser = await chromium.launch({headless:true, executablePath:process.env.BROWSER_EXECUTABLE});
  try {
    const page = await browser.newPage({viewport:{width:390, height:844}});
    await page.goto(pathToFileURL(report.output).href);
    const result = await page.evaluate(() => {
      const math = document.querySelector('.math.inline');
      math.scrollLeft = math.scrollWidth;
      const frame = math.getBoundingClientRect(), svg = math.querySelector('svg').getBoundingClientRect();
      return {
        pageOverflows:document.documentElement.scrollWidth > innerWidth + 1,
        scrollLeft:math.scrollLeft,
        endVisible:svg.right <= frame.right + 1,
        heightVisible:svg.top >= frame.top - 1 && svg.bottom <= frame.bottom + 1,
      };
    });
    assert.equal(result.pageOverflows, false, 'inline maths must not widen the page');
    assert.ok(result.scrollLeft > 0, 'wide maths must remain horizontally scrollable');
    assert.equal(result.endVisible, true, 'the end of the equation must be reachable');
    assert.equal(result.heightVisible, true, 'the equation must not be vertically clipped');
  } finally {
    await browser.close();
  }
});

test('array horizontal and vertical rules have painted strokes in the browser', {skip: !process.env.BROWSER_EXECUTABLE}, async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-array-rules-'));
  const input = path.join(directory, 'array.tex');
  fs.writeFileSync(input, String.raw`\documentclass{article}\begin{document}
\[\begin{array}{c|cc}
\text{offset} & f[\cdot] & f[\cdot,\cdot] \\ \hline
0 & f_0 & \\
h & f_h & \frac{f_h-f_0}{h}
\end{array}\]
\end{document}`);
  const report = build(input);
  const {chromium} = await import('playwright');
  const browser = await chromium.launch({headless:true, executablePath:process.env.BROWSER_EXECUTABLE});
  try {
    const page = await browser.newPage({viewport:{width:800, height:600}, javaScriptEnabled:false});
    await page.goto(pathToFileURL(report.output).href);
    const rules = await page.evaluate(() => [...document.querySelectorAll('svg line[data-line]')].map(line => {
      const style = getComputedStyle(line);
      const midpoint = new DOMPoint((line.x1.baseVal.value + line.x2.baseVal.value) / 2,
        (line.y1.baseVal.value + line.y2.baseVal.value) / 2);
      return {axis:line.dataset.line, stroke:style.stroke, width:parseFloat(style.strokeWidth),
        opacity:Number(style.opacity) * Number(style.strokeOpacity), painted:line.isPointInStroke(midpoint)};
    }));
    assert.deepEqual(rules.map(rule => rule.axis).sort(), ['h', 'v']);
    for (const rule of rules) {
      assert.ok(rule.width > 0, `${rule.axis} rule must have a nonzero computed stroke width`);
      assert.notEqual(rule.stroke, 'none');
      assert.ok(rule.opacity > 0, `${rule.axis} rule must be opaque`);
      assert.equal(rule.painted, true, `${rule.axis} rule midpoint must lie in a painted stroke`);
    }
  } finally {
    await browser.close();
  }
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

test('resized equations and tables export as embedded figures without losing surrounding maths', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-resize-'));
  const input = path.join(directory, 'scaled.tex');
  const source = String.raw`\documentclass{article}\begin{document}
Before $x$.
\resizebox{0.99\textwidth}{!}{$
\renewcommand{\arraystretch}{1.35}

\begin{array}{@{}c@{\mkern1mu}c@{}}
\textcolor{yellow!70!black}{q_1} & \scalebox{1.18}{$\begin{bmatrix}1\\2\end{bmatrix}$}
\end{array}
$}
\resizebox{0.98\textwidth}{!}{
\renewcommand{\arraystretch}{1.35}
\begin{tabular}{@{}l@{\qquad}l|l@{}}
\multicolumn{2}{c|}{$Q$} & $R$ \\ \hline
$\displaystyle q_1=\frac13\begin{bmatrix}2\\-2\\1\end{bmatrix}$ & & $r_{11}=3$
\end{tabular}}
After $y$.\end{document}`;
  fs.writeFileSync(input, source);
  const report = build(input);
  const html = fs.readFileSync(report.output, 'utf8');
  assert.equal(report.mathCount, 2);
  assert.equal(report.tikzBlocks, 0);
  assert.equal(report.latexBoxBlocks, 2);
  assert.equal(report.images.filter(image => image.kind === 'embedded').length, 2);
  assert.equal((html.match(/src="data:image\/(?:svg\+xml|png);base64,/g) || []).length, 2);
  assert.match(html, /Before/);
  assert.match(html, /After/);
  assert.equal(fs.readFileSync(input, 'utf8'), source);
});

test('algorithmic exports numbered nested steps, comments and multiline return maths', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-algorithm-'));
  const input = path.join(directory, 'algorithm.tex');
  const source = String.raw`\documentclass{article}\begin{document}
\begin{algorithmic}[1]
\STATE Given $A$
\FOR{$k=0,1$}
\STATE Compute $R=Q^\top A$ \quad \COMMENT{Same loop with $Q$}
\IF{$\text{subdiag($A$)}<1$\text{ or }$k=1$}
\RETURN $V=\begin{bmatrix}
v_1 & v_2
\end{bmatrix}$
\ENDIF
\ENDFOR
\end{algorithmic}\medskip After.\end{document}`;
  fs.writeFileSync(input, source);
  const report = build(input);
  const html = fs.readFileSync(report.output, 'utf8');
  assert.equal(report.algorithms, 1);
  assert.equal(report.mathCount, 7);
  assert.equal((html.match(/class="algorithm-line"/g) || []).length, 7);
  assert.deepEqual([...html.matchAll(/data-depth="(\d+)"/g)].map(m => +m[1]), [0,0,1,1,2,1,0]);
  assert.match(html, /<strong>for<\/strong>/);
  assert.match(html, /<strong>end if<\/strong>/);
  assert.match(html, /Same loop with/);
  assert.match(html, / or /);
  assert.match(html, /data-tex="V=\\begin\{bmatrix\}/);
  assert.match(html, /After\./);
  assert.equal(fs.readFileSync(input, 'utf8'), source);
});

test('malformed algorithm nesting fails instead of changing control flow', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-algorithm-invalid-'));
  const input = path.join(directory, 'invalid.tex');
  fs.writeFileSync(input, String.raw`\documentclass{article}\begin{document}
\begin{algorithmic}[1]\FOR{$k=1$}\STATE Work\ENDIF\end{algorithmic}
\end{document}`);
  assert.throws(() => build(input), /algorithmic.*(?:mismatch|Unclosed)/i);
});

test('intertext retains explanatory prose and nested maths between aligned equations', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-intertext-'));
  const input = path.join(directory, 'intertext.tex');
  fs.writeFileSync(input, String.raw`\documentclass{article}\begin{document}
\begin{align*}a&=b\\\intertext{Since $x>0$, continue.}c&=d\end{align*}
\end{document}`);
  const report = build(input);
  const html = fs.readFileSync(report.output, 'utf8');
  assert.equal(report.mathCount, 3);
  assert.match(html, /Since/);
  assert.match(html, /continue\./);
  assert.match(html, /data-tex="x&gt;0"/);
});

test('repeated unreferenced figure labels retain every figure without duplicate HTML ids', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-figure-labels-'));
  const input = path.join(directory, 'figures.tex');
  fs.writeFileSync(path.join(directory, 'dot.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><circle cx="5" cy="5" r="4"/></svg>');
  fs.writeFileSync(input, String.raw`\documentclass{article}\begin{document}
\begin{figure}\includegraphics{dot.svg}\caption{First}\label{placeholder}\end{figure}
\begin{figure}\includegraphics{dot.svg}\caption{Second}\label{placeholder}\end{figure}
\end{document}`);
  const report = build(input);
  const html = fs.readFileSync(report.output, 'utf8');
  assert.equal((html.match(/id="placeholder"/g) || []).length, 1);
  assert.equal((html.match(/<figure\b/g) || []).length, 2);
  assert.match(html, /First/);
  assert.match(html, /Second/);
  assert.ok(report.warnings.some(warning => /duplicate figure label/i.test(warning)));
});
