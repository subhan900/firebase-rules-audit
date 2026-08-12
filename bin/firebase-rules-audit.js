#!/usr/bin/env node
'use strict';

var fs = require('fs');
var index = require('../src/index');
var report = require('../src/report');

function printHelp() {
  console.log([
    'Usage: firebase-rules-audit [files...] [options]',
    '',
    'Statically audits Firebase Firestore/Storage security rules files for',
    'open access, missing auth checks, and other common misconfigurations.',
    '',
    'Options:',
    '  --json        Output findings as JSON',
    '  --md          Output findings as Markdown',
    '  --no-color    Disable ANSI colors in console output',
    '  -h, --help    Show this help message',
    '',
    'If no files are given, firestore.rules and storage.rules are used',
    'when present in the current directory.',
  ].join('\n'));
}

function parseArgs(argv) {
  var files = [];
  var format = 'console';
  var color = true;
  var help = false;

  for (var i = 0; i < argv.length; i += 1) {
    var arg = argv[i];
    if (arg === '--json') format = 'json';
    else if (arg === '--md' || arg === '--markdown') format = 'markdown';
    else if (arg === '--no-color') color = false;
    else if (arg === '-h' || arg === '--help') help = true;
    else files.push(arg);
  }

  return { files: files, format: format, color: color, help: help };
}

function main(argv) {
  var args = parseArgs(argv);

  if (args.help) {
    printHelp();
    return 0;
  }

  var resolved = index.resolveFiles(args.files);
  if (resolved.length === 0) {
    console.error('No rules files found. Pass file paths or place firestore.rules / storage.rules in the current directory.');
    return 1;
  }

  var missing = resolved.filter(function (filePath) {
    return !fs.existsSync(filePath);
  });
  if (missing.length > 0) {
    console.error('File(s) not found: ' + missing.join(', '));
    return 1;
  }

  var result = index.auditFiles(resolved);

  if (args.format === 'json') {
    console.log(report.toJSON(result));
  } else if (args.format === 'markdown') {
    console.log(report.toMarkdown(result));
  } else {
    console.log(report.toConsole(result, { color: args.color }));
  }

  var hasHigh = result.findings.some(function (f) { return f.severity === 'high'; });
  return hasHigh ? 2 : 0;
}

process.exitCode = main(process.argv.slice(2));
