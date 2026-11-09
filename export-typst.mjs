#!/usr/bin/env node
/** Typst -> semantic, self-contained HTML. Original sources are never rewritten. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {DOMParser, XMLSerializer} from '@xmldom/xmldom';
import * as cssTree from 'css-tree';

const ASSETS = fileURLToPath(new URL('typst/', import.meta.url));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const slash = value => value.replaceAll('\\', '/');
const within = (root, file) => {
  const relative = path.relative(root, file);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
};
const MIME = {'.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.webp':'image/webp', '.svg':'image/svg+xml', '.avif':'image/avif'};

function run(command, args, cwd, {input, program = 'Typst'} = {}) {
  const result = spawnSync(command, args, {cwd, input, encoding:'utf8', windowsHide:true, maxBuffer:64 * 1024 * 1024, timeout:300000});
  if (result.error) throw new Error(`Could not start ${program} executable "${command}": ${result.error.message}. Install ${program === 'Typst' ? 'Typst 0.15+' : 'Pandoc'} or pass --${program.toLowerCase()} PATH.`);
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || `${program} exited with code ${result.status}`).trim());
  return result;
}

function projectRoot(input, requested) {
  if (requested) return fs.realpathSync(path.resolve(requested));
  for (let candidate = path.dirname(input); ; candidate = path.dirname(candidate)) {
    if (fs.existsSync(path.join(candidate, 'scl-beamer', 'lib.typ'))) return candidate;
    if (path.dirname(candidate) === candidate) break;
  }
  return path.dirname(input);
}

function stageProject(root, destination, omitted, inventory) {
  for (const entry of fs.readdirSync(root, {withFileTypes:true})) {
    const source = path.join(root, entry.name);
    if (omitted.has(source) || ['.git', 'node_modules', '.npm-cache', '.setup-check', 'build'].includes(entry.name) || entry.name.endsWith('.export')) continue;
    if (entry.name === '.typst-html') throw new Error('The project uses reserved path .typst-html; rename it before exporting.');
    if (entry.isSymbolicLink()) throw new Error(`Project contains a symbolic link: ${source}. Use ordinary files within --root.`);
    const target = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(target, {recursive:true});
      stageProject(source, target, omitted, inventory);
    } else if (entry.isFile()) {
      const bytes = fs.readFileSync(source);
      fs.writeFileSync(target, bytes);
      inventory.push({file:source, sha256:hash(bytes)});
    }
  }
}

function installAdapter(stage, profile) {
  const directory = path.join(stage, '.typst-html');
  fs.mkdirSync(directory);
  fs.cpSync(ASSETS, directory, {recursive:true});
  if (profile === 'scl') {
    const replacements = {
      'scl-beamer/lib.typ': '*',
      'scl-beamer/components/equations.typ': 'eq-alt, equation-lines',
      'scl-beamer/components/overlays.typ': 'pauses, mathpause, mathpauses',
    };
    for (const [name, imports] of Object.entries(replacements)) {
      const target = path.join(stage, name);
      if (!fs.existsSync(target)) throw new Error(`SCL adapter requires ${name}.`);
      fs.writeFileSync(target, `#import "/.typst-html/scl-html.typ": ${imports}\n`);
    }
    if (fs.existsSync(path.join(stage, 'scl-beamer', 'components', 'branding.typ'))) {
      fs.appendFileSync(path.join(stage, 'scl-beamer', 'lib.typ'), '#import "components/branding.typ": *\n');
    }
  }
}

function elements(node) {
  const result = [];
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 1) result.push(child, ...elements(child));
  }
  return result;
}

function parseHtml(html) {
  const errors = [];
  const document = new DOMParser({onError:(level, message) => {
    if (level !== 'warning') errors.push(message);
  }}).parseFromString(html, 'text/html');
  if (errors.length) throw new Error(`Invalid compiler HTML: ${errors.join('; ')}`);
  return document;
}

function namespaceSvg(svg, prefix) {
  const nodes = [svg, ...elements(svg)];
  const ids = new Map(nodes.filter(node => node.hasAttribute('id')).map(node => [node.getAttribute('id'), prefix + node.getAttribute('id')]));
  for (const node of nodes) {
    if (node.hasAttribute('id')) node.setAttribute('id', ids.get(node.getAttribute('id')));
    for (const attribute of Array.from(node.attributes)) {
      let value = attribute.value;
      if (['href', 'xlink:href'].includes(attribute.name) && value.startsWith('#') && ids.has(value.slice(1))) value = '#' + ids.get(value.slice(1));
      value = value.replace(/url\(\s*["']?#([^\s)"']+)["']?\s*\)/g, (match, id) => ids.has(id) ? `url(#${ids.get(id)})` : match);
      if (value !== attribute.value) node.setAttribute(attribute.name, value);
    }
    if (node.localName.toLowerCase() === 'style') {
      const stylesheet = cssTree.parse(node.textContent, {
        parseCustomProperty:true,
        onParseError:error => { throw new Error(`Unsupported SVG stylesheet: ${error.message}`); },
      });
      cssTree.walk(stylesheet, rule => {
        if (rule.type === 'Url' && rule.value.startsWith('#') && ids.has(rule.value.slice(1))) {
          rule.value = '#' + ids.get(rule.value.slice(1));
        } else if (rule.type === 'IdSelector') {
          const id = cssTree.ident.decode(rule.name);
          if (ids.has(id)) rule.name = cssTree.ident.encode(ids.get(id));
        } else if (rule.type === 'AttributeSelector' && cssTree.ident.decode(rule.name.name) === 'id' && rule.matcher === '=') {
          const id = rule.value.type === 'String' ? rule.value.value : cssTree.ident.decode(rule.value.name);
          if (ids.has(id)) rule.value = {type:'String', loc:null, value:ids.get(id)};
        }
      });
      node.textContent = cssTree.generate(stylesheet);
    }
  }
}

function localImage(source, rawFile, stage) {
  if (/^data:image\/(?:png|jpeg|gif|webp|svg\+xml|avif)[;,]/i.test(source)) return source;
  if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(source)) throw new Error(`Remote or unsupported image in offline output: ${source}`);
  let decoded;
  try { decoded = decodeURIComponent(source); } catch { throw new Error(`Invalid image path: ${source}`); }
  const file = path.resolve(path.dirname(rawFile), decoded);
  if (!within(stage, file) || !fs.existsSync(file)) throw new Error(`Image is missing or outside the project: ${source}`);
  const mime = MIME[path.extname(file).toLowerCase()];
  if (!mime) throw new Error(`Unsupported image type: ${source}`);
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

function validateCss(css) {
  if (/@import\b/i.test(css)) throw new Error('External CSS imports are not supported in offline output.');
  for (const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi)) {
    const value = (match[1] ?? match[2] ?? match[3]).trim();
    if (!value.startsWith('#') && !value.startsWith('data:')) throw new Error('External CSS resource is not supported in offline output.');
  }
}

function validateSvgImages(document) {
  for (const node of elements(document)) {
    const tag = node.localName.toLowerCase();
    if (['script', 'foreignobject', 'iframe', 'object', 'embed'].includes(tag)) throw new Error(`Active content is not supported in offline graphics: ${tag}`);
    for (const attribute of Array.from(node.attributes)) {
      if (/^on/i.test(attribute.name)) throw new Error('Event handlers are not supported in offline graphics.');
      validateCss(attribute.value);
      if (/^(?:xlink:)?href$/i.test(attribute.name) && tag !== 'a') {
        const source = attribute.value.trim();
        const embeddedImage = ['image', 'feimage'].includes(tag) && /^data:image\//i.test(source);
        if (!source.startsWith('#') && !embeddedImage) throw new Error(`SVG ${tag} contains a non-local resource.`);
      }
    }
    if (tag === 'style') validateCss(node.textContent);
  }
}

function writeReport(directory, report) {
  const temporary = path.join(directory, `.report.${crypto.randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temporary, JSON.stringify(report, null, 2) + '\n', {flag:'wx'});
    // Rename replaces a symlink/hardlink itself without changing its target.
    fs.renameSync(temporary, path.join(directory, 'report.json'));
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

const hasClass = (node, name) => (node.getAttribute('class') || '').split(/\s+/).includes(name);

function prepareHandout(document, report) {
  const source = elements(document).find(node => hasClass(node, 'handout-source'));
  if (!source) return;
  const audience = source.getAttribute('data-handout-mode');
  report.handout = audience;
  report.annotations = source.getAttribute('data-annotations') === 'true';
  report.extensions = source.getAttribute('data-extensions') === 'true';
  source.setAttribute('class', `handout handout-${audience}`);
  const slides = elements(source).filter(node => hasClass(node, 'slide'));
  const notes = slides.map(slide => {
    const note = elements(slide).find(node => hasClass(node, 'lecturer-notes'));
    if (note) note.parentNode.removeChild(note);
    return note;
  });
  report.handoutPages = slides.length;
  if (audience === 'students') return;
  if (audience !== 'lecturer') throw new Error('Handout audience must be lecturer or students.');
  const originals = slides.map(slide => slide.cloneNode(true));
  const panel = (classes, label, content) => {
    const node = document.createElement('div');
    node.setAttribute('class', classes);
    const heading = document.createElement('div');
    heading.setAttribute('class', 'handout-panel-label');
    heading.appendChild(document.createTextNode(label));
    node.appendChild(heading);
    if (content) node.appendChild(content);
    return node;
  };
  slides.forEach((slide, index) => {
    const page = document.createElement('section');
    page.setAttribute('class', 'handout-page');
    page.setAttribute('data-page', String(index + 1));
    slide.parentNode.insertBefore(page, slide);
    page.appendChild(panel('handout-current', `Current page · ${index + 1}`, slide));
    page.appendChild(panel('handout-notes handout-current-notes', 'Professor notes', notes[index]));
    if (index + 1 < slides.length) {
      // The next panel comes from the same ordered page sequence, including
      // enabled handout-only pages. Copy IDs are separate from their originals.
      const next = originals[index + 1].cloneNode(true);
      namespaceSvg(next, `next-${index + 1}-`);
      next.setAttribute('data-handout-copy', 'true');
      const nextNotes = notes[index + 1]?.cloneNode(true);
      if (nextNotes) namespaceSvg(nextNotes, `next-${index + 1}-`);
      page.appendChild(panel('handout-next', `Next page · ${index + 2}`, next));
      page.appendChild(panel('handout-notes handout-next-notes', 'Next page notes', nextNotes));
    }
  });
}

function pandocHandout(document, stage, report, options) {
  const requested = options.pandoc || process.env.PANDOC || 'pandoc';
  const pandoc = /[\\/]/.test(requested) || fs.existsSync(requested) ? path.resolve(requested) : requested;
  report.pandoc = run(pandoc, ['--version'], stage, {program:'Pandoc'}).stdout.split(/\r?\n/)[0];
  const serializer = new XMLSerializer();
  const graphics = new Map();
  for (const node of elements(document)) {
    // Pandoc paragraphs have no attribute field. Keep their existing styling
    // and anchors on a surrounding Div while Pandoc handles the prose inside.
    if (node.localName === 'p' && node.attributes.length) {
      const wrapper = document.createElement('div');
      for (const attribute of Array.from(node.attributes)) {
        wrapper.setAttribute(attribute.name, attribute.value);
        node.removeAttribute(attribute.name);
      }
      node.parentNode.insertBefore(wrapper, node);
      wrapper.appendChild(node);
    }
    if (node.localName !== 'svg') continue;
    let parent = node.parentNode;
    while (parent && parent.localName !== 'svg') parent = parent.parentNode;
    if (parent) continue;
    const key = String(graphics.size);
    graphics.set(key, serializer.serializeToString(node));
    const placeholder = document.createElement('span');
    placeholder.setAttribute('data-typst-graphic', key);
    placeholder.appendChild(document.createTextNode('Typst graphic'));
    node.parentNode.replaceChild(placeholder, node);
  }
  const ast = JSON.parse(run(pandoc, ['--from=html+raw_html-auto_identifiers', '--to=json'], stage, {
    program:'Pandoc', input:serializer.serializeToString(document),
  }).stdout);
  let restored = 0;
  function restoreGraphics(value) {
    if (Array.isArray(value)) return value.map(restoreGraphics);
    if (!value || typeof value !== 'object') return value;
    if (value.t === 'Span') {
      const key = value.c[0][2].find(([name]) => name === 'typst-graphic')?.[1];
      if (key !== undefined && graphics.has(key)) {
        restored++;
        return {t:'RawInline', c:['html', graphics.get(key)]};
      }
    }
    for (const key of Object.keys(value)) value[key] = restoreGraphics(value[key]);
    return value;
  }
  restoreGraphics(ast);
  if (restored !== graphics.size) throw new Error('Pandoc did not preserve all Typst graphics.');
  const head = elements(document).find(node => node.localName === 'head');
  const title = elements(head).find(node => node.localName === 'title')?.textContent || path.basename(report.input, '.typ');
  const styles = elements(head).filter(node => node.localName === 'style').map(node => serializer.serializeToString(node)).join('\n');
  ast.meta.pagetitle = {t:'MetaString', c:title};
  ast.meta.lang = {t:'MetaString', c:document.documentElement.getAttribute('lang') || 'en'};
  ast.meta['handout-mode'] = {t:'MetaString', c:report.handout};
  ast.meta['header-includes'] = {t:'MetaBlocks', c:[{t:'RawBlock', c:['html', styles]}]};
  const template = path.join(stage, '.typst-html', 'handout.html');
  fs.writeFileSync(template, `<!DOCTYPE html>
<html lang="$lang$">
<head>
<meta charset="utf-8" />
<meta name="generator" content="pandoc" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>$pagetitle$</title>
$for(header-includes)$$header-includes$$endfor$
</head>
<body class="handout-$handout-mode$">
$body$
</body>
</html>\n`);
  return run(pandoc, ['--from=json', '--to=html5', '--standalone', '--wrap=none', '--template', template], stage, {
    program:'Pandoc', input:JSON.stringify(ast),
  }).stdout;
}

function finishHtml(rawFile, stage, report, options) {
  const document = parseHtml(fs.readFileSync(rawFile, 'utf8'));
  prepareHandout(document, report);
  const nodes = elements(document);
  const head = nodes.find(node => node.localName === 'head');
  const body = nodes.find(node => node.localName === 'body');
  if (!head || !body) throw new Error('Typst did not produce a complete HTML document.');
  if (!body.textContent.trim() && !nodes.some(node => ['svg', 'img'].includes(node.localName))) throw new Error('The input produced an empty document. Choose a lecture entry point instead of an empty main.typ.');
  const style = document.createElement('style');
  style.appendChild(document.createTextNode(fs.readFileSync(path.join(ASSETS, 'style.css'), 'utf8')));
  head.appendChild(style);
  const viewport = document.createElement('meta');
  viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
  head.appendChild(viewport);
  document.documentElement.setAttribute('lang', document.documentElement.getAttribute('lang') || 'en');
  let svgIndex = 0;
  for (const node of nodes) {
    const tag = node.localName.toLowerCase();
    if (['script', 'iframe', 'object', 'embed', 'audio', 'video', 'source', 'link'].includes(tag)) throw new Error(`Unsupported external/active HTML element: ${tag}`);
    if (tag === 'style') validateCss(node.textContent);
    if (node.hasAttribute('style')) validateCss(node.getAttribute('style'));
    if (node.hasAttribute('src') && tag !== 'img') throw new Error(`Unsupported HTML resource: ${tag}`);
    if (node.hasAttribute('srcset')) throw new Error('Image srcset is not supported in offline output.');
    for (const attribute of Array.from(node.attributes)) {
      if (/^on/i.test(attribute.name)) throw new Error(`HTML event handlers are not supported: ${attribute.name}`);
    }
    if (tag === 'img') {
      const data = localImage(node.getAttribute('src'), rawFile, stage);
      node.setAttribute('src', data);
      if (data.startsWith('data:image/svg+xml')) {
        const comma = data.indexOf(',');
        const svgText = data.slice(0, comma).includes(';base64') ? Buffer.from(data.slice(comma + 1), 'base64').toString('utf8') : decodeURIComponent(data.slice(comma + 1));
        validateSvgImages(parseHtml(svgText));
      }
      report.images++;
    }
    if (tag === 'svg') {
      let parent = node.parentNode, nested = false;
      while (parent && parent.nodeType === 1) { if (parent.localName === 'svg') nested = true; parent = parent.parentNode; }
      if (!nested) { namespaceSvg(node, `svg-${++svgIndex}-`); validateSvgImages(node); }
    }
    if (tag === 'table') {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('class', 'table-scroll');
      node.parentNode.insertBefore(wrapper, node);
      wrapper.appendChild(node);
    }
    const classes = (node.getAttribute('class') || '').split(/\s+/);
    if (classes.includes('slide') && !node.hasAttribute('data-handout-copy')) report.frames++;
    if (classes.includes('typst-math')) report.mathCount++;
  }
  report.svgCount = svgIndex;
  const ids = new Set();
  for (const node of elements(document)) {
    const id = node.getAttribute('id');
    if (id) { if (ids.has(id)) throw new Error(`Duplicate HTML/SVG identifier: ${id}`); ids.add(id); }
  }
  return report.handout ? pandocHandout(document, stage, report, options) : new XMLSerializer().serializeToString(document);
}

/** Build one .typ entry point. Paths in options are relative to the caller. */
export function build(input, options = {}) {
  if (options.handout !== undefined && !['off', 'lecturer', 'students'].includes(options.handout)) {
    throw new Error('--handout must be off, lecturer or students.');
  }
  for (const key of ['annotations', 'extensions']) {
    if (options[key] !== undefined && ![true, false, 'true', 'false'].includes(options[key])) {
      throw new Error(`--${key} must be true or false.`);
    }
  }
  input = fs.realpathSync(path.resolve(input));
  if (path.extname(input).toLowerCase() !== '.typ') throw new Error('Supply a .typ file.');
  const root = projectRoot(input, options.root);
  if (!within(root, input)) throw new Error('Input must be inside --root.');
  const output = path.resolve(options.output || path.join(path.dirname(input), 'build', path.basename(input, '.typ') + '.html'));
  if (path.extname(output).toLowerCase() !== '.html' || output === input) throw new Error('Output must be a .html file and cannot overwrite source.');
  if (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink()) throw new Error('Output cannot be a symbolic link.');
  const work = output.slice(0, -5) + '.export';
  if (fs.existsSync(work) && fs.lstatSync(work).isSymbolicLink()) throw new Error('Report directory cannot be a symbolic link.');
  const scl = fs.existsSync(path.join(root, 'scl-beamer', 'lib.typ'));
  const profile = options.profile === undefined || options.profile === 'auto' ? (scl ? 'scl' : 'native') : options.profile;
  if (!['scl', 'native'].includes(profile)) throw new Error('--profile must be auto, native or scl.');
  if (profile === 'scl' && !scl) throw new Error('The SCL profile requires scl-beamer/lib.typ under --root.');
  if (options.handout && options.handout !== 'off' && profile !== 'scl') throw new Error('--handout requires an SCL lecture with scl-beamer/lib.typ.');
  const report = {status:'building', input, root, output, profile, frames:0, mathCount:0, svgCount:0, images:0, warnings:[], sources:[]};
  fs.mkdirSync(work, {recursive:true});
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'typst-html-'));
  let temporaryOutput;
  try {
    stageProject(root, stage, new Set([output, work, stage]), report.sources);
    installAdapter(stage, profile);
    const wrapper = path.join(stage, '.typst-html', 'entry.typ');
    fs.writeFileSync(wrapper, '#import "document.typ": export-document\n#show: export-document\n#include ' + JSON.stringify('/' + slash(path.relative(root, input))) + '\n');
    const requestedCompiler = options.typst || process.env.TYPST || 'typst';
    const typst = /[\\/]/.test(requestedCompiler) || fs.existsSync(requestedCompiler)
      ? path.resolve(requestedCompiler) : requestedCompiler;
    report.compiler = run(typst, ['--version'], stage).stdout.trim();
    const version = /typst (\d+)\.(\d+)/i.exec(report.compiler);
    if (!version || Number(version[1]) === 0 && Number(version[2]) < 15) throw new Error(`Typst 0.15 or newer is required; found ${report.compiler}.`);
    const rawFile = path.join(stage, '.typst-html', 'raw.html');
    const args = ['compile', '--features', 'html', '--format', 'html', '--root', stage];
    if (options.handout === 'off') args.push('--input', 'handout=false');
    else if (options.handout) args.push('--input', 'handout=true', '--input', `handout-mode=${options.handout}`);
    for (const key of ['annotations', 'extensions']) {
      if (options[key] !== undefined) args.push('--input', `${key}=${options[key]}`);
    }
    const fonts = options['font-path'] === undefined ? [] : [].concat(options['font-path']);
    if (fs.existsSync(path.join(stage, 'fonts'))) args.push('--font-path', path.join(stage, 'fonts'));
    for (const font of fonts) args.push('--font-path', path.resolve(font));
    const compiled = run(typst, [...args, wrapper, rawFile], stage);
    report.warnings = compiled.stderr.trim() ? [compiled.stderr.trim()] : [];
    if (/not (?:yet )?supported|unsupported|ignored (?:in|during|for) HTML/i.test(compiled.stderr)) throw new Error(`Typst reported unsupported HTML content:\n${compiled.stderr.trim()}`);
    const html = finishHtml(rawFile, stage, report, options);
    for (const source of report.sources) {
      if (hash(fs.readFileSync(source.file)) !== source.sha256) throw new Error(`Source changed during export: ${source.file}. Run the export again.`);
    }
    report.sourceUnchanged = true;
    report.outputSha256 = hash(html);
    report.status = 'ok';
    temporaryOutput = path.join(path.dirname(output), `.${path.basename(output)}.${crypto.randomUUID()}.tmp`);
    fs.writeFileSync(temporaryOutput, html, {flag:'wx'});
    writeReport(work, report);
    fs.renameSync(temporaryOutput, output);
    return report;
  } catch (error) {
    report.status = 'failed'; report.error = error.message;
    try { writeReport(work, report); } catch (reportError) {
      error.message += `\nCould not write export report: ${reportError.message}`;
    }
    error.exportReport = report;
    throw error;
  } finally {
    if (temporaryOutput && fs.existsSync(temporaryOutput)) fs.unlinkSync(temporaryOutput);
    fs.rmSync(stage, {recursive:true, force:true});
  }
}

