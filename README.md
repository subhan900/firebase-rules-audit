# firebase-rules-audit

[![CI](https://github.com/subhan900/firebase-rules-audit/actions/workflows/ci.yml/badge.svg)](https://github.com/subhan900/firebase-rules-audit/actions/workflows/ci.yml)

A deterministic, local-only command-line tool that reviews Firebase Firestore and Cloud Storage security rules for common risky access patterns.

It reads rule files on your machine only. It does not connect to Firebase, deploy rules, or change your files.

## What it checks

- Unconditional `allow` statements (high severity)
- `if true` conditions that make access public (high severity)
- Rules without a `request.auth` reference (medium severity)
- Recursive wildcard paths such as `/{document=**}` (low severity)

These are static checks, not a replacement for a full security review. A finding may be intentional for a public resource; review each result in the context of your app.

## Requirements

- Node.js 16 or later

## Install and run

Clone the repository, then run the CLI from its folder:

```bash
git clone https://github.com/subhan900/firebase-rules-audit.git
cd firebase-rules-audit
node bin/firebase-rules-audit.js
```

With no file paths, the tool looks for `firestore.rules` and `storage.rules` in the current directory.

To use the command from any directory after cloning the repository:

```bash
npm link
firebase-rules-audit
```

## Usage

```text
firebase-rules-audit [files...] [options]
```

### Examples

Audit the default `firestore.rules` and `storage.rules` files in the current folder:

```bash
firebase-rules-audit
```

Audit one rules file:

```bash
firebase-rules-audit path/to/firestore.rules
```

Audit both rules files explicitly:

```bash
firebase-rules-audit path/to/firestore.rules path/to/storage.rules
```

Write machine-readable JSON for automation:

```bash
firebase-rules-audit --json > audit-report.json
```

Create a Markdown report:

```bash
firebase-rules-audit --md > audit-report.md
```

Disable colored terminal output:

```bash
firebase-rules-audit --no-color
```

Show command help:

```bash
firebase-rules-audit --help
```

## Output and exit codes

The default console report shows each finding with its severity, rule name, path, line number, and message, followed by a summary. Use `--json` or `--md` for JSON or Markdown output.

- `0`: No high-severity findings
- `1`: No rules files were found, or a supplied file does not exist
- `2`: At least one high-severity finding was found

## GitHub Action

Run the audit as a CI gate on every push and pull request using this repository as a composite action:

```yaml
name: Firebase Rules Audit

on:
  pull_request:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subhan900/firebase-rules-audit@v1.0.0
        with:
          files: firestore.rules storage.rules
          fail-on-high: 'true'
```

### Inputs

| Name | Description | Default |
| --- | --- | --- |
| `files` | Space-separated rules file paths to audit, relative to `working-directory`. Defaults to `firestore.rules` and `storage.rules`. | `''` |
| `fail-on-high` | Fail the action when one or more high-severity findings are found. | `'true'` |
| `working-directory` | Directory to run the audit from, relative to the workspace root. | `'.'` |

### Outputs

| Name | Description |
| --- | --- |
| `total` | Total number of findings. |
| `high` | Number of high-severity findings. |
| `medium` | Number of medium-severity findings. |
| `low` | Number of low-severity findings. |
| `report-json` | Path to the JSON report written by the action. |

The action always prints the console report and writes a JSON report to `firebase-rules-audit-report.json` in the working directory, even when `fail-on-high` is `'false'`, so you can inspect findings without blocking the build. A missing or unreadable rules file always fails the action, regardless of `fail-on-high`.

### Versioning

Use `@v1.0.0` for the latest stable v1 release. For maximum supply-chain protection, pin the action to a full commit SHA.

## Development

Run the test suite with:

```bash
npm test
```

## Security

Please report vulnerabilities privately; see [SECURITY.md](SECURITY.md).

## License

MIT
