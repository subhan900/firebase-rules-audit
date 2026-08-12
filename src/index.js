'use strict';

var fs = require('fs');
var parser = require('./parser');
var checks = require('./checks');
var report = require('./report');

var DEFAULT_FILENAMES = ['firestore.rules', 'storage.rules'];

function resolveFiles(inputPaths) {
  if (inputPaths && inputPaths.length > 0) return inputPaths;
  return DEFAULT_FILENAMES.filter(function (name) {
    return fs.existsSync(name);
  });
}

function auditSource(source, fileLabel) {
  var parsed = parser.parseRules(source);
  var findings = checks.runChecks(parsed.matches);
  for (var i = 0; i < findings.length; i += 1) {
    findings[i].file = fileLabel;
  }
  return findings;
}

function auditFiles(filePaths) {
  var files = resolveFiles(filePaths);
  var findings = [];
  for (var i = 0; i < files.length; i += 1) {
    var filePath = files[i];
    var source = fs.readFileSync(filePath, 'utf8');
    findings = findings.concat(auditSource(source, filePath));
  }
  findings.sort(function (a, b) {
    return checks.severityRank(b.severity) - checks.severityRank(a.severity);
  });
  return { files: files, findings: findings };
}

module.exports = {
  resolveFiles: resolveFiles,
  auditSource: auditSource,
  auditFiles: auditFiles,
  parseRules: parser.parseRules,
  runChecks: checks.runChecks,
  report: report,
};
