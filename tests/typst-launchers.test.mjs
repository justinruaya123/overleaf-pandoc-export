import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const repo = fileURLToPath(new URL('..', import.meta.url));
const windows = {skip:process.platform !== 'win32'};

function fixture(t, {dependencies = true} = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'typst launchers '));
  t.after(() => fs.rmSync(directory, {recursive:true, force:true}));
  const exporter = path.join(directory, 'exporter tools');
  const caller = path.join(directory, 'lecture project');
  const bin = path.join(directory, 'fake commands');
  for (const dir of [exporter, caller, bin]) fs.mkdirSync(dir);
  for (const file of ['convert-typst.cmd', 'setup-typst.cmd', 'setup-typst.ps1']) {
    fs.copyFileSync(path.join(repo, file), path.join(exporter, file));
  }
  if (dependencies) {
    const dependency = path.join(exporter, 'node_modules', '@xmldom', 'xmldom');
    fs.mkdirSync(dependency, {recursive:true});
    fs.writeFileSync(path.join(dependency, 'package.json'), '{}');
  }
  const exportLog = path.join(directory, 'export.json');
  const npmLog = path.join(directory, 'npm.json');
  const checkLog = path.join(directory, 'check.json');
  const stub = (log, status) => `import fs from 'node:fs';\nfs.writeFileSync(process.env.${log}, JSON.stringify({args:process.argv.slice(2),cwd:process.cwd()}));\nprocess.exit(Number(process.env.${status} || 0));\n`;
  fs.writeFileSync(path.join(exporter, 'export-typst.mjs'), stub('TYPST_EXPORT_LOG', 'TYPST_EXPORT_STATUS'));
  fs.writeFileSync(path.join(exporter, 'check-typst-setup.mjs'), stub('TYPST_CHECK_LOG', 'TYPST_CHECK_STATUS'));
  const npmStub = path.join(bin, 'npm-stub.mjs');
  fs.writeFileSync(npmStub, stub('TYPST_NPM_LOG', 'TYPST_NPM_STATUS'));
  fs.writeFileSync(path.join(bin, 'npm.cmd'), `@echo off\r\n"${process.execPath}" "${npmStub}" %*\r\nexit /b %errorlevel%\r\n`);
  const env = {...process.env, TYPST_EXPORT_LOG:exportLog, TYPST_NPM_LOG:npmLog, TYPST_CHECK_LOG:checkLog};
  const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path') || 'PATH';
  env[pathKey] = [bin, path.dirname(process.execPath), env[pathKey] || ''].join(path.delimiter);
  return {exporter, caller, env, exportLog, npmLog, checkLog};
}

function launch(f, name, args = [], overrides = {}) {
  const launcher = path.join(f.exporter, name);
  const quoted = args.map(arg => `"${arg}"`).join(' ');
  return spawnSync('cmd.exe', ['/d', '/s', '/c', `""${launcher}" ${quoted}"`], {
    cwd:f.caller,
    env:{...f.env, ...overrides},
    windowsVerbatimArguments:true,
    windowsHide:true,
    encoding:'utf8',
    timeout:30000,
  });
}

function readLog(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function output(result) { return `${result.stdout || ''}\n${result.stderr || ''}`; }

test('Typst converter preserves the caller directory and forwards quoted paths and repeated font arguments', windows, t => {
  const f = fixture(t);
  const args = ['lectures\\a lecture.typ', '--root', '.', '--output', 'exports\\lecture notes.html',
    '--typst', 'C:\\Typst tools\\typst.exe', '--font-path', 'C:\\Lecture fonts',
    '--font-path', 'extra fonts', '--profile', 'native'];
  const result = launch(f, 'convert-typst.cmd', args);
  assert.equal(result.status, 0, output(result));
  assert.deepEqual(readLog(f.exportLog), {args, cwd:f.caller});
});

test('Typst converter propagates an exporter failure code', windows, t => {
  const f = fixture(t);
  const result = launch(f, 'convert-typst.cmd', ['lecture.typ'], {TYPST_EXPORT_STATUS:'17'});
  assert.equal(result.status, 17, output(result));
  assert.deepEqual(readLog(f.exportLog).args, ['lecture.typ']);
});

test('Typst converter gives the setup command when dependencies are missing', windows, t => {
  const f = fixture(t, {dependencies:false});
  const result = launch(f, 'convert-typst.cmd', ['lecture.typ']);
  assert.equal(result.status, 1, output(result));
  assert.match(output(result), /setup-typst\.cmd/);
  assert.equal(fs.existsSync(f.exportLog), false);
});

test('Typst setup installs locked local dependencies before checking the selected compiler', windows, t => {
  const f = fixture(t);
  const compiler = 'C:\\Typst tools\\typst.exe';
  const result = launch(f, 'setup-typst.cmd', ['-Offline', '-Typst', compiler]);
  assert.equal(result.status, 0, output(result));
  assert.deepEqual(readLog(f.npmLog), {
    args:['ci', '--prefix', f.exporter, '--cache', path.join(f.exporter, '.npm-cache'),
      '--no-audit', '--no-fund', '--prefer-offline', '--offline'],
    cwd:f.caller,
  });
  assert.deepEqual(readLog(f.checkLog), {args:['--typst', compiler], cwd:f.caller});
  assert.match(output(result), /Setup complete/);
});

test('Typst setup stops before its smoke check if npm ci fails', windows, t => {
  const f = fixture(t);
  const result = launch(f, 'setup-typst.cmd', [], {TYPST_NPM_STATUS:'23'});
  assert.equal(result.status, 1, output(result));
  assert.equal(fs.existsSync(f.npmLog), true);
  assert.equal(fs.existsSync(f.checkLog), false);
  assert.match(output(result), /Dependency installation failed/);
  assert.doesNotMatch(output(result), /Setup complete/);
});

test('Typst setup fails when the real-check boundary reports an export failure', windows, t => {
  const f = fixture(t);
  const result = launch(f, 'setup-typst.cmd', [], {TYPST_CHECK_STATUS:'29'});
  assert.equal(result.status, 1, output(result));
  assert.deepEqual(readLog(f.checkLog), {args:[], cwd:f.caller});
  assert.match(output(result), /Typst export check failed/);
  assert.doesNotMatch(output(result), /Setup complete/);
});
