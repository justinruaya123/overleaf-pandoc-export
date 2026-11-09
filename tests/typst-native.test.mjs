import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const example = fileURLToPath(new URL('../examples/cs138-fourier/', import.meta.url));
const compiler = process.env.TYPST || 'typst';
const available = spawnSync(compiler, ['--version'], {encoding:'utf8'}).status === 0;
const integration = {skip:!available && 'Install Typst or set TYPST to run native template tests'};

function fixture(t, body) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'typst native '));
  t.after(() => fs.rmSync(directory, {recursive:true, force:true}));
  fs.cpSync(path.join(example, 'scl-beamer'), path.join(directory, 'scl-beamer'), {recursive:true});
  const input = path.join(directory, 'main.typ');
  fs.writeFileSync(input, '#import "scl-beamer/lib.typ": *\n' + body);
  return {directory, input};
}

function run(f, command, args, inputs = {}) {
  const result = spawnSync(compiler, [command,
    '--root', f.directory,
    '--font-path', path.join(example, 'fonts'),
    '--package-cache-path', path.join(example, 'packages'),
    ...Object.entries(inputs).flatMap(([key, value]) => ['--input', `${key}=${value}`]),
    ...args,
  ], {encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout;
}

function inspect(f, inputs = {}) {
  return JSON.parse(run(f, 'eval', ['--in', f.input, `(
    pages: query(<scl-page-info>).map(it => it.value),
    notes: query(<scl-slide-notes>).map(it => repr(it.value.notes)),
    extras: query(<native-extra>).map(it => it.value),
  )`], inputs));
}

test('native author API excludes professor notes from live and student pages and retains lecturer metadata', integration, t => {
  const f = fixture(t, `
#show: scl-theme.with(handout: false, handout-mode: "students",
  annotations: true, extensions: true,
  config-common(slide-level: 3), config-info(title: [Native fixture]))
#let private-note(body) = [#body #context { panic("Professor notes reached page layout") }]
#title-slide(notes: private-note[Private title.])
#slide(title: [Content])[
  First reveal. #pause Final reveal.
  #handout[#metadata("inline") <native-extra> Shared explanation.]
  #handout(enabled: false)[#context { panic("Disabled inline material reached layout") }]
][#private-note[Private content.]]
#handout-slide(title: [Optional reading])[
  #metadata("slide") <native-extra> Shared optional slide.
][#private-note[Private extension.]]
#handout-slide(enabled: false)[#context { panic("Disabled slide reached layout") }]
`);
  const live = inspect(f);
  assert.deepEqual(live.pages.map(page => [page.frame, page.subslide]), [[0, 1], [1, 1], [1, 2]]);
  assert.deepEqual(live.notes, []);
  assert.deepEqual(live.extras, []);

  const students = inspect(f, {handout:'true', 'handout-mode':'students'});
  assert.deepEqual(students.pages.map(page => [page.frame, page.subslide]), [[0, 1], [1, 2], [2, 1]]);
  assert.deepEqual(students.notes, []);
  assert.deepEqual(students.extras, ['inline', 'slide']);

  const lecturer = inspect(f, {handout:'true', 'handout-mode':'lecturer'});
  assert.equal(lecturer.pages.length, 3);
  assert.deepEqual(lecturer.extras, ['inline', 'slide']);
  assert.equal(lecturer.notes.length, 3);
  for (const [index, marker] of ['Private title.', 'Private content.', 'Private extension.'].entries()) {
    assert.ok(lecturer.notes[index].includes(marker));
  }

  const plain = inspect(f, {handout:'true', 'handout-mode':'lecturer', annotations:'false', extensions:'false'});
  assert.equal(plain.pages.length, 2);
  assert.deepEqual(plain.notes, []);
  assert.deepEqual(plain.extras, []);
});

test('native source settings and compiler overrides suppress handout-only layout work', integration, t => {
  const f = fixture(t, `
#show: scl-theme.with(handout: true, handout-mode: "lecturer", extensions: false)
#slide[
  Public content. #pause Final reveal.
  #handout[#context { panic("Globally disabled inline material reached layout") }]
][Private note.]
#handout-slide[#context { panic("Globally disabled slide reached layout") }]
`);
  const source = inspect(f);
  assert.equal(source.pages.length, 1);
  assert.equal(source.notes.length, 1);
  const live = inspect(f, {handout:'false'});
  assert.equal(live.pages.length, 2);
  assert.deepEqual(live.notes, []);
});

test('native eq-alt accumulates visible rows with expand and preserves replacement defaults', integration, t => {
  const f = fixture(t, `
#show: scl-theme.with()
#slide(align: top, config: config-page(background: none))[
  #let derivation = eq-alt.with(($x$, $1+1$, $x$, $2$, $x$, $136$),
    symbol: text(fill: rgb("#ab1234"), $=$))
  #if sys.inputs.at("grow", default: "false") == "true" {
    derivation(expand: true)
  } else {
    derivation()
  }
]
`);
  for (const [prefix, inputs, counts] of [
    ['replace', {}, [1, 1, 1]],
    ['expand', {grow:'true'}, [1, 2, 3]],
    ['handout', {grow:'true', handout:'true'}, [3]],
  ]) {
    run(f, 'compile', [f.input, path.join(f.directory, `${prefix}-{p}.svg`)], inputs);
    const pages = fs.readdirSync(f.directory).filter(name => name.startsWith(`${prefix}-`) && name.endsWith('.svg'))
      .sort((a, b) => a.localeCompare(b, undefined, {numeric:true}));
    // A distinct fill identifies only the rendered equals signs, not hidden rows.
    const visibleRows = pages.map(name => (fs.readFileSync(path.join(f.directory, name), 'utf8').match(/fill="#ab1234"/g) || []).length);
    assert.deepEqual(visibleRows, counts, prefix);
  }
});
