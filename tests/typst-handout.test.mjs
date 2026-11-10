import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {DOMParser} from '@xmldom/xmldom';
import {build} from '../export-typst.mjs';

const fixtures = fileURLToPath(new URL('fixtures/typst-scl/', import.meta.url));
const compiler = process.env.TYPST || 'typst';
const pandoc = process.env.PANDOC || 'pandoc';
const available = spawnSync(compiler, ['--version'], {encoding:'utf8'}).status === 0;
const pandocAvailable = spawnSync(pandoc, ['--version'], {encoding:'utf8'}).status === 0;
const integration = {skip:(!available || !pandocAvailable) && 'Install Typst and Pandoc for handout integration tests'};

function fixture(settings = '') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'typst handout '));
  fs.cpSync(fixtures, directory, {recursive:true});
  fs.writeFileSync(path.join(directory, 'scl-beamer', 'components', 'branding.typ'), '#let scl-affiliation = [Fixture institution]\n');
  fs.writeFileSync(path.join(directory, 'scl-handout.typ'), '#let slide(..args) = panic("Native-only helper must be adapted for HTML")\n');
  fs.writeFileSync(path.join(directory, 'main.typ'), `#import "scl-beamer/lib.typ": *
#import "scl-handout.typ": scl-theme, slide, title-slide, handout, handout-slide, eq-alt
#show: scl-theme.with(config-info(title: [Handout fixture], institution: scl-affiliation), ${settings})
#title-slide(notes: [Private title.])
#slide(title: [Contents])[#outline(title: none, depth: 1)]
= First section
#slide(title: [First page], subtitle: [Shared subtitle])[
  Public first. $x = 1$
  #handout[Shared inline explanation.]
  #handout(enabled: false)[Disabled inline explanation.]

  A sentence #handout[with shared words] stays together.
  - A list item #handout[with an extra phrase] remains a list.
][Private first. $a = 2$]
#handout-slide(title: [Extension page])[Shared extension page.][Private extension.]
#handout-slide(enabled: false, title: [Disabled extension])[Never render this page.]
= Last section
#slide(title: [Last page])[Public last.][Private last.]
`);
  return directory;
}

function elements(node) {
  const result = [];
  for (const child of Array.from(node.childNodes || [])) {
    if (child.nodeType === 1) result.push(child, ...elements(child));
  }
  return result;
}

const hasClass = (node, name) => (node.getAttribute('class') || '').split(/\s+/).includes(name);
const withClass = (node, name) => elements(node).filter(child => hasClass(child, name));

