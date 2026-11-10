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

test('SCL retains all overlay equations and semantic content while framing CeTZ and layout', {
  skip: (!available || !pandocAvailable) && 'Install Typst and Pandoc for this source-configured handout fixture',
}, () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'typst scl export '));
  try {
    fs.cpSync(fixtures, directory, {recursive:true});
    const sources = [
      'main.typ',
      'scl-beamer/lib.typ',
      'scl-beamer/components/equations.typ',
      'scl-beamer/components/overlays.typ',
    ].map(file => [file, fs.readFileSync(path.join(directory, file))]);
    const report = build(path.join(directory, 'main.typ'), {
      typst:compiler,
      pandoc,
      output:path.join(directory, 'result.html'),
    });
    const html = fs.readFileSync(report.output, 'utf8');
    assert.equal(report.profile, 'scl');
    assert.equal(report.handout, 'students');
    assert.equal(report.frames, 3); // Title, content, closing slide.
    assert.equal(report.mathCount, 5); // One equation plus both rows of both eq-alt forms.
    assert.equal(report.svgCount, 8); // Equations, CeTZ, layout callback, and grid.
    assert.match(html, /<h1[^>]*>Static lecture fixture<\/h1>/);
    assert.match(html, /Before the pause/);
    assert.match(html, /Content added by slide setting/);
    assert.match(html, /href="https:\/\/example.org\/reference"/);
    assert.match(html, /After the pause/);
    assert.match(html, /First alternative/);
    assert.match(html, /Second alternative/);
    const document = new DOMParser().parseFromString(html, 'text/html');
    const alternatives = Array.from(document.getElementsByTagName('div'))
      .filter(node => (node.getAttribute('class') || '').split(/\s+/).includes('overlay-step'));
    assert.deepEqual(alternatives.map(node => node.textContent.trim()), ['First alternative.', 'Second alternative.']);
    assert.match(html, /<aside class="scl-block normal"/);
    assert.match(html, /<aside class="scl-block alert"/);
    assert.match(html, /Semantic block content/);
    assert.match(html, /Alert block content/);
    assert.match(html, /<ul\b/);
    assert.match(html, /<table\b/);
    assert.match(html, /Closing words retained/);
    assert.equal((html.match(/class="typst-diagram"/g) || []).length, 3);
    assert.doesNotMatch(html, /src="https?:|<script\b/);
    assert.equal(report.sourceUnchanged, true);
    for (const [file, before] of sources) {
      assert.deepEqual(fs.readFileSync(path.join(directory, file)), before);
    }
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
});

test('percentage-width grid images retain visible dimensions beside prose and equations', {
  skip: !available && 'Install Typst or set TYPST to run compiler integration tests',
}, () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'typst grid export '));
  try {
    fs.cpSync(fixtures, directory, {recursive:true});
    fs.writeFileSync(path.join(directory, 'chart.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300"><path d="M20 280 L300 20 L580 280" fill="none" stroke="navy" stroke-width="4"/></svg>');
    fs.writeFileSync(path.join(directory, 'main.typ'), `#import "scl-beamer/lib.typ": *
#show: scl-theme.with()
#slide(title: [A percentage-width grid])[
  #grid(columns: (1.4fr, 1fr), gutter: 4mm,
    [#image("chart.svg", width: 100%, height: 38mm, fit: "contain")],
    [Predict the mean. $ a_0=1/2 $ Predict the sine coefficients. $ b_n=0 $],
  )
]
`);
    const report = build(path.join(directory, 'main.typ'), {typst:compiler});
    const document = new DOMParser().parseFromString(fs.readFileSync(report.output, 'utf8'), 'text/html');
    const svg = document.getElementsByTagName('svg')[0];
    const graphic = svg.getElementsByTagName('image')[0];
    assert.ok(Number(graphic.getAttribute('width')) > 100, 'percentage image collapsed horizontally');
    assert.ok(Number(graphic.getAttribute('height')) > 50, 'percentage image collapsed vertically');
    assert.ok(Number(svg.getAttribute('viewBox').split(/\s+/)[2]) > 500, 'grid has no usable horizontal layout region');
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
});
