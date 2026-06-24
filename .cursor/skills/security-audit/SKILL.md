---
description: Run a focused security audit on changed files. Inspired by gstack /cso patterns.
---

# Security audit

1. Run `make security-scan`
2. Review `security/semgrep/rules.yml` coverage for the changed areas
3. Check for:
   - Hardcoded secrets and credentials
   - Injection surfaces (eval, unsanitized shell, SQL string concat)
   - Missing auth on new endpoints
   - Dependency/CVE notes if `package.json` changed
4. Report findings by severity: critical / high / medium / low
5. For critical issues: block PR until fixed; never downgrade to "flag only" for secrets
