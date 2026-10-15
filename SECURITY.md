# Security Policy

contact-fuse handles personal contact data and Google login tokens, so we take security reports
seriously and appreciate responsible disclosure.

## Supported versions

contact-fuse is **pre-1.0**. Only the latest released version receives security fixes.

| Version           | Supported   |
| ----------------- | ----------- |
| latest `0.x`      | ✅          |
| older `0.x`       | ❌          |
| unreleased `main` | best effort |

Once 1.0 ships, the latest minor version of the current major will be supported.

## Reporting a vulnerability

**Please do not open a public issue, discussion or pull request for security problems.**

Report privately with **GitHub private vulnerability reporting**:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability**.
3. Describe the issue, how to reproduce it, its impact, and the affected versions.

**Never include real contact data or real OAuth tokens** in your report. Use synthetic examples.

## What to expect

| Step                         | Target time                                   |
| ---------------------------- | --------------------------------------------- |
| Acknowledgement of report    | within 3 days                                 |
| Initial assessment / triage  | within 7 days                                 |
| Fix for critical/high issues | within 30 days                                |
| Public advisory              | after a fix is released, coordinated with you |

We will credit reporters in the advisory unless you prefer to stay anonymous. contact-fuse is a
volunteer project, so these are targets rather than guarantees.

## Scope

In scope, for example:

- Leaks of contact data or OAuth tokens (files, logs, error messages, network)
- The local server being reachable from anything other than `127.0.0.1`
- CSRF, DNS rebinding or other ways a malicious website could drive the local API
- Writes to a provider that bypass the snapshot, approval, dry-run or audit-log safety model
- Vulnerable dependencies with a realistic exploit path in contact-fuse

Out of scope:

- Vulnerabilities in Google's services themselves (report to Google)
- Attacks that require full control of the user's machine or OS account
- Users misconfiguring their own Google Cloud OAuth client
- Missing hardening with no demonstrated impact

## Our security design

See [docs/architecture/security-and-privacy.md](docs/architecture/security-and-privacy.md) for the
threat model and protections (loopback-only binding, OS keychain token storage, PII-free logging,
no telemetry).
