# firebase-rules-audit

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

## Development

Run the test suite with:

```bash
npm test
```

## License

[MIT](LICENSE)
