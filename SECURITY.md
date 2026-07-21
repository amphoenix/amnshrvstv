# Security Policy

## Reporting a Vulnerability

**Do not open public GitHub issues for security vulnerabilities.** This allows us to address vulnerabilities responsibly and give security researchers proper credit for responsible disclosure.

### Reporting Process

1. **Email us directly:**
   - Primary: [amnshrvstv@gmail.com]
   - Subject line: `[SECURITY] Vulnerability Report: [Brief Description]`

2. **Include in your report:**
   - Detailed description of the vulnerability
   - Steps to reproduce (proof-of-concept if possible)
   - Impact assessment (what could an attacker do?)
   - Affected versions
   - Your contact information (name, email, GPG key if available)

3. **What to expect:**
   - Acknowledgment within 48 hours
   - Regular updates on investigation progress (at least weekly)
   - Disclosure timeline coordination with you
   - Credit in security advisory (unless you prefer anonymity)

### Response Timeline (SLA)

| Severity | Initial Response | Fix Target | Public Disclosure |
|----------|------------------|------------|-------------------|
| **Critical** (RCE, auth bypass, data exposure) | 24 hours | 7 days | 14 days after fix release |
| **High** (privilege escalation, denial of service) | 48 hours | 14 days | 30 days after fix release |
| **Medium** (information disclosure, partial compromise) | 72 hours | 30 days | 60 days after fix release |
| **Low** (minor issues, edge cases) | 1 week | 60 days | 90 days after fix release |

If a fix is not ready by the target date, we will communicate the delay and revised timeline.

---

## Security Update Policy

### Supported Versions

| Version | Status | Security Updates Until |
|---------|--------|------------------------|
| 5.1.x | ✅ Actively Maintained | Until 5.2.0 release + 6 months |
| 5.0.x | ⚠️ Limited Support | Until 5.1.0 EOL (3 months) |
| 4.0.x | ✅ LTS (Long-Term Support) | 12 months from 5.0 release |
| < 4.0 | ❌ End of Life | No longer receiving updates |

We recommend always upgrading to the latest version (5.1.x). Security updates are released as patch versions (e.g., 5.1.3).

**LTS Note:** Version 4.0.x receives critical security patches only; feature updates are in 5.x branch.

### Release Cadence

- **Security patches**: Released as needed (may be expedited)
- **Regular releases**: Monthly (typically first week of month)
- **Critical patches**: Out-of-band releases within 24-48 hours of fix verification

Subscribe to [releases](https://github.com/amphoenix/amnshrvstv/releases) for notifications.

---

## Security Best Practices

### For Users

1. **Keep dependencies updated** — Run `npm audit` or `pip check` regularly
2. **Use environment variables** for sensitive config (API keys, tokens) — never commit secrets
3. **Enable 2FA** on your GitHub account
4. **Review dependencies** before deploying — check `package-lock.json` or `requirements.txt` for unexpected changes
5. **Use code scanning** if building on this project — enable GitHub's CodeQL or similar tools

### For Contributors

1. **Never commit secrets** — use `.env` files and add them to `.gitignore`
2. **Use signed commits** — `git commit -S` to prove authorship
3. **Review security advisories** — check [`/security/advisories`](https://github.com/amphoenix/amnshrvstv/security/advisories) before contributing
4. **Follow OWASP Top 10** guidelines for web/API projects
5. **Validate all user input** — assume all input is malicious until proven otherwise
6. **Use parameterized queries** — never concatenate SQL strings
7. **Sanitize output** — prevent XSS, injection attacks
8. **Run security tools** before opening PRs:
   ```bash
   npm audit
   npm run lint
   npm run security-check  # if available
   ```

---

## Security Features

### This Project Includes

- ✅ Branch protection on `main` (requires PR review)
- ✅ Automated dependency scanning (Dependabot)
- ✅ Code quality checks (GitHub Actions CI/CD)
- ✅ Secret scanning (detects accidentally committed credentials)
- ✅ CODEOWNERS file (enforces code review)

### Third-Party Security

We integrate with:
- **Dependabot** — monitors dependencies for known vulnerabilities
- **GitHub Security Advisories** — tracks CVEs and patches
- **CodeQL** — static analysis for common bugs

---

## Incident Response

### What Happens After We Receive a Report

1. **Triage** (24-48h) — Verify vulnerability, assess severity, determine affected versions
2. **Fix development** — Create fix in private branch; no public commits
3. **Testing** — Reproduce, test fix, verify no regressions
4. **Release** — Publish patch version with security advisory
5. **Disclosure** — Publish CVE details and mitigation steps
6. **Credit** — Acknowledge researcher in advisory (if desired)

### Confidentiality

- Vulnerability details remain confidential until patch is released
- We will not disclose reporter identity without explicit permission
- We will not pursue legal action against responsible researchers

---

## Known Limitations

⚠️ **This project is provided as-is.** Consider the following limitations:

- Not suitable for mission-critical systems without additional hardening
- Requires regular security audits for high-risk deployments
- Users are responsible for securing their own deployment environment
- No guarantee of backwards compatibility across major versions
- Consult security specialists before using in compliance-heavy environments (healthcare, finance, etc.)

---

## Security Advisories

All disclosed vulnerabilities are documented in our [Security Advisories](https://github.com/amphoenix/amnshrvstv/security/advisories) section. Subscribe to receive notifications when new advisories are published.

---

## Contact

**Security Contact:** [amnshrvstv@gmail.com]

**Response hours:** Monday–Friday, 9 AM–5 PM UTC (best-effort outside hours)

**PGP Key:** [Optional - provide GPG key fingerprint or link to key server]

---

## Acknowledgments

We thank the security research community for helping us identify and fix vulnerabilities responsibly. Researchers who report valid vulnerabilities will be acknowledged in the advisory (unless they request anonymity).

---

## Version History

| Date | Changes |
|------|---------|
| 2026-07-21 | Initial policy |

Last updated: July 21, 2026
