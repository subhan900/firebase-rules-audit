'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var parser = require('../src/parser');

test('parses nested match blocks with full paths', function () {
  var source = [
    'service cloud.firestore {',
    '  match /databases/{database}/documents {',
    '    match /users/{userId} {',
    '      allow read, write: if request.auth != null && request.auth.uid == userId;',
    '    }',
    '  }',
    '}',
  ].join('\n');

  var result = parser.parseRules(source);
  assert.equal(result.matches.length, 2);

  var usersMatch = result.matches[1];
  assert.equal(usersMatch.path, '/databases/{database}/documents/users/{userId}');
  assert.equal(usersMatch.allows.length, 1);
  assert.deepEqual(usersMatch.allows[0].methods, ['read', 'write']);
  assert.equal(usersMatch.allows[0].condition, 'request.auth != null && request.auth.uid == userId');
});

test('treats an allow with no condition as condition: null', function () {
  var source = 'match /public/{docId} { allow read; }';
  var result = parser.parseRules(source);
  assert.equal(result.matches[0].allows[0].condition, null);
});

test('preserves recursive wildcard path params', function () {
  var source = 'match /files/{allPaths=**} { allow read: if request.auth != null; }';
  var result = parser.parseRules(source);
  assert.equal(result.matches[0].path, '/files/{allPaths=**}');
});

test('strips line and block comments before parsing', function () {
  var source = [
    '// top level comment',
    'match /docs/{docId} {',
    '  /* block comment with { and } inside */',
    '  allow read: if true; // trailing comment',
    '}',
  ].join('\n');
  var result = parser.parseRules(source);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].allows[0].condition, 'true');
});

test('records 1-based line numbers for allow statements', function () {
  var source = [
    'match /docs/{docId} {',
    '  allow read: if true;',
    '}',
  ].join('\n');
  var result = parser.parseRules(source);
  assert.equal(result.matches[0].allows[0].line, 2);
});
