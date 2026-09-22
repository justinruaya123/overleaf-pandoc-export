import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const toolDirectory = fileURLToPath(new URL('..', import.meta.url));
const launcher = path.join(toolDirectory, 'convert.cmd');

test('Windows launcher accepts a nested lecture path from a different working directory', {skip:process.platform !== 'win32'}, () => {
  assert.ok(fs.existsSync(launcher), 'convert.cmd must exist');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'export launcher '));
  fs.mkdirSync(path.join(directory,'L1'));
  const input = path.join(directory,'L1','L1-main.tex');
  const source = String.raw`\documentclass{article}\begin{document}A system:\systeme{x+y=3,x-y=1}\end{document}`;
  fs.writeFileSync(input,source);
  const result = spawnSync('cmd.exe', ['/d','/s','/c', `""${launcher}" "L1\\L1-main.tex""`], {cwd:directory,encoding:'utf8',windowsHide:true,windowsVerbatimArguments:true});
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
  assert.ok(fs.existsSync(path.join(directory,'L1','build','L1-main.html')));
  assert.equal(fs.readFileSync(input,'utf8'),source);
});

test('Windows launcher forwards output paths with spaces and failing exit codes', {skip:process.platform !== 'win32'}, () => {
  assert.ok(fs.existsSync(launcher), 'convert.cmd must exist');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'export output '));
  const source = path.join(directory,'input file.tex');
  fs.writeFileSync(source,String.raw`\documentclass{article}\begin{document}$x$\end{document}`);
  const run = args => spawnSync('cmd.exe', ['/d','/s','/c', `""${launcher}" ${args}"`], {cwd:directory,encoding:'utf8',windowsHide:true,windowsVerbatimArguments:true});
  const good = run('"input file.tex" --output "custom folder\\result.html"');
  assert.equal(good.status,0,good.stdout+'\n'+good.stderr);
  assert.ok(fs.existsSync(path.join(directory,'custom folder','result.html')));
  const bad = run('"missing.tex"');
  assert.notEqual(bad.status,0);
});