test('lecturer handout is one continuous document with each slide and its notes exactly once', integration, () => {
  const directory = fixture();
  try {
    const input = path.join(directory, 'main.typ');
    const before = fs.readFileSync(input);
    const report = build(input, {typst:compiler, pandoc, handout:'lecturer'});
    const html = fs.readFileSync(report.output, 'utf8');
    const document = new DOMParser().parseFromString(html, 'text/html');
    const pages = withClass(document, 'slide');
    assert.equal(report.frames, 5);
    assert.equal(report.handout, 'lecturer');
    assert.match(report.pandoc, /pandoc /i);
    assert.match(html, /name="generator" content="pandoc"/);
    assert.equal(pages.length, 5);
    const titles = node => elements(node).filter(child => /^h[1-6]$/.test(child.localName)).map(child => child.textContent.trim());
    assert.deepEqual(pages.map(page => titles(page)[0]), [
      'Handout fixture', 'Contents', 'First page', 'Extension page', 'Last page',
    ]);
    assert.equal(withClass(document, 'handout-page').length, 0);
    assert.equal(withClass(document, 'handout-next').length, 0);
    assert.equal(elements(document).filter(node => node.hasAttribute('data-handout-copy')).length, 0);
    assert.match(withClass(pages[2], 'lecturer-notes')[0].textContent, /Private first/);
    assert.match(withClass(pages[3], 'lecturer-notes')[0].textContent, /Private extension/);
    assert.match(withClass(pages[0], 'lecturer-notes')[0].textContent, /Private title/);
    assert.match(pages[0].textContent, /Fixture institution/);
    assert.equal(withClass(pages[2], 'slide-subtitle')[0]?.textContent.trim(), 'Shared subtitle');
    assert.equal(withClass(document, 'lecturer-notes').length, 4);
    assert.equal((document.documentElement.textContent.match(/Public first\./g) || []).length, 1);
    assert.doesNotMatch(html, /Disabled inline|Never render this page|Disabled extension/);
    assert.match(html, /class="typst-math/);
    assert.match(html, /<svg\b/);
    const ids = elements(document).map(node => node.getAttribute('id')).filter(Boolean);
    assert.equal(new Set(ids).size, ids.length, 'slides and notes have unique anchors and SVG identifiers');
    for (const node of elements(document)) {
      const href = node.getAttribute('href');
      if (href?.startsWith('#')) assert.ok(ids.includes(href.slice(1)), `missing anchor ${href}`);
    }
    assert.deepEqual(fs.readFileSync(input), before);
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
});

test('student handout retains shared additions in source order without professor notes', integration, () => {
  const directory = fixture('handout: true, handout-mode: "lecturer",');
  try {
    const report = build(path.join(directory, 'main.typ'), {typst:compiler, pandoc, handout:'students'});
    const html = fs.readFileSync(report.output, 'utf8');
    const document = new DOMParser().parseFromString(html, 'text/html');
    assert.equal(report.handout, 'students');
    assert.equal(report.frames, 5);
    assert.equal(withClass(document, 'slide').length, 5);
    assert.equal(withClass(document, 'handout-next').length, 0);
    assert.equal(withClass(document, 'lecturer-notes').length, 0);
    assert.match(html, /Shared inline explanation/);
    assert.match(html, /Shared extension page/);
    const text = node => node.textContent.replace(/\s+/g, ' ').trim();
    assert.ok(elements(document).some(node => node.localName === 'p' && text(node).includes('A sentence with shared words stays together.')));
    assert.ok(elements(document).some(node => node.localName === 'li' && text(node) === 'A list item with an extra phrase remains a list.'));
    assert.doesNotMatch(html, /Private first|Private extension|Private last|Private title|Disabled inline|Never render this page/);
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
});

test('source handout settings are honored, while disabled annotations and extensions are not rendered', integration, () => {
  const directory = fixture('handout: true, handout-mode: "lecturer",');
  try {
    const report = build(path.join(directory, 'main.typ'), {
      typst:compiler, pandoc, annotations:false, extensions:false,
    });
    const html = fs.readFileSync(report.output, 'utf8');
    const document = new DOMParser().parseFromString(html, 'text/html');
    assert.equal(report.handout, 'lecturer');
    assert.equal(report.frames, 4);
    assert.equal(withClass(document, 'slide').length, 4);
    assert.doesNotMatch(html, /Private first|Private extension|Private last|Private title|Shared inline|Shared extension/);
    assert.match(withClass(document, 'slide')[3].textContent, /Last page/);
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
});

test('the optional handout wrapper preserves composed slide bodies as public content in reading order', integration, () => {
  const directory = fixture();
  try {
    const helper = path.join(directory, 'scl-handout.typ');
    const input = path.join(directory, 'main.typ');
    fs.appendFileSync(input, `
#import "scl-handout.typ": slide
#slide(title: [Composed page], composer: (1fr, 1fr), notes: [Private composed notes.])[
  Public left column.
][
  Public right column.
]
#slide(title: [Explicit public bodies], notes: none)[Public first body.][Public second body.]
#import "scl-beamer/lib.typ": slide
#slide(title: [Original public bodies])[Original first body.][Original second body.]
`);
    const before = fs.readFileSync(helper);
    for (const audience of ['students', 'lecturer']) {
      const report = build(input, {typst:compiler, pandoc, handout:audience});
      const document = new DOMParser().parseFromString(fs.readFileSync(report.output, 'utf8'), 'text/html');
      const pages = withClass(document, 'slide');
      const composed = pages.at(-3);
      assert.match(composed.textContent, /Public left column\.[\s\S]*Public right column\./);
      assert.match(pages.at(-2).textContent, /Public first body\.[\s\S]*Public second body\./);
      assert.match(pages.at(-1).textContent, /Original first body\.[\s\S]*Original second body\./);
      if (audience === 'lecturer') assert.match(composed.textContent, /Private composed notes/);
      else assert.doesNotMatch(document.documentElement.textContent, /Private composed notes/);
    }
    assert.deepEqual(fs.readFileSync(helper), before);
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
});

test('common handout configuration overrides the named source default and CLI off overrides both', integration, () => {
  const directory = fixture('handout: false, handout-mode: "lecturer", config-common(handout: true),');
  try {
    const input = path.join(directory, 'main.typ');
    const report = build(input, {typst:compiler, pandoc});
    const html = fs.readFileSync(report.output, 'utf8');
    assert.equal(report.handout, 'lecturer');
    assert.equal(report.frames, 5);
    assert.match(html, /Shared inline explanation/);
    assert.match(html, /Private first/);
    const plain = build(input, {typst:compiler, handout:'off', pandoc:path.join(directory, 'missing-pandoc')});
    assert.equal(plain.handout, undefined);
    assert.equal(plain.pandoc, undefined);
    assert.equal(plain.frames, 4);
    assert.doesNotMatch(fs.readFileSync(plain.output, 'utf8'), /Shared inline explanation|Private first/);
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
});

test('ordinary exports skip Pandoc and omit both notes and handout-only work', {skip:!available}, () => {
  const directory = fixture();
  try {
    const report = build(path.join(directory, 'main.typ'), {
      typst:compiler, pandoc:path.join(directory, 'missing-pandoc'),
    });
    const html = fs.readFileSync(report.output, 'utf8');
    assert.equal(report.frames, 4);
    assert.equal(report.pandoc, undefined);
    assert.equal(report.handout, undefined);
    assert.match(html, /Public first/);
    assert.doesNotMatch(html, /Private first|Private extension|Private last|Private title|Shared inline|Shared extension/);
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
});

test('handout off overrides an enabled source and never invokes Pandoc', {skip:!available}, () => {
  const directory = fixture('handout: true, handout-mode: "lecturer",');
  try {
    const report = build(path.join(directory, 'main.typ'), {
      typst:compiler, handout:'off', pandoc:path.join(directory, 'missing-pandoc'),
    });
    const html = fs.readFileSync(report.output, 'utf8');
    assert.equal(report.frames, 4);
    assert.equal(report.pandoc, undefined);
    assert.equal(report.handout, undefined);
    assert.doesNotMatch(html, /Private first|Private extension|Private last|Private title|Shared inline|Shared extension/);
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
});

test('missing Pandoc fails without replacing a previously successful handout', integration, () => {
  const directory = fixture();
  try {
    const input = path.join(directory, 'main.typ');
    const options = {typst:compiler, pandoc, handout:'students'};
    const report = build(input, options);
    const before = fs.readFileSync(report.output);
    assert.throws(() => build(input, {...options, pandoc:path.join(directory, 'missing-pandoc')}), /Pandoc.*--pandoc/i);
    assert.deepEqual(fs.readFileSync(report.output), before);
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
});

test('handout CLI validates audience and boolean switches before invoking a compiler', () => {
  const directory = fixture();
  const entry = fileURLToPath(new URL('../export-typst.mjs', import.meta.url));
  try {
    for (const [option, value, message] of [
      ['--handout', 'instructor', /lecturer.*students/],
      ['--annotations', 'yes', /true.*false/],
      ['--extensions', 'no', /true.*false/],
    ]) {
      const result = spawnSync(process.execPath, [entry, path.join(directory, 'main.typ'), option, value], {encoding:'utf8'});
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, message);
    }
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
});
