'use strict';

var SEVERITY_RANK = { high: 3, medium: 2, low: 1 };

function severityRank(severity) {
  return SEVERITY_RANK[severity] || 0;
}

function joinMethods(methods) {
  return methods.join(', ');
}

function runChecks(matches) {
  var findings = [];

for (var m = 0; m < matches.length; m += 1) {
  var node = matches[m];
  var isWildcard = node.path.indexOf('=**') !== -1;

  for (var a = 0; a < node.allows.length; a += 1) {
    var allow = node.allows[a];
    var methods = joinMethods(allow.methods);

  if (allow.condition === null) {
    findings.push({
      rule: 'unconditional-allow',
      severity: 'high',
      path: node.path,
      line: allow.line,
      methods: allow.methods,
      message: 'allow ' + methods + ' at ' + node.path + ' has no condition -- access is always permitted.',
    });
  } else {
    var condition = allow.condition.trim();
    if (condition === 'true') {
      findings.push({
        rule: 'always-true-condition',
        severity: 'high',
        path: node.path,
        line: allow.line,
        methods: allow.methods,
        message: 'allow ' + methods + ' at ' + node.path + ' uses if true, which is effectively public access.',
      });
    } else if (condition.indexOf('request.auth') === -1) {
      findings.push({
        rule: 'missing-auth-check',
        severity: 'medium',
        path: node.path,
        line: allow.line,
        methods: allow.methods,
        message: 'allow ' + methods + ' at ' + node.path + ' does not reference request.auth -- verify this rule is not meant to require authentication.',
      });
    }
  }

  if (isWildcard) {
    findings.push({
      rule: 'recursive-wildcard-match',
      severity: 'low',
      path: node.path,
      line: node.line,
      methods: allow.methods,
      message: node.path + ' uses a recursive wildcard (**) and applies to this path and everything nested beneath it -- verify the condition is meant to apply this broadly.',
    });
  }
  }
}

findings.sort(function (a, b) {
  return severityRank(b.severity) - severityRank(a.severity);
});

return findings;
}

module.exports = { runChecks: runChecks, severityRank: severityRank };
