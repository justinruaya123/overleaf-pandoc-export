// Usage: node tests/typst-browser-check.mjs build/lecture.html
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
if (!process.argv[2]) throw new Error('Supply an exported Typst HTML file.');
const file = path.resolve(process.argv[2]);
const directory = file.slice(0, -5) + '.export';
const build = JSON.parse(fs.readFileSync(path.join(directory, 'report.json'), 'utf8'));
assert.equal(build.status, 'ok');
const outputSha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert.equal(outputSha256, build.outputSha256, 'HTML changed after export');
const browser = await chromium.launch({headless:true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath:process.env.BROWSER_EXECUTABLE} : {})});
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000}, javaScriptEnabled:false});
  const errors = [], network = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
  await page.route(/^https?:/, route => {network.push(route.request().url()); return route.abort();});
  await page.goto(pathToFileURL(file).href, {waitUntil:'load'});
  const inspect = () => page.evaluate(() => {
    const math = [...document.querySelectorAll('.typst-math')];
    const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
    const imageResources = [...document.querySelectorAll('svg image')];
    const diagrams = [...document.querySelectorAll('.typst-diagram>svg,.typst-layout>svg')];
    const uses = [...document.querySelectorAll('svg use')];
    const slides = [...document.querySelectorAll('.slide')];
    return {
      frames:slides.length,
      maths:math.length,
      unrenderedMath:math.filter(el => !el.querySelector('svg') || !el.getBoundingClientRect().height).map(el => el.outerHTML.slice(0, 160)),
      clippedMath:math.filter(el => {
        const svg = el.querySelector('svg');
        if (!svg) return false;
        const bounds = svg.getBBox(), view = svg.viewBox.baseVal;
        return bounds.y < view.y - .1 || bounds.y + bounds.height > view.y + view.height + .1;
      }).map(el => el.querySelector('svg').getAttribute('viewBox')),
      svg:document.querySelectorAll('svg').length,
      images:document.images.length,
      brokenImages:[...document.images].filter(el => !el.complete || !el.naturalWidth).map(el => el.getAttribute('src').slice(0,80)),
      nonEmbeddedImages:imageResources.filter(el => !(el.getAttribute('href') || el.getAttribute('xlink:href') || '').startsWith('data:')).length,
      collapsedSvgImages:imageResources.filter(el => {
        const bounds = el.getBBox();
        return bounds.width <= 0 || bounds.height <= 0;
      }).length,
      clippedDiagrams:diagrams.filter(svg => {
        const bounds = svg.getBBox(), view = svg.viewBox.baseVal;
        return bounds.x < view.x - .5 || bounds.y < view.y - .5
          || bounds.x + bounds.width > view.x + view.width + .5
          || bounds.y + bounds.height > view.y + view.height + .5;
      }).map(svg => svg.getAttribute('viewBox')),
      unresolvedSvg:uses.filter(el => {
        const href = el.getAttribute('href') || el.getAttribute('xlink:href') || '';
        return !href.startsWith('#') || !document.getElementById(href.slice(1));
      }).length,
      duplicateIds:ids.filter((id, i) => ids.indexOf(id) !== i),
      horizontalOverflow:document.documentElement.scrollWidth > window.innerWidth + 1,
      selectableText:document.body.innerText.trim().length,
      headings:[...document.querySelectorAll('.slide h2,.slide h3')].map(el => el.textContent),
      handout:{
        pages:slides.length,
        nextCopies:document.querySelectorAll('[data-handout-copy]').length,
        notesInSlides:document.querySelectorAll('.slide .lecturer-notes').length,
        flowErrors:slides.slice(1).flatMap((el, i) => {
          const current = el.getBoundingClientRect(), previous = slides[i].getBoundingClientRect();
          return current.top >= previous.bottom && Math.abs(current.left - previous.left) < 1 ? [] : [i + 2];
        }),
      },
    };
  });
  const desktop = await inspect();
  assert.equal(desktop.frames, build.frames);
  assert.equal(desktop.maths, build.mathCount);
  assert.equal(desktop.images, build.images);
  assert.ok(desktop.selectableText > 0);
  for (const key of ['unrenderedMath', 'clippedMath', 'clippedDiagrams', 'brokenImages', 'duplicateIds']) assert.deepEqual(desktop[key], [], key);
  assert.equal(desktop.nonEmbeddedImages, 0);
  assert.equal(desktop.collapsedSvgImages, 0, 'framed SVG images collapsed');
  assert.equal(desktop.unresolvedSvg, 0);
  assert.equal(desktop.horizontalOverflow, false, 'desktop page overflows');
  assert.equal(desktop.handout.nextCopies, 0, 'slides must appear once in the continuous document');
  assert.deepEqual(desktop.handout.flowErrors, [], 'slides must follow one another in a single column');
  if (build.handout !== 'lecturer' || !build.annotations) {
    assert.equal(desktop.handout.notesInSlides, 0, 'professor notes leaked into public content');
  }
  const frames = page.locator('.slide');
  for (const [label, index] of [['first', 0], ['middle', Math.floor(build.frames / 2)], ['last', build.frames - 1]]) {
    if (index >= 0 && await frames.count()) await frames.nth(index).screenshot({path:path.join(directory, `${label}-desktop.png`)});
  }
  await page.setViewportSize({width:390,height:844});
  const mobile = await inspect();
  assert.equal(mobile.horizontalOverflow, false, 'mobile page overflows');
  assert.deepEqual(mobile.unrenderedMath, []);
  assert.deepEqual(mobile.clippedMath, []);
  assert.deepEqual(mobile.clippedDiagrams, []);
  assert.equal(mobile.collapsedSvgImages, 0);
  assert.deepEqual(mobile.handout.flowErrors, [], 'mobile slides must remain in a single column');
  if (await frames.count()) await frames.nth(Math.floor(build.frames / 2)).screenshot({path:path.join(directory, 'middle-mobile.png')});
  assert.deepEqual(errors, []);
  assert.deepEqual(network, [], 'HTML requested network resources');
  const result = {status:'passed', outputSha256, browser:await browser.version(), offline:true, javaScriptRequired:false, desktop, mobile:{width:390,horizontalOverflow:mobile.horizontalOverflow}, consoleErrors:errors, networkRequests:network};
  fs.writeFileSync(path.join(directory, 'browser-report.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
