import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {build} from '../export-typst.mjs';

const fixtures = fileURLToPath(new URL('fixtures/typst-basic/', import.meta.url));
const compiler = process.env.TYPST || 'typst';
const available = spawnSync(compiler, ['--version'], {encoding:'utf8'}).status === 0;
const integration = {skip: !available && 'Install Typst or set TYPST to run compiler integration tests'};

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'typst export '));
  fs.cpSync(fixtures, directory, {recursive:true});
  return directory;
}

test('Typst exports imports, prose, SVG math, a table and an offline local image', integration, () => {
  const directory = fixture();
  const input = path.join(directory, 'main.typ');
  const before = fs.readFileSync(input);
  const report = build(input, {typst:compiler, output:path.join(directory, 'output folder', 'lecture.html')});
  const html = fs.readFileSync(report.output, 'utf8');
  assert.equal(report.status, 'ok');
  assert.equal(report.mathCount, 4);
  assert.match(html, /Nested imports remain selectable/);
  assert.match(html, /<table\b/);
  assert.match(html, /style="color:#123456;font-weight:700"[^>]*>Explicit emphasis/);
  assert.match(html, /<svg\b/);
  assert.match(html, /<img[^>]+src="data:image\/svg\+xml;base64,/);
  assert.doesNotMatch(html, /<script\b|<link[^>]+stylesheet|src="https?:/);
  assert.deepEqual(fs.readFileSync(input), before);
  assert.match(html, /href="https:\/\/typst.app/);
});

test('a missing image fails without replacing an earlier successful HTML', integration, () => {
  const directory = fixture();
  const input = path.join(directory, 'main.typ');
  const output = path.join(directory, 'result.html');
  build(input, {typst:compiler, output});
  const before = fs.readFileSync(output);
  fs.unlinkSync(path.join(directory, 'pixel.svg'));
  assert.throws(() => build(input, {typst:compiler, output}), /pixel\.svg|file not found/);
  assert.deepEqual(fs.readFileSync(output), before);
  const report = JSON.parse(fs.readFileSync(path.join(directory, 'result.export', 'report.json')));
  assert.equal(report.status, 'failed');
});

test('an explicit project root resolves imports above a nested entry point', integration, () => {
  const directory = fixture();
  const subdirectory = path.join(directory, 'lectures');
  fs.mkdirSync(subdirectory);
  const input = path.join(subdirectory, 'nested.typ');
  fs.writeFileSync(input, '#import "../part.typ": sentence\n#sentence');
  const report = build(input, {typst:compiler, root:directory});
  assert.match(fs.readFileSync(report.output, 'utf8'), /Nested imports remain selectable/);
});

test('invalid compiler path reports an actionable error and preserves source', () => {
  const directory = fixture();
  const input = path.join(directory, 'main.typ');
  const before = fs.readFileSync(input);
  assert.throws(() => build(input, {typst:path.join(directory, 'missing-compiler')}), /Typst.*(found|start|executable)|ENOENT/i);
  assert.deepEqual(fs.readFileSync(input), before);
});

test('an output cannot overwrite the input or another project source', () => {
  const directory = fixture();
  const input = path.join(directory, 'main.typ');
  const before = fs.readFileSync(input);
  assert.throws(() => build(input, {output:input}), /\.html|overwrite|source/i);
  assert.deepEqual(fs.readFileSync(input), before);
});

test('a symlink cannot pull an external file into the staged project', {skip:process.platform === 'win32'}, () => {
  const directory = fixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'typst outside '));
  fs.writeFileSync(path.join(outside, 'private.typ'), 'outside');
  fs.symlinkSync(path.join(outside, 'private.typ'), path.join(directory, 'external.typ'));
  assert.throws(() => build(path.join(directory, 'main.typ'), {typst:compiler}), /symlink|symbolic link/i);
});

test('CLI rejects unknown options and missing option values', () => {
  const entry = fileURLToPath(new URL('../export-typst.mjs', import.meta.url));
  for (const args of [['--unknown'], ['main.typ', '--output']]) {
    const result = spawnSync(process.execPath, [entry, ...args], {encoding:'utf8'});
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unknown option|requires a value/);
  }
});

test('embedded HTML cannot introduce network resources or active content', integration, () => {
  const cases = [
    ['iframe', '#html.elem("iframe", attrs: (src: "https://example.com/"))'],
    ['style', String.raw`#html.elem("style", "body { background: url(\"https://example.com/pixel.png\"); }")`],
  ];
  for (const [name, source] of cases) {
    const directory = fixture();
    const input = path.join(directory, name + '.typ');
    const output = path.join(directory, name + '.html');
    fs.writeFileSync(input, "A document.\n" + source);
    assert.throws(() => build(input, {typst:compiler, output}), /Unsupported external|External CSS/);
    assert.equal(fs.existsSync(output), false);
  }
});

