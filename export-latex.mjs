#!/usr/bin/env node
/** LaTeX -> Pandoc -> offline HTML. Source files are never rewritten. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {mathjax} from 'mathjax-full/js/mathjax.js';
import {TeX} from 'mathjax-full/js/input/tex.js';
import {SVG} from 'mathjax-full/js/output/svg.js';
import {liteAdaptor} from 'mathjax-full/js/adaptors/liteAdaptor.js';
import {RegisterHTMLHandler} from 'mathjax-full/js/handlers/html.js';
import {AllPackages} from 'mathjax-full/js/input/tex/AllPackages.js';

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const escapeHtml = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slash = value => value.replaceAll('\\', '/');
const MATH_ENVS = 'equation|equation\\*|align|align\\*|alignat|alignat\\*|gather|gather\\*|multline|multline\\*|eqnarray|eqnarray\\*|displaymath|math';

export function stripComments(text) {
  return text.split('\n').map(line => {
    for (let i = 0; i < line.length; i++) {
      if (line[i] !== '%') continue;
      let backslashes = 0;
      for (let j = i - 1; j >= 0 && line[j] === '\\'; j--) backslashes++;
      if (backslashes % 2 === 0) return line.slice(0, i);
    }
    return line;
  }).join('\n');
}

function group(text, start, open = '{', close = '}') {
  while (/\s/.test(text[start] || '') && start < text.length) start++;
  if (text[start] !== open) throw new Error(`Expected ${open} near ${text.slice(start, start + 80)}`);
  let depth = 1;
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === '\\') { i++; continue; }
    if (text[i] === open) depth++;
    if (text[i] === close) {
      depth--;
      if (depth === 0) return {value: text.slice(start + 1, i), end: i + 1};
    }
  }
  throw new Error(`Unclosed ${open} near ${text.slice(start, start + 80)}`);
}

function replaceCommand(text, name, transform) {
  const pattern = new RegExp('\\\\' + name + '(?![A-Za-z@])', 'g');
  let result = '', cursor = 0, match;
  while ((match = pattern.exec(text))) {
    const arg = group(text, pattern.lastIndex);
    result += text.slice(cursor, match.index) + transform(arg.value);
    cursor = arg.end;
    pattern.lastIndex = cursor;
  }
  return result + text.slice(cursor);
}

function envRanges(text, name) {
  const re = new RegExp('\\\\(begin|end)\\{' + name + '\\}', 'g');
  const stack = [], ranges = [];
  for (const m of text.matchAll(re)) {
    if (m[1] === 'begin') stack.push(m.index);
    else {
      if (!stack.length) throw new Error(`Unmatched end{${name}}`);
      ranges.push({start: stack.pop(), end: m.index + m[0].length});
    }
  }
  if (stack.length) throw new Error(`Unclosed begin{${name}}`);
  return ranges.sort((a, b) => a.start - b.start);
}

export function extractRenderBlocks(text) {
  // A remembered coordinate and every drawing which uses it must share a page.
  const centers = envRanges(text, 'center').filter(r => /\\(?:tikz|DoTikzmark|colrow)\b|\\begin\{tikzpicture\}/.test(text.slice(r.start, r.end)));
  const pictures = envRanges(text, 'tikzpicture');
  // Pandoc leaves resizebox opaque. Render the complete box so nested
  // scalebox, array spacing, xcolor mixes and tabular layouts stay intact.
  const boxes = [...text.matchAll(/\\resizebox\b\*?/g)].map(match => {
    const width = group(text, match.index + match[0].length);
    const height = group(text, width.end);
    return {start:match.index, end:group(text, height.end).end};
  });
  const ranges = [...centers, ...pictures, ...boxes].sort((a,b) => a.start - b.start || b.end - a.end)
    .filter((r, i, all) => !all.slice(0,i).some(p => p.start <= r.start && p.end >= r.end));
  const blocks = [];
  let result = '', cursor = 0;
  for (const r of ranges) {
    result += text.slice(cursor, r.start) + `\n\\includegraphics{EXPORTFIGURE${blocks.length}}\n`;
    blocks.push(text.slice(r.start, r.end));
    cursor = r.end;
  }
  return {text: result + text.slice(cursor), blocks};
}

function matrixArrays(text) {
  // Work inside out so a nested ordinary matrix is not closed as an array.
  for (;;) {
    const r = envRanges(text, 'bmatrix').filter(r => text[r.start + String.raw`\begin{bmatrix}`.length] === '[').at(-1);
    if (!r) break;
    const start = r.start + String.raw`\begin{bmatrix}`.length;
    if (text[start] !== '[') continue;
    const spec = group(text, start, '[', ']');
    const tail = r.end - String.raw`\end{bmatrix}`.length;
    text = text.slice(0, r.start) + String.raw`\left[\begin{array}{` + spec.value + '}' +
      text.slice(spec.end, tail) + String.raw`\end{array}\right]` + text.slice(r.end);
  }
  return text;
}

function prepareAlgorithms(text) {
  const algorithms = [];
  // Only the algorithmic dialect is handled here. Unknown commands still reach
  // the raw-LaTeX rejection below rather than being silently discarded.
  for (const range of envRanges(text, 'algorithmic').reverse()) {
    let body = text.slice(range.start + String.raw`\begin{algorithmic}`.length,
      range.end - String.raw`\end{algorithmic}`.length).trim();
    let frequency = 0;
    if (body.startsWith('[')) {
      const option = group(body, 0, '[', ']');
      if (!/^\d+$/.test(option.value)) throw new Error('Unsupported algorithmic numbering option');
      frequency = Number(option.value); body = body.slice(option.end);
    }
    const tokens = [];
    for (let i = 0; i < body.length; i++) {
      if (body[i] === '{') { i = group(body, i).end - 1; continue; }
      if (body[i] !== '\\') continue;
      const command = /^\\(STATE|FOR|IF|RETURN|ENDIF|ENDFOR)\b/.exec(body.slice(i));
      if (command) { tokens.push({name:command[1], start:i, end:i + command[0].length}); i += command[0].length - 1; }
      else i++; // Includes escaped braces and backslashes.
    }
    if (!tokens.length || body.slice(0, tokens[0].start).trim()) throw new Error('Unsupported algorithmic content before first statement');
    const stack = [], lines = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      let content = body.slice(token.end, tokens[i+1]?.start ?? body.length).trim();
      if (token.name.startsWith('END')) {
        if (stack.pop() !== token.name.slice(3)) throw new Error(`algorithmic nesting mismatch at ${token.name}`);
      }
      const depth = stack.length;
      if (token.name === 'FOR' || token.name === 'IF') {
        const condition = group(content, 0);
        content = `\\textbf{${token.name.toLowerCase()}} ${condition.value} \\textbf{${token.name === 'FOR' ? 'do' : 'then'}} ` + content.slice(condition.end);
        stack.push(token.name);
      } else if (token.name === 'RETURN') content = '\\textbf{return} ' + content;
      else if (token.name.startsWith('END')) content = `\\textbf{end ${token.name.slice(3).toLowerCase()}} ` + content;
      content = replaceCommand(content, 'COMMENT', value => `\\{${value}\\}`);
      // algorithmic permits prose between maths (including text/quad commands).
      // Leave mathematical text and spacing commands inside equations intact.
      const prose = value => replaceCommand(value, 'text', inner => inner).replace(/\\quad\b/g, '\u2003');
      let formatted = '', cursor = 0;
      for (const range of mathRanges(content)) {
        formatted += prose(content.slice(cursor, range.start)) + content.slice(range.start, range.end);
        cursor = range.end;
      }
      content = formatted + prose(content.slice(cursor));
      lines.push({depth, content});
    }
    if (stack.length) throw new Error(`algorithmic Unclosed ${stack.at(-1)}`);
    const marker = `EXPORTALGORITHM${algorithms.length}`;
    algorithms.push({marker, frequency, lines});
    const replacement = '\n\\begin{quote}\n\\texttt{' + marker + '}\n\n\\begin{enumerate}\n' +
      lines.map(line => '\\item ' + line.content).join('\n') + '\n\\end{enumerate}\n\\end{quote}\n';
    text = text.slice(0, range.start) + replacement + text.slice(range.end);
  }
  return {text, algorithms};
}

function styleAlgorithms(ast, algorithms) {
  const pending = new Map(algorithms.map(item => [item.marker, item]));
  walk(ast, node => {
    if (node.t !== 'BlockQuote') return;
    const first = node.c[0];
    if (first?.t !== 'Para' || first.c.length !== 1 || first.c[0].t !== 'Code') return;
    const algorithm = pending.get(first.c[0].c[1]);
    if (!algorithm) return;
    const list = node.c[1];
    if (node.c.length !== 2 || list?.t !== 'OrderedList' || list.c[1].length !== algorithm.lines.length) {
      throw new Error('Algorithm structure changed during Pandoc parsing');
    }
    list.c[1] = list.c[1].map((blocks, i) => {
      const {depth} = algorithm.lines[i];
      const number = algorithm.frequency && (i+1) % algorithm.frequency === 0 ? `${i+1}:` : '';
      return [{t:'Div', c:[['', ['algorithm-line'], [['data-depth', String(depth)], ['data-number', number],
        ['style', `padding-left:${depth * 1.5}em`]]], blocks]}];
    });
    node.t = 'Div'; node.c = [['', ['algorithm'], []], [list]];
    pending.delete(algorithm.marker);
  });
  if (pending.size) throw new Error('Algorithm lost during Pandoc parsing');
}

export function normalizeLatex(text) {
  const counts = {systems: 0, matrices: (text.match(/\\begin\{bmatrix\}\[/g) || []).length, overlays: 0};
  text = replaceCommand(text, 'systeme', value => {
    // Split only top-level commas; braces can contain comma-separated indices.
    const rows = []; let level = 0, start = 0;
    for (let i = 0; i < value.length; i++) {
      if (value[i] === '\\') { i++; continue; }
      if (value[i] === '{') level++;
      if (value[i] === '}') level--;
      if (value[i] === ',' && level === 0) { rows.push(value.slice(start, i)); start = i + 1; }
    }
    rows.push(value.slice(start));
    if (rows.some(row => !row.includes('='))) throw new Error('systeme requires equations containing =');
    counts.systems++;
    return '\\[\\left\\{\\begin{aligned}\n' + rows.map(row => row.trim().replace('=', '&=')).join('\\\\\n') + '\n\\end{aligned}\\right.\\]';
  });
  text = matrixArrays(text);
  text = text.replace(/\\(?:onslide|only|uncover|visible|invisible|alt|temporal)(?:[+*])?<[^>]*>/g, command => {
    if (/invisible|alt|temporal/.test(command)) throw new Error(`Unsupported overlay semantics: ${command}`);
    counts.overlays++;
    return '';
  });
  text = text.replace(/\\(?:mathpause|pause)\b(?:\[[^\]]*\])?/g, '');
  // MathJax lacks intertext. Preserve it as prose between unnumbered displays.
  for (const range of envRanges(text, 'align\\*').reverse()) {
    const block = text.slice(range.start, range.end);
    if (!/\\intertext\b/.test(block)) continue;
    const converted = replaceCommand(block, 'intertext', value =>
      `\\end{align*}\n\n${value}\n\n\\begin{align*}`)
      .replace(/\\\\\s*(?=\\end\{align\*\})/g, '');
    text = text.slice(0, range.start) + converted + text.slice(range.end);
  }
  text = text.replace(/\\(?:structure|alert|finalpage)(?![A-Za-z])/g, '\\textbf');
  text = text.replace(/\\pgfimage\b/g, '\\includegraphics');
  return {text, counts};
}

function flattenBeamer(body) {
  let frames = 0;
  body = body.replace(/\\begin\{frame\}/g, '\\EXPORTFRAME');
  const pattern = /\\EXPORTFRAME/g;
  let output = '', cursor = 0, m;
  while ((m = pattern.exec(body))) {
    let end = pattern.lastIndex;
    while (/\s/.test(body[end] || '') && end < body.length) end++;
    if (body[end] === '[') end = group(body, end, '[', ']').end;
    const titles = [];
    for (let n = 0; n < 2; n++) {
      let next = end;
      while (/\s/.test(body[next] || '') && next < body.length) next++;
      if (body[next] !== '{') break;
      const arg = group(body, next); titles.push(arg.value); end = arg.end;
    }
    output += body.slice(cursor, m.index) + '\n\\begin{quote}\n' +
      (titles.length ? `\\subsubsection{${titles.join(' — ')}}\n` : '');
    frames++; cursor = end; pattern.lastIndex = end;
  }
  body = output + body.slice(cursor);
  body = body.replace(/\\end\{frame\}/g, '\n\\end{quote}\n');
  body = replaceCommand(body, 'frametitle', title => `\\subsubsection{${title}}`);
  body = body.replace(/\\begin\{(?:block|exampleblock|alertblock)\}/g, '\\EXPORTBLOCK');
  body = replaceCommand(body, 'EXPORTBLOCK', title => `\n\\paragraph{${title}}\n`);
  body = body.replace(/\\end\{(?:block|exampleblock|alertblock)\}/g, '');
  body = body.replace(/\\(?:begin|end)\{center\}/g, '\n');
  // Unwrap size groups, including the nonstandard small{item ...} idiom.
  const sizes = /\\(?:tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge)\b/;
  for (let size; (size = sizes.exec(body));) {
    let end = size.index + size[0].length;
    while (/\s/.test(body[end] || '') && end < body.length) end++;
    if (body[end] === '{') {
      const arg = group(body, end);
      body = body.slice(0, size.index) + arg.value + body.slice(arg.end);
    } else body = body.slice(0, size.index) + body.slice(end);
  }
  body = body.replace(/\\(?:noindent|maketitle|centering|medskip)\b/g, '');
  body = body.replace(/\\color\{([^{}]+)\}(?=\{)/g, '\\textcolor{$1}');
  body = body.replace(/\\vspace\*?\s*\{[^{}]*\}/g, '');
  body = body.replace(/\\setlength\s*(?:\{\\\w+\}|\\\w+)\s*\{[^{}]*\}/g, '');
  body = body.replace(/\\(?:SCLtitlepagebg|SCLendpagebg|SCLDCSUPlogos)\b/g, '');
  // Keep equation references as maths so MathJax resolves them with the labels.
  let referenced = '', refCursor = 0;
  for (const range of mathRanges(body)) {
    referenced += body.slice(refCursor, range.start).replace(/\\eqref\{([^{}]+)\}/g, '\\(\\eqref{$1}\\)') + body.slice(range.start, range.end);
    refCursor = range.end;
  }
  body = referenced + body.slice(refCursor).replace(/\\eqref\{([^{}]+)\}/g, '\\(\\eqref{$1}\\)');
  return {text: body, frames};
}

function commandDefinitions(preamble) {
  const definitions = [], seen = new Set();
  const pattern = /\\(?:newcommand|renewcommand|providecommand|DeclareMathOperator)\*?/g;
  for (let match; (match = pattern.exec(preamble));) {
    let end = pattern.lastIndex;
    // Skip low-level matrix redefinitions; matrices are normalized to array.
    if (preamble[end] !== '{') continue;
    const name = group(preamble, end); end = name.end;
    while (/\s/.test(preamble[end] || '') && end < preamble.length) end++;
    while (preamble[end] === '[') {
      end = group(preamble, end, '[', ']').end;
      while (/\s/.test(preamble[end] || '') && end < preamble.length) end++;
    }
    const value = group(preamble, end); end = value.end;
    // The lecture repeats several newcommand declarations. Keep the first of
    // those, but retain explicit renewcommand operations in their original order.
    if (!seen.has(name.value) || match[0].startsWith('\\renewcommand')) {
      definitions.push(preamble.slice(match.index, end)); seen.add(name.value);
    }
    pattern.lastIndex = end;
  }
  return definitions.join('\n');
}

function executable(name, override) {
  if (override) return override;
  const candidates = [name];
  if (process.platform === 'win32') {
    if (name === 'pandoc') candidates.unshift(path.join(process.env.ProgramFiles || 'C:/Program Files', 'Pandoc/pandoc.exe'));
    else candidates.push(`C:/tools/TinyTeX/bin/windows/${name}.exe`);
    if (name === 'pdftoppm') candidates.push(path.join(process.env.USERPROFILE || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe'));
  }
  for (const candidate of candidates) {
    const test = spawnSync(candidate, [name === 'pdftoppm' ? '-v' : '--version'], {encoding:'utf8', windowsHide:true});
    if (!test.error && test.status === 0) return candidate;
  }
  throw new Error(`Cannot find ${name}. Install it or pass --${name} PATH.`);
}

function run(command, args, cwd, input) {
  const result = spawnSync(command, args, {cwd, input, encoding:'utf8', windowsHide:true, maxBuffer:128 * 1024 * 1024});
  if (result.error || result.status !== 0) throw new Error(`${command} failed:\n${result.error?.message || ''}\n${result.stdout?.slice(-5000) || ''}\n${result.stderr || ''}`);
  return result;
}

export function renderMath(items) {
  const labels = new Set(), references = new Set();
  for (const item of items) {
    for (const m of item.tex.matchAll(/\\label\{([^{}]+)\}/g)) {
      if (labels.has(m[1])) throw new Error(`Duplicate equation label: ${m[1]}`);
      labels.add(m[1]);
    }
    for (const m of item.tex.matchAll(/\\(?:eqref|ref)\{([^{}]+)\}/g)) references.add(m[1]);
  }
  for (const ref of references) if (!labels.has(ref)) throw new Error(`Unresolved equation reference: ${ref}`);
  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);
  const tex = new TeX({packages: AllPackages.filter(p => !['noerrors', 'noundefined'].includes(p)), tags:'ams',
    macros: {ensuremath: ['#1', 1]}, ignoreDuplicateLabels:true,
    formatError(_jax, error) { throw error; }});
  const svg = new SVG({fontCache:'none'});
  const doc = mathjax.document('', {InputJax:tex, OutputJax:svg});
  const render = item => {
    try {
      const node = doc.convert(item.tex, {display:item.display, em:16, ex:8, containerWidth:1200});
      const html = adaptor.outerHTML(node);
      if (/data-mml-node="merror"|<merror\b/.test(html)) throw new Error('MathJax emitted merror');
      return html;
    } catch (error) { throw new Error(`Math rendering failed: ${error.message}\nTeX: ${item.tex}`, {cause:error}); }
  };
  // Discover labels before rendering references. The second pass reuses them.
  items.forEach(render);
  const resolvedLabels = {...tex.parseOptions.tags.allLabels};
  tex.reset();
  tex.parseOptions.tags.allLabels = resolvedLabels;
  return items.map(render);
}

function mathRanges(text) {
  const env = new RegExp('^\\\\begin\\{(' + MATH_ENVS + ')\\}');
  const ranges = [];
  for (let i = 0; i < text.length; i++) {
    const match = text.slice(i).match(env);
    let closing, start;
    if (match) { closing = `\\end{${match[1]}}`; start = i + match[0].length; }
    else if (text.startsWith('\\[', i) || text.startsWith('\\(', i)) { closing = text[i+1] === '[' ? '\\]' : '\\)'; start = i + 2; }
    else if (text[i] === '$') { closing = text[i+1] === '$' ? '$$' : '$'; start = i + closing.length; }
    else { if (text[i] === '\\') i++; continue; }
    let end = start;
    for (; end < text.length; end++) {
      if (text.startsWith(closing, end)) break;
      // Dollars inside a braced \text{...} do not close the outer maths.
      if (text[end] === '{') { end = group(text, end).end - 1; continue; }
      if (text[end] === '\\') end++;
    }
    if (end >= text.length) throw new Error(`Unclosed math delimiter near ${text.slice(i, i+100)}`);
    ranges.push({start:i, end:end + closing.length}); i = end + closing.length - 1;
  }
  return ranges;
}

function walk(value, callback) {
  if (Array.isArray(value)) value.forEach(v => walk(v, callback));
  else if (value && typeof value === 'object') {
    if (value.t) callback(value);
    Object.values(value).forEach(v => walk(v, callback));
  }
}

function imageData(file) {
  const mime = {'.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp'}[path.extname(file).toLowerCase()];
  if (!mime) throw new Error(`Unsupported image format: ${file}`);
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

const STYLE = `<style>
html{background:#edf0f4;color:#17212c}body{max-width:1100px;margin:auto;padding:2rem;font:17px/1.6 system-ui,sans-serif}
header{padding:2rem}h1,h2,h3,h4{line-height:1.25;color:#183c65}h1{margin-top:2em}h3{font-size:1.35rem}
body>blockquote{background:white;border:1px solid #dce2e9;border-radius:8px;margin:1.5rem 0;padding:1.5rem 2rem;box-shadow:0 2px 8px #00000008}
blockquote{margin:1rem 0;padding:0}img{max-width:100%;height:auto;display:block;margin:1rem auto}table{border-collapse:collapse;margin:1em auto}td,th{padding:.4rem .8rem;border-bottom:1px solid #ddd}
.algorithm{overflow-x:auto;margin:1em 0}.algorithm ol{list-style:none;padding-left:2.5em}.algorithm li{position:relative;margin:.25em 0}.algorithm-line::before{content:attr(data-number);position:absolute;left:-2.5em;width:2em;text-align:right}.algorithm-line p{margin:0}.algorithm .math.inline{white-space:nowrap}
.math.display{display:block;overflow-x:auto;padding:.5em 0}mjx-container{display:inline-block;max-width:100%;text-indent:0;line-height:0}mjx-container[display="true"]{display:block;text-align:center;margin:1em 0}mjx-container svg{overflow:visible;min-width:0}mjx-container svg a{fill:blue;stroke:blue}
@media(max-width:650px){body{padding:.5rem}body>blockquote{padding:1rem}.math.inline{overflow-wrap:anywhere}}@media print{html{background:white}body>blockquote{box-shadow:none;break-inside:avoid}}
</style>`;

export function build(input, options = {}) {
  const source = path.resolve(input);
  if (!fs.statSync(source).isFile()) throw new Error(`Not a file: ${source}`);
  const sourceBytes = fs.readFileSync(source), sourceHash = hash(sourceBytes);
  const output = path.resolve(options.output || path.join(path.dirname(source), 'build', path.basename(source, path.extname(source)) + '.html'));
  if (!/\.html?$/i.test(output)) throw new Error('Output must have an .html or .htm extension');
  if (output.toLowerCase() === source.toLowerCase()) throw new Error('Output must differ from source');
  const work = path.join(path.dirname(output), path.basename(output, path.extname(output)) + '.export');
  fs.mkdirSync(work, {recursive:true});
  const report = {source, output, sourceSha256:sourceHash, status:'building', warnings:[], images:[], mathErrors:[]};
  const reportPath = path.join(work, 'report.json');
  try {
    const pandoc = executable('pandoc', options.pandoc);
    let latex = stripComments(sourceBytes.toString('utf8').replace(/^\uFEFF/, ''));
    if (/\\(?:input|include)\b/.test(latex)) throw new Error('External TeX input/include is not supported yet; supply a flattened .tex file. Images are supported.');
    const split = latex.indexOf(String.raw`\begin{document}`);
    if (split < 0) throw new Error('Expected a complete LaTeX document with begin{document}');
    let preamble = latex.slice(0, split);
    let body = latex.slice(split + String.raw`\begin{document}`.length).replace(/\\end\{document\}[\s\S]*$/, '');
    const defs = commandDefinitions(preamble);
    const extracted = extractRenderBlocks(body);
    body = extracted.text;
    const blockKinds = extracted.blocks.map(block => /\\(?:tikz|DoTikzmark|colrow)\b|\\begin\{tikzpicture\}/.test(block) ? 'tikz' : 'latex-box');
    report.tikzBlocks = blockKinds.filter(kind => kind === 'tikz').length;
    report.latexBoxBlocks = blockKinds.filter(kind => kind === 'latex-box').length;
    let pdflatex, dvisvgm, pdftoppm;
    const converter = () => dvisvgm ||= executable('dvisvgm', options.dvisvgm);
    const pdfToSvg = (pdf, destination) => {
      try {
        run(converter(), ['--pdf', '--no-fonts', '--exact', `--output=${destination}`, pdf], path.dirname(source));
        return destination;
      } catch (error) {
        pdftoppm ||= executable('pdftoppm', options.pdftoppm);
        const stem = destination.replace(/\.svg$/, '');
        run(pdftoppm, ['-f','1','-singlefile','-r','220','-png',pdf,stem], path.dirname(source));
        report.warnings.push(`PDF rendered as 220 dpi PNG: ${path.basename(pdf)}. SVG converter: ${error.message.trim()}`);
        return stem + '.png';
      }
    };
    const libraries = [...preamble.matchAll(/\\usetikzlibrary\s*\{[^{}]*\}/g)].map(m => m[0]).join('\n');
    const extra = options['tikz-preamble'] ? fs.readFileSync(path.resolve(options['tikz-preamble']), 'utf8') : '';
    for (let i = 0; i < extracted.blocks.length; i++) {
      let block = matrixArrays(extracted.blocks[i]).replace(/\\(?:begin|end)\{center\}/g, '');
      // Empty source/comment lines must not become paragraph breaks in maths.
      // Preserve paragraph spacing outside the math delimiters.
      for (const range of mathRanges(block).reverse()) {
        block = block.slice(0, range.start) + block.slice(range.start, range.end)
          .replace(/\r?\n(?:[ \t]*\r?\n)+/g, '\n') + block.slice(range.end);
      }
      const standalone = '\\documentclass[border=6pt]{standalone}\n\\usepackage{amsmath,amssymb,tikz}\n' + defs + '\n' + libraries + '\n' + extra + '\n\\begin{document}\n' + block + '\n\\end{document}\n';
      const key = hash(standalone).slice(0,20), stem = `${blockKinds[i]}-${key}`;
      let svgFile = path.join(work, stem + '.svg');
      if (fs.existsSync(path.join(work, stem + '.png'))) svgFile = path.join(work, stem + '.png');
      if (!fs.existsSync(svgFile)) {
        fs.writeFileSync(path.join(work, stem + '.tex'), standalone);
        pdflatex ||= executable('pdflatex', options.pdflatex);
        for (let pass = 0; pass < 2; pass++) run(pdflatex, ['-no-shell-escape','-interaction=nonstopmode','-halt-on-error', stem + '.tex'], work);
        svgFile = pdfToSvg(path.join(work, stem + '.pdf'), svgFile);
      }
      body = body.replace(`EXPORTFIGURE${i}`, slash(svgFile));
      report.images.push({kind:blockKinds[i], file:svgFile, sha256:hash(fs.readFileSync(svgFile))});
    }
    const prepared = prepareAlgorithms(body);
    report.algorithms = prepared.algorithms.length;
    const normalized = normalizeLatex(prepared.text);
    Object.assign(report, normalized.counts);
    const flattened = flattenBeamer(normalized.text);
    report.frames = flattened.frames;
    // Preserve user macros, title, author and date; discard PDF-only setup.
    const meta = [];
    for (const name of ['title','subtitle','author','date']) {
      const m = new RegExp('\\\\' + name + '(?:\\[[^\\]]*\\])?\\s*\\{').exec(preamble);
      if (m) { const arg = group(preamble, m.index + m[0].length - 1); meta.push(`\\${name}{${arg.value}}`); }
    }
    latex = '\\documentclass{article}\n' + defs + '\n' + meta.join('\n') + '\n\\begin{document}\n' + flattened.text + '\n\\end{document}\n';
    const intermediate = path.join(work, 'normalized.tex');
    fs.writeFileSync(intermediate, latex);
    const parsed = run(pandoc, ['--from=latex+raw_tex+latex_macros','--to=json', intermediate], path.dirname(source));
    report.warnings.push(...parsed.stderr.trim().split('\n').filter(Boolean));
    const ast = JSON.parse(parsed.stdout);
    styleAlgorithms(ast, prepared.algorithms);
    const figureIds = new Set(), linkedIds = new Set();
    walk(ast, node => { if (node.t === 'Link') linkedIds.add(node.c[2][0]); });
    walk(ast, node => {
      if (node.t !== 'Figure' || !node.c[0][0]) return;
      const id = node.c[0][0];
      if (figureIds.has(id)) {
        if (linkedIds.has('#' + id)) throw new Error(`Ambiguous reference to duplicate figure label: ${id}`);
        node.c[0][0] = '';
        report.warnings.push(`Removed duplicate figure label from HTML: ${id} (figure content preserved).`);
      }
      figureIds.add(id);
    });
    const raw = [], maths = [], images = [];
    walk(ast, node => {
      if (['RawInline','RawBlock'].includes(node.t) && ['latex','tex'].includes(node.c[0])) raw.push(node.c[1]);
      if (node.t === 'Math') maths.push(node);
      if (node.t === 'Image') images.push(node);
    });
    if (raw.length) throw new Error(`Unconverted LaTeX would be lost in HTML:\n${raw.join('\n').slice(0,6000)}`);
    const expectedMath = mathRanges(flattened.text).length;
    report.expectedBodyMath = expectedMath;
    report.mathCount = maths.length;
    if (maths.length < expectedMath) throw new Error(`Math loss: source has at least ${expectedMath} expressions but Pandoc kept ${maths.length}`);
    for (const node of images) {
      let reference = node.c[2][0];
      if (/^(https?:|data:)/.test(reference)) throw new Error(`Use a local image for an offline export: ${reference}`);
      let file = path.resolve(path.dirname(source), reference);
      if (!path.extname(file)) file = ['.svg','.png','.jpg','.jpeg','.pdf'].map(ext => file + ext).find(fs.existsSync);
      if (!file || !fs.existsSync(file)) throw new Error(`Missing image: ${reference}`);
      if (path.extname(file).toLowerCase() === '.pdf') {
        let destination = path.join(work, `image-${hash(fs.readFileSync(file)).slice(0,20)}.svg`);
        if (fs.existsSync(destination.replace(/\.svg$/, '.png'))) destination = destination.replace(/\.svg$/, '.png');
        if (!fs.existsSync(destination)) destination = pdfToSvg(file, destination);
        file = destination;
      }
      node.c[2][0] = imageData(file);
      if (!node.c[1].length) node.c[1] = [{t:'Str',c:path.basename(reference)}];
      // TeX dimensions such as linewidth are not valid CSS lengths.
      node.c[0][2] = node.c[0][2].filter(([key,value]) => !(['width','height'].includes(key) && /\\/.test(value)));
      report.images.push({kind:'embedded', source:reference, file, sha256:hash(fs.readFileSync(file))});
    }
    const mathItems = maths.map(node => ({tex:node.c[1], display:node.c[0].t === 'DisplayMath'}));
    fs.writeFileSync(path.join(work, 'math.json'), JSON.stringify(mathItems, null, 2));
    const rendered = renderMath(mathItems);
    maths.forEach((node,i) => {
      const kind = mathItems[i].display ? 'display' : 'inline';
      node.t = 'RawInline';
      node.c = ['html', `<span class="math ${kind}" data-tex="${escapeHtml(mathItems[i].tex)}">${rendered[i]}</span>`];
    });
    const result = run(pandoc, ['--from=json','--to=html5','--standalone','--wrap=none','--metadata=pagetitle:' + path.basename(source, '.tex')], path.dirname(source), JSON.stringify(ast));
    report.warnings.push(...result.stderr.trim().split('\n').filter(Boolean));
    const html = result.stdout.replace('</head>', STYLE + '\n</head>');
    if (/<merror\b|data-mml-node="merror"|<script\b/.test(html)) throw new Error('HTML contains a math error or an unexpected runtime script');
    if (hash(fs.readFileSync(source)) !== sourceHash) throw new Error('Source changed while building; rerun the export');
    fs.writeFileSync(output, html);
    report.status = 'passed'; report.outputSha256 = hash(html);
    report.sourceUnchanged = true;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    return report;
  } catch (error) {
    report.status = 'failed'; report.error = error.message;
    if (/Math rendering failed|equation reference|equation label/.test(error.message)) report.mathErrors.push(error.message);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    error.exportReport = {warnings: report.warnings, reportPath, output};
    throw error;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = process.argv.slice(2), options = {}; let input;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--help' || args[i] === '-h') {
        console.log('Usage: node export-latex.mjs INPUT.tex [--output OUTPUT.html]\nOptions: --pandoc PATH --pdflatex PATH --dvisvgm PATH --pdftoppm PATH --tikz-preamble FILE\nRequires Node.js 18+, npm install, Pandoc, pdflatex and dvisvgm (or Poppler pdftoppm).');
        process.exit(0);
      }
      if (args[i].startsWith('--')) {
        const key = args[i].slice(2);
        if (!['output','pandoc','pdflatex','dvisvgm','pdftoppm','tikz-preamble'].includes(key) || !args[i+1]) throw new Error(`Invalid option: ${args[i]}`);
        options[key] = args[++i];
      } else if (!input) input = args[i];
      else throw new Error(`Unexpected argument: ${args[i]}`);
    }
    if (!input) throw new Error('Supply a .tex file. Run with --help for usage.');
    const report = build(input, options);
    for (const warning of report.warnings) console.error(`Warning: ${warning}`);
    console.log(`Exported: ${report.output}\n${report.frames} frames, ${report.mathCount} maths, ${report.systems} systems, ${report.tikzBlocks} TikZ blocks, ${report.latexBoxBlocks} LaTeX boxes. Source unchanged.`);
  } catch (error) {
    for (const warning of error.exportReport?.warnings || []) console.error(`Warning: ${warning}`);
    console.error(`Export failed: ${error.message}`);
    if (error.exportReport) {
      console.error(`Report: ${error.exportReport.reportPath}`);
      console.error(`No new HTML was published. Any existing file at ${error.exportReport.output} is from an earlier export.`);
    }
    process.exitCode = 1;
  }
}
