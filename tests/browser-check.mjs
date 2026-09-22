// Run after export: node tests/browser-check.mjs build/CS138-L1.html
// Install Playwright locally, or set PLAYWRIGHT_MODULE to an existing package directory.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const file = path.resolve(process.argv[2]);
const directory = path.join(path.dirname(file), path.basename(file, path.extname(file)) + '.export');
const build = JSON.parse(fs.readFileSync(path.join(directory, 'report.json'), 'utf8'));
assert.equal(build.status, 'passed');
const outputSha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert.equal(outputSha256, build.outputSha256, 'HTML changed after its successful build');
const browser = await chromium.launch({headless:true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath:process.env.BROWSER_EXECUTABLE} : {channel:'chrome'})});
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  const errors = [], network = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
  await page.route(/^https?:/, route => {network.push(route.request().url()); return route.abort();});
  await page.goto(pathToFileURL(file).href, {waitUntil:'load'});
  await page.evaluate(() => document.fonts.ready);
  const inspect = () => page.evaluate(() => {
    const math = [...document.querySelectorAll('.math')];
    const images = [...document.images];
    const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
    const links = [...document.querySelectorAll('svg a')].map(el => el.getAttribute('href') || el.getAttribute('xlink:href'));
    return {
      math:math.length, frames:document.querySelectorAll('body > blockquote').length,
      mathErrors:document.querySelectorAll('mjx-merror,merror,[data-mml-node="merror"],.MathJax_Error').length,
      unrenderedMath:math.filter(el => !el.querySelector('svg') || !el.getBoundingClientRect().height).map(el => el.dataset.tex),
      unknownGlyphs:[...document.querySelectorAll('[data-mml-node="mtext"] text')].map(el => el.textContent).filter(s => /\\[A-Za-z]+/.test(s)),
      images:images.length, brokenImages:images.filter(el => !el.complete || !el.naturalWidth).map(el => el.alt),
      unresolvedReferences:links.filter(link => link?.startsWith('#') && !document.getElementById(decodeURIComponent(link.slice(1)))),
      duplicateIds:ids.filter((id,i) => ids.indexOf(id) !== i),
      strayTex:document.body.innerText.match(/\\(?:begin|end|systeme|tikz|colrow|DoTikzmark|onslide|ensuremath|frac|eqref)\b/g) || [],
      horizontalOverflow:document.documentElement.scrollWidth > window.innerWidth + 1,
      contentText:document.body.innerText,
    };
  });
  const desktop = await inspect();
  assert.equal(desktop.math, build.mathCount);
  assert.equal(desktop.frames, build.frames);
  assert.equal(desktop.images, build.images.filter(image => image.kind === 'embedded').length);
  for (const key of ['unrenderedMath','unknownGlyphs','brokenImages','unresolvedReferences','duplicateIds','strayTex']) assert.deepEqual(desktop[key], [], key);
  assert.equal(desktop.mathErrors, 0);
  assert.equal(desktop.horizontalOverflow, false, 'desktop page overflows horizontally');
  assert.deepEqual(errors, []);
  assert.deepEqual(network, [], 'HTML requested a network resource');
  const frames = page.locator('body > blockquote');
  const selected = [
    ['systems', frames.filter({hasText:'with the true solution equal to'}).first()],
    ['elimination', frames.filter({hasText:'Gaussian Elimination — Example'}).first()],
    ['highlighted-matrix', frames.filter({hasText:'The Algorithm: Elimination Phase'}).first()],
    ['equation-references', frames.filter({hasText:'Take norm of equation'}).first()],
  ];
  for (const [name, locator] of selected) {
    if (await locator.count()) await locator.screenshot({path:path.join(directory, name + '.png')});
  }
  await page.setViewportSize({width:390,height:844});
  const mobile = await inspect();
  assert.equal(mobile.horizontalOverflow, false, 'mobile page overflows horizontally');
  assert.deepEqual(mobile.unrenderedMath, []);
  const summary = {status:'passed', outputSha256, browser:await browser.version(), offline:true, desktop:{...desktop,contentText:undefined}, mobile:{width:390, horizontalOverflow:mobile.horizontalOverflow}, consoleErrors:errors, networkRequests:network};
  fs.writeFileSync(path.join(directory, 'browser-report.json'), JSON.stringify(summary,null,2));
  console.log(JSON.stringify(summary,null,2));
} finally {await browser.close();}