test('an empty main file fails with guidance to select an entry point', integration, () => {
  const directory = fixture();
  const input = path.join(directory, 'main.typ');
  fs.writeFileSync(input, '');
  assert.throws(() => build(input, {typst:compiler}), /empty document.*entry point/i);
});

test('numbered equations retain forward references and HTML anchors', integration, () => {
  const directory = fixture();
  const input = path.join(directory, 'references.typ');
  fs.writeFileSync(input, '#set math.equation(numbering: "(1)")\nSee @later.\n$ x = 1 $ <later>');
  const report = build(input, {typst:compiler});
  const html = fs.readFileSync(report.output, 'utf8');
  assert.equal(report.mathCount, 1);
  assert.match(html, /href="#later"/);
  assert.match(html, /id="later"/);
});

test('an explicit relative compiler path is resolved from the caller directory', {...integration, skip:!available || !fs.existsSync(compiler)}, () => {
  const directory = fixture();
  const relative = path.relative(process.cwd(), path.resolve(compiler));
  const report = build(path.join(directory, 'main.typ'), {typst:relative});
  assert.equal(report.status, 'ok');
});

test('report writes never follow links to source files, on successful or failed builds', {...integration, skip:!available || process.platform === 'win32'}, () => {
  for (const linkType of ['symlink', 'hardlink']) {
    for (const broken of [false, true]) {
      const directory = fixture();
      const input = path.join(directory, 'main.typ');
      const output = path.join(directory, 'result.html');
      const work = path.join(directory, 'result.export');
      fs.mkdirSync(work);
      const report = path.join(work, 'report.json');
      if (linkType === 'symlink') fs.symlinkSync(input, report);
      else fs.linkSync(input, report);
      if (broken) fs.unlinkSync(path.join(directory, 'pixel.svg'));
      const before = fs.readFileSync(input);
      try { build(input, {typst:compiler, output}); } catch (error) {
        assert.match(error.message, /report|symbolic|pixel\.svg|file not found/i);
      }
      assert.deepEqual(fs.readFileSync(input), before, `${linkType}, broken=${broken}`);
    }
  }
});

test('SVG filter images cannot preserve a network dependency', integration, () => {
  const directory = fixture();
  const input = path.join(directory, 'filter.typ');
  fs.writeFileSync(input, `#html.elem("svg", attrs: (xmlns: "http://www.w3.org/2000/svg", width: "100", height: "100"), {
    html.elem("defs", html.elem("filter", attrs: (id: "remote"),
      html.elem("feImage", attrs: (href: "https://example.com/picture.png"))))
    html.elem("rect", attrs: (width: "100", height: "100", filter: "url(#remote)"))
  })`);
  assert.throws(() => build(input, {typst:compiler}), /non-embedded|non-local|resource/i);
});

test('SVG stylesheets retain gradients, ID selectors and ID attribute selectors after namespacing', integration, () => {
  const directory = fixture();
  const input = path.join(directory, 'styles.typ');
  fs.writeFileSync(input, String.raw`#html.elem("svg", attrs: (xmlns: "http://www.w3.org/2000/svg", width: "100", height: "100"), {
    html.elem("defs", html.elem("linearGradient", attrs: (id: "gradient"), {
      html.elem("stop", attrs: (offset: "0%", "stop-color": "red"))
      html.elem("stop", attrs: (offset: "100%", "stop-color": "blue"))
    }))
    html.elem("style", ".box { fill: url(#gradient); } #shape { stroke: black; } [id=shape] { stroke-width: 2; }")
    html.elem("rect", attrs: (id: "shape", class: "box", width: "100", height: "100"))
  })`);
  const report = build(input, {typst:compiler});
  const html = fs.readFileSync(report.output, 'utf8');
  assert.match(html, /id="svg-1-gradient"/);
  assert.match(html, /url\(#svg-1-gradient\)/);
  assert.match(html, /#svg-1-shape\s*\{/);
  assert.match(html, /\[id=(?:"|&quot;)?svg-1-shape/);
  assert.doesNotMatch(html, /url\(#gradient\)|#shape\s*\{/);
});

test('ruled mathematical tables preserve their horizontal and vertical rules', integration, () => {
  const directory = fixture();
  const input = path.join(directory, 'array.typ');
  fs.writeFileSync(input, `#table(
    columns: 2, stroke: none,
    table.hline(y: 1, stroke: 0.4pt),
    table.vline(x: 1, stroke: 0.4pt),
    [offset], [$f[x]$], [$0$], [$f_0$],
  )`);
  const report = build(input, {typst:compiler});
  const html = fs.readFileSync(report.output, 'utf8');
  assert.match(html, /class="typst-table"/);
  assert.equal(report.svgCount, 1);
  assert.equal((html.match(/stroke-width="0\.4"/g) || []).length, 2);
});