const HELP = `Usage: node export-typst.mjs INPUT.typ [options]

Export a Typst document or SCL/Touying lecture as self-contained, scrollable HTML.
Requires Typst 0.15+; source files remain unchanged.

  --output FILE       HTML output (default: INPUT_DIR/build/INPUT_NAME.html)
  --root DIR          Typst project root (auto-detects an ancestor SCL project)
  --typst PATH        Typst executable (or set TYPST)
  --font-path DIR     Additional font directory; may be repeated
  --profile PROFILE  auto (default), native, or scl
  --handout AUDIENCE  off, lecturer, or students (default: source settings)
  --pandoc PATH       Pandoc executable, needed only for handouts (or set PANDOC)
  --annotations BOOL Render lecturer notes: true or false (default: source settings)
  --extensions BOOL  Render shared handout additions: true or false (default: source settings)
  --help             Show this help
`;

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const options = {};
    let input;
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i++) {
      const argument = args[i];
      if (argument === '--help' || argument === '-h') { console.log(HELP); process.exit(0); }
      if (argument.startsWith('--')) {
        const key = argument.slice(2);
        if (!['output', 'root', 'typst', 'font-path', 'profile', 'handout', 'pandoc', 'annotations', 'extensions'].includes(key)) throw new Error(`Unknown option: ${argument}`);
        if (i + 1 >= args.length || args[i + 1].startsWith('--')) throw new Error(`${argument} requires a value.`);
        const value = args[++i];
        if (key === 'font-path') (options[key] ||= []).push(value); else options[key] = value;
      } else if (input) throw new Error(`Unexpected argument: ${argument}`);
      else input = argument;
    }
    if (!input) throw new Error('Supply a .typ file. Run with --help for usage.');
    const report = build(input, options);
    for (const warning of report.warnings) console.error(warning);
    console.log(`Exported: ${report.output}\n${report.frames} slides, ${report.mathCount} equations, ${report.images} images, ${report.svgCount} SVG graphics. Source unchanged.`);
  } catch (error) {
    console.error(`Export failed: ${error.message}`);
    process.exitCode = 1;
  }
}
