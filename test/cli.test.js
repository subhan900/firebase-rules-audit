'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var path = require('node:path');
var childProcess = require('node:child_process');

var CLI = path.join(__dirname, '..', 'bin', 'firebase-rules-audit.js');
var FIXTURE = path.join(__dirname, 'fixtures', 'firestore.rules');

function run(args) {
  var result = childProcess.spawnSync(process.execPath, [CLI].concat(args), { encoding: 'utf8' });
  return result;
}

test('exits 2 and prints findings when high-severity issues exist', function () {
  var result = run([FIXTURE]);
  assert.equal(result.status, 2);
  assert.match(result.stdout, /HIGH/);
});

test('--json emits parseable JSON with a matching summary', function () {
  var result = run([FIXTURE, '--json']);
  var parsed = JSON.parse(result.stdout);
  assert.equal(parsed.summary.total, parsed.findings.length);
  assert.ok(parsed.summary.high >= 1);
});

test('--md emits a markdown report', function () {
  var result = run([FIXTURE, '--md']);
  assert.match(result.stdout, /# Firebase Rules Audit Report/);
});

test('exits 0 with no findings for a clean rules file', function () {
  var tmp = path.join(__dirname, 'fixtures', 'clean.rules');
  require('node:fs').writeFileSync(tmp, "match /users/{userId} { allow read, write: if request.auth != null && request.auth.uid == userId; }");
  try {
    var result = run([tmp]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /No issues found\./);
  } finally {
    require('node:fs').unlinkSync(tmp);
  }
});

test('exits 1 with an error for a missing file', function () {
  var result = run(['does-not-exist.rules']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not found/);
});

test('exits 1 with an error when no files are given and no defaults exist', function () {
  var result = childProcess.spawnSync(process.execPath, [CLI], { encoding: 'utf8', cwd: __dirname });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /No rules files found/);
});

test('--help prints usage and exits 0', function () {
  var result = run(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: firebase-rules-audit/);
});
