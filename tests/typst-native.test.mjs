import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const example = fileURLToPath(new URL('../examples/cs138-fourier/', import.meta.url));
const compiler = process.env.TYPST || 'typst';
const available = spawnSync(compiler, ['--version'], {encoding:'utf8'}).status === 0;
const integration = {skip:!available && 'Install Typst or set TYPST to run native template tests'};

function fixture(t, body, annotations = true) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'typst native '));
  t.after(() => fs.rmSync(directory, {recursive:true, force:true}));
  fs.cpSync(path.join(example, 'scl-beamer'), path.join(directory, 'scl-beamer'), {recursive:true});
  fs.copyFileSync(path.join(example, 'scl-handout.typ'), path.join(directory, 'scl-handout.typ'));
  const input = path.join(directory, 'main.typ');
  fs.writeFileSync(input, '#import "scl-beamer/lib.typ": *\n' +
    (annotations ? '#import "scl-handout.typ": scl-theme, slide, title-slide, handout, handout-slide, eq-alt\n' : '') + body);
  return {directory, input};
}

test('the upstream SCL theme and equation component remain unchanged', () => {
  for (const [file, expected] of [
    ['core/theme.typ', '5923757de997c9a2967622b6d1118c58be71bba1'],
    ['components/equations.typ', '9729b17c6d2c6a5ade132b05e641b7baf79b5405'],
  ]) {
    const source = fs.readFileSync(path.join(example, 'scl-beamer', file));
    const sha = createHash('sha1').update(`blob ${source.length}\0`).update(source).digest('hex');
    assert.equal(sha, expected, `${file} must match scl-beamer-typst e44fbc3`);
  }
});

test('the optional helpers preserve native SCL rendering and multi-body composers', integration, t => {
  const body = `
#show: scl-theme.with(config-info(title: [Native comparison]))
#title-slide()
= Section
== Original components
#slide(composer: (1fr, 1fr))[
  - First bullet.
  - Second bullet.
  #scl-block(title: [Definition])[Native SCL block.]
][
  #example-block(title: [Check])[Right column remains content.]
  #pause
  #alert-block(title: [Condition])[Still the original component.]
]
`;
  const native = fixture(t, body, false);
  const wrapped = fixture(t, body);
  for (const f of [native, wrapped]) {
    run(f, 'compile', [f.input, path.join(f.directory, 'slide-{p}.svg')]);
  }
  const files = fs.readdirSync(native.directory).filter(name => /^slide-\d+\.svg$/.test(name)).sort();
  assert.equal(files.length, 3);
  for (const file of files) {
    assert.equal(fs.readFileSync(path.join(wrapped.directory, file), 'utf8'),
      fs.readFileSync(path.join(native.directory, file), 'utf8'), file);
  }
});

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

test('annotated slides retain native callback bodies and their reveal sequence', integration, t => {
  const f = fixture(t, `
#show: scl-theme.with(config-store(callback-marker: "Callback received self"))
#let callback(self) = [
  #metadata(self.store.callback-marker) <native-extra>
  First callback reveal. #pause Final callback reveal.
]
#slide(callback, notes: [Named annotation.])
#slide(callback)[Positional annotation.]
#slide(composer: (1fr, 1fr), notes: [Column annotation.], callback, [Second column.])
`);
  run(f, 'compile', [f.input, path.join(f.directory, 'callbacks.pdf')]);
  const live = inspect(f);
  assert.equal(live.pages.length, 6);
  assert.deepEqual(live.notes, []);
  assert.ok(live.extras.every(value => value === 'Callback received self'));
  const lecturer = inspect(f, {handout:'true', 'handout-mode':'lecturer'});
  assert.equal(lecturer.pages.length, 3);
  assert.deepEqual(lecturer.notes.map(value => value.match(/(?:Named|Positional|Column) annotation\./)?.[0]),
    ['Named annotation.', 'Positional annotation.', 'Column annotation.']);
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

test('expanded equations retain native automatic-pause defaults and overrides', integration, t => {
  const f = fixture(t, `
#show: scl-theme.with()
#slide(align: top, config: config-page(background: none))[
  #let options = (expand: sys.inputs.at("expand", default: "false") == "true")
  #if "advance" in sys.inputs { options.auto-pauses = sys.inputs.advance == "true" }
  #if sys.inputs.at("legacy", default: "false") == "true" {
    eq-alt(($x$,), ($2$, $3$, $4$), ..options)
  } else {
    eq-alt(($x$, $2$, $x$, $3$, $x$, $4$), ..options)
  }
  #text(fill: rgb("#ba5678"))[Following content.]
]
`);
  for (const [name, inputs, visible] of [
    ['interleaved', {}, [0, 0, 1]],
    ['legacy', {legacy:'true'}, [1, 1, 1]],
    ['interleaved-no-advance', {advance:'false'}, [1, 1, 1]],
    ['legacy-advance', {legacy:'true', advance:'true'}, [0, 0, 1]],
  ]) {
    for (const expand of ['false', 'true']) {
      const prefix = `${name}-${expand}`;
      run(f, 'compile', [f.input, path.join(f.directory, `${prefix}-{p}.svg`)], {...inputs, expand});
      const pages = fs.readdirSync(f.directory).filter(file => file.startsWith(`${prefix}-`) && file.endsWith('.svg'))
        .sort((a, b) => a.localeCompare(b, undefined, {numeric:true}));
      assert.deepEqual(pages.map(file => Number(fs.readFileSync(path.join(f.directory, file), 'utf8').includes('fill="#ba5678"'))),
        visible, prefix);
    }
  }
});
