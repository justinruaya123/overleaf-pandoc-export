import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {build} from '../export-typst.mjs';

const fixtures = fileURLToPath(new URL('fixtures/typst-scl/', import.meta.url));
const compiler = process.env.TYPST || 'typst';
const available = spawnSync(compiler, ['--version'], {encoding:'utf8'}).status === 0;

test('SCL retains all overlay equations and semantic content while framing CeTZ and layout', {
  skip: !available && 'Install Typst or set TYPST to run compiler integration tests',
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
      output:path.join(directory, 'result.html'),
    });
    const html = fs.readFileSync(report.output, 'utf8');
    assert.equal(report.profile, 'scl');
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
    assert.match(html, /class="overlay-step"[^>]*>First alternative/);
    assert.match(html, /class="overlay-step"[^>]*>Second alternative/);
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
