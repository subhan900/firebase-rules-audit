'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var parser = require('../src/parser');
var checks = require('../src/checks');

function findingsFor(source) {
  var parsed = parser.parseRules(source);
  return checks.runChecks(parsed.matches);
}

test('flags an allow with no condition as unconditional-allow/high', function () {
  var findings = findingsFor('match /public/{docId} { allow read; }');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, 'unconditional-allow');
  assert.equal(findings[0].severity, 'high');
});

test('flags "if true" as always-true-condition/high', function () {
  var findings = findingsFor('match /admin/{docId} { allow write: if true; }');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, 'always-true-condition');
  assert.equal(findings[0].severity, 'high');
});

test('flags a condition without request.auth as missing-auth-check/medium', function () {
  var findings = findingsFor('match /logs/{docId} { allow read: if resource.data.public == true; }');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, 'missing-auth-check');
  assert.equal(findings[0].severity, 'medium');
});

test('does not flag a condition that references request.auth', function () {
  var findings = findingsFor('match /users/{userId} { allow read: if request.auth != null; }');
  assert.equal(findings.length, 0);
});

test('flags recursive wildcard matches as low severity, once per allow', function () {
  var findings = findingsFor('match /files/{allPaths=**} { allow read, write: if request.auth != null; }');
  var wildcardFindings = findings.filter(function (f) { return f.rule === 'recursive-wildcard-match'; });
  assert.equal(wildcardFindings.length, 1);
  assert.equal(wildcardFindings[0].severity, 'low');
});

test('sorts findings high to low severity', function () {
  var source = [
    'match /a/{id} { allow read: if resource.data.public == true; }',
    'match /b/{id} { allow write; }',
    'match /c/{id} { allow write: if true; }',
  ].join('\n');
  var findings = findingsFor(source);
  var severities = findings.map(function (f) { return f.severity; });
  assert.deepEqual(severities, ['high', 'high', 'medium']);
});
