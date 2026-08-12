'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var index = require('../src/index');
var report = require('../src/report');

var SAMPLE_SOURCE = [
  'match /public/{docId} { allow read; }',
  'match /admin/{docId} { allow write: if true; }',
].join('\n');

function sampleResult() {
  var findings = index.auditSource(SAMPLE_SOURCE, 'firestore.rules');
  return { files: ['firestore.rules'], findings: findings };
}

test('toJSON produces valid JSON with a correct summary', function () {
  var result = sampleResult();
  var parsed = JSON.parse(report.toJSON(result));
  assert.equal(parsed.summary.total, 2);
  assert.equal(parsed.summary.high, 2);
  assert.equal(parsed.findings.length, 2);
});

test('toMarkdown includes a findings table with file and severity counts', function () {
  var result = sampleResult();
  var md = report.toMarkdown(result);
  assert.match(md, /Severity/);
  assert.match(md, /firestore\.rules/);
  assert.match(md, /High: 2/);
});

test('toMarkdown reports "No findings." for a clean result', function () {
  var md = report.toMarkdown({ files: ['firestore.rules'], findings: [] });
  assert.match(md, /No findings\./);
});

test('toConsole without color omits ANSI escape codes but keeps labels', function () {
  var result = sampleResult();
  var text = report.toConsole(result, { color: false });
  var escChar = String.fromCharCode(27);
  assert.equal(text.indexOf(escChar), -1);
  assert.notEqual(text.indexOf('HIGH'), -1);
  assert.match(text, /2 high, 0 medium, 0 low/);
});

test('toConsole with color includes ANSI escape codes', function () {
  var result = sampleResult();
  var text = report.toConsole(result, { color: true });
  var escChar = String.fromCharCode(27);
  assert.notEqual(text.indexOf(escChar), -1);
});

test('summarize counts each severity bucket', function () {
  var summary = report.summarize([
    { severity: 'high' },
    { severity: 'high' },
    { severity: 'medium' },
    { severity: 'low' },
  ]);
  assert.deepEqual(summary, { total: 4, high: 2, medium: 1, low: 1 });
});
