'use strict';

// Lightweight heuristic parser for Firebase Security Rules files
// (Cloud Firestore and Cloud Storage). This is intentionally NOT a
// full grammar parser for the rules language -- it uses brace-aware
// scanning to extract match blocks and their allow statements well
// enough to run static checks against them.

var OPEN_PLACEHOLDER = '__FRA_OPEN__';
var CLOSE_PLACEHOLDER = '__FRA_CLOSE__';

function isIdentifierChar(ch) {
  var code = ch.charCodeAt(0);
  var isLower = code >= 97 && code <= 122;
  var isUpper = code >= 65 && code <= 90;
  var isDigit = code >= 48 && code <= 57;
  return isLower || isUpper || isDigit || ch === '_';
}

function isNewline(ch) {
  return ch.charCodeAt(0) === 10;
}

function isSpaceChar(ch) {
  var code = ch.charCodeAt(0);
  return code === 32 || code === 9 || code === 10 || code === 13;
}

function blankKeepingNewlines(str) {
  var out = '';
  for (var k = 0; k < str.length; k += 1) {
    out += isNewline(str[k]) ? str[k] : ' ';
  }
  return out;
}

function indexOfNewline(str, from) {
  for (var k = from; k < str.length; k += 1) {
    if (isNewline(str[k])) return k;
  }
  return -1;
}

function stripComments(source) {
  var out = '';
  var i = 0;
  var len = source.length;
  while (i < len) {
    var two = source.slice(i, i + 2);
    if (two === '/*') {
      var end = source.indexOf('*/', i + 2);
      var stop = end === -1 ? len : end + 2;
      out += blankKeepingNewlines(source.slice(i, stop));
      i = stop;
      continue;
    }
    if (two === '//') {
      var lineEnd = indexOfNewline(source, i);
      if (lineEnd === -1) lineEnd = len;
      out += blankKeepingNewlines(source.slice(i, lineEnd));
      i = lineEnd;
      continue;
    }
    out += source[i];
    i += 1;
  }
  return out;
}

function protectPathParams(source) {
  var out = '';
  var i = 0;
  var len = source.length;
  while (i < len) {
    if (source[i] === '{') {
      var j = i + 1;
      while (j < len && source[j] === ' ') j += 1;
      var nameStart = j;
      while (j < len && isIdentifierChar(source[j])) j += 1;
      if (j > nameStart) {
        var name = source.slice(nameStart, j);
        while (j < len && source[j] === ' ') j += 1;
        if (source.slice(j, j + 3) === '=**') {
          name += '=**';
          j += 3;
          while (j < len && source[j] === ' ') j += 1;
        }
        if (j < len && source[j] === '}') {
          out += OPEN_PLACEHOLDER + name + CLOSE_PLACEHOLDER;
          i = j + 1;
          continue;
        }
      }
    }
    out += source[i];
    i += 1;
  }
  return out;
}

function restorePathParams(text) {
  return text.split(OPEN_PLACEHOLDER).join('{').split(CLOSE_PLACEHOLDER).join('}');
}

function buildLineIndex(source) {
  var offsets = [0];
  for (var i = 0; i < source.length; i += 1) {
    if (isNewline(source[i])) offsets.push(i + 1);
  }
  return offsets;
}

function lineForOffset(offsets, index) {
  var low = 0;
  var high = offsets.length - 1;
  while (low < high) {
    var mid = (low + high + 1) >> 1;
    if (offsets[mid] <= index) low = mid;
    else high = mid - 1;
  }
  return low + 1;
}

function joinPath(parentPath, childPath) {
  if (!parentPath) return childPath;
  if (!childPath) return parentPath;
  var left = parentPath.slice(-1) === '/' ? parentPath.slice(0, -1) : parentPath;
  var right = childPath.slice(0, 1) === '/' ? childPath : '/' + childPath;
  return left + right;
}

function startsWithWord(str, word) {
  if (str.slice(0, word.length) !== word) return false;
  var next = str.charAt(word.length);
  if (next === '') return true;
  return !isIdentifierChar(next);
}

function parseRules(source) {
  var withoutComments = stripComments(source);
  var protectedSource = protectPathParams(withoutComments);
  var offsets = buildLineIndex(protectedSource);

var matches = [];
  var stack = [{ type: 'root', path: '', node: null }];
  var pendingHeader = '';
  var headerStart = 0;

function flushAllow() {
  var header = pendingHeader.trim();
  pendingHeader = '';
  if (!startsWithWord(header, 'allow')) return;

  var parent = stack[stack.length - 1];
  if (!parent || parent.type !== 'match') return;

  var rest = header.slice(5).trim();
  var line = lineForOffset(offsets, headerStart);

  var methodsPart = rest;
  var condition = null;
  var colonIndex = rest.indexOf(':');
  if (colonIndex !== -1) {
    methodsPart = rest.slice(0, colonIndex).trim();
    var afterColon = rest.slice(colonIndex + 1).trim();
    if (startsWithWord(afterColon, 'if')) {
      condition = afterColon.slice(2).trim();
    } else {
      condition = afterColon || null;
    }
  }

  var methods = methodsPart
  .split(',')
  .map(function (method) { return method.trim(); })
  .filter(Boolean);

  parent.node.allows.push({
    methods: methods,
    condition: condition ? restorePathParams(condition) : null,
    line: line,
  });
}

for (var i = 0; i < protectedSource.length; i += 1) {
  var char = protectedSource[i];

  if (char === '{') {
    var header = pendingHeader.trim();
    if (startsWithWord(header, 'match')) {
      var rawPath = restorePathParams(header.slice(5).trim());
      var parent = stack[stack.length - 1];
      var parentPath = parent && parent.path ? parent.path : '';
      var fullPath = joinPath(parentPath, rawPath);
      var node = {
        path: fullPath,
        rawPath: rawPath,
        line: lineForOffset(offsets, headerStart),
        allows: [],
      };
      matches.push(node);
      stack.push({ type: 'match', path: fullPath, node: node });
    } else {
      var parentBlock = stack[stack.length - 1];
      stack.push({ type: 'block', path: parentBlock ? parentBlock.path : '', node: null });
    }
    pendingHeader = '';
    headerStart = i + 1;
    continue;
  }

  if (char === '}') {
    flushAllow();
    if (stack.length > 1) stack.pop();
    pendingHeader = '';
    headerStart = i + 1;
    continue;
  }

  if (char === ';') {
    flushAllow();
    headerStart = i + 1;
    continue;
  }

  if (pendingHeader.length === 0 && isSpaceChar(char)) {
    headerStart = i + 1;
    continue;
  }

  pendingHeader += char;
}

return { matches: matches };
}

module.exports = {
  parseRules: parseRules,
  stripComments: stripComments,
  protectPathParams: protectPathParams,
  restorePathParams: restorePathParams,
};
