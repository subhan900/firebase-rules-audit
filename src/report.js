'use strict';

function summarize(findings) {
  var high = 0;
  var medium = 0;
  var low = 0;
  for (var i = 0; i < findings.length; i += 1) {
    if (findings[i].severity === 'high') high += 1;
    else if (findings[i].severity === 'medium') medium += 1;
    else if (findings[i].severity === 'low') low += 1;
  }
  return { total: findings.length, high: high, medium: medium, low: low };
}

function toJSON(result) {
  var payload = {
    files: result.files,
    summary: summarize(result.findings),
    findings: result.findings,
  };
  return JSON.stringify(payload, null, 2);
}

function toMarkdown(result) {
  var summary = summarize(result.findings);
  var lines = [];
  lines.push('# Firebase Rules Audit Report');
  lines.push('');
  lines.push('Files scanned: ' + result.files.length);
  lines.push('');
  lines.push('- High: ' + summary.high);
  lines.push('- Medium: ' + summary.medium);
  lines.push('- Low: ' + summary.low);
  lines.push('');
  if (result.findings.length === 0) {
    lines.push('No findings.');
    return lines.join(String.fromCharCode(10));
  }
  lines.push('| Severity | Rule | File | Path | Line | Message |');
  lines.push('|---|---|---|---|---|---|');
  for (var i = 0; i < result.findings.length; i += 1) {
    var f = result.findings[i];
    lines.push('| ' + f.severity + ' | ' + f.rule + ' | ' + (f.file || '') + ' | ' + f.path + ' | ' + f.line + ' | ' + f.message + ' |');
  }
  return lines.join(String.fromCharCode(10));
}

var COLORS = {
  high: String.fromCharCode(27) + '[31m',
  medium: String.fromCharCode(27) + '[33m',
  low: String.fromCharCode(27) + '[36m',
  reset: String.fromCharCode(27) + '[0m',
};

function toConsole(result, options) {
  var useColor = !(options && options.color === false);
  var summary = summarize(result.findings);
  var lines = [];
  lines.push('Scanned ' + result.files.length + ' file(s).');
  if (result.findings.length === 0) {
    lines.push('No issues found.');
    return lines.join(String.fromCharCode(10));
  }
  for (var i = 0; i < result.findings.length; i += 1) {
    var f = result.findings[i];
    var color = useColor ? (COLORS[f.severity] || '') : '';
    var reset = useColor ? COLORS.reset : '';
    var location = (f.file ? f.file + ':' : '') + f.line;
    lines.push(color + '[' + f.severity.toUpperCase() + ']' + reset + ' ' + f.rule + ' - ' + f.message + ' (' + location + ')');
  }
  lines.push('');
  lines.push('Summary: ' + summary.high + ' high, ' + summary.medium + ' medium, ' + summary.low + ' low.');
  return lines.join(String.fromCharCode(10));
}

module.exports = { toJSON: toJSON, toMarkdown: toMarkdown, toConsole: toConsole, summarize: summarize };
