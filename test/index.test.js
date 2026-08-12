'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var path = require('node:path');
var index = require('../src/index');

var FIXTURE = path.join(__dirname, 'fixtures', 'firestore.rules');

test('auditFiles reads a real file and returns findings tagged with its path', function () {
  var result = index.auditFiles([FIXTURE]);
  assert.deepEqual(result.files, [FIXTURE]);
  assert.ok(result.findings.length >= 4);
  assert.ok(result.findings.every(function (f) { return f.file === FIXTURE; }));
});

test('auditFiles produces the expected rule mix for the fixture', function () {
  var result = index.auditFiles([FIXTURE]);
  var rules = result.findings.map(function (f) { return f.rule; }).sort();
  assert.deepEqual(rules, [
    'always-true-condition',
    'missing-auth-check',
    'recursive-wildcard-match',
    'unconditional-allow',
  ]);
});

test('resolveFiles returns explicit paths unchanged', function () {
  assert.deepEqual(index.resolveFiles(['a.rules', 'b.rules']), ['a.rules', 'b.rules']);
});

test('resolveFiles falls back to default filenames present in cwd', function () {
  var originalCwd = process.cwd();
  try {
    process.chdir(path.join(__dirname, 'fixtures'));
    assert.deepEqual(index.resolveFiles([]), ['firestore.rules']);
  } finally {
    process.chdir(originalCwd);
  }
});

test('resolveFiles returns an empty list when no defaults exist in cwd', function () {
  var originalCwd = process.cwd();
  try {
    process.chdir(__dirname);
    assert.deepEqual(index.resolveFiles([]), []);
  } finally {
    process.chdir(originalCwd);
  }
});
