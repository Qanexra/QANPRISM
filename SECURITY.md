# Security Policy 🔒

Thank you for keeping QanPrism secure! This document outlines our security practices, vulnerability disclosure process, and best practices.

---

## Vulnerability Disclosure

### Reporting a Security Issue

If you discover a security vulnerability in QanPrism, please report it responsibly:

**How to Report:**
1. Create a new GitHub Issue with label "Security" or email us directly at `raymond@qanexra.com`
2. Include detailed information about the vulnerability
3. Describe potential impact and affected versions
4. Provide steps to reproduce (without exposing sensitive data)
5. Suggest possible mitigations if known

**What We Promise:**
- ✅ All reports are handled with confidentiality
- ✅ You'll receive acknowledgment within 48 hours
- ✅ Vulnerabilities are fixed promptly with a patch
- ✅ You'll be credited for your responsible disclosure
- ✅ No retaliation or harm to your reputation

### What NOT to Include

Please do NOT include in public issues:
- Screenshots showing personal data
- API keys or sensitive credentials
- Exploitation steps that could cause harm
- Information about other users' data

---

## Security Best Practices for Users

### Before Using QanPrism

1. **Keep It Updated**: Always use the latest version
2. **Verify Sources**: Download only from official GitHub releases
3. **Check Signatures**: Verify GPG signatures on releases if available
4. **Use Strong Passwords**: Protect your profile with strong, unique passwords

### API Key Management

When storing API keys in QanPrism:

1. **Use the Encrypted Vault**: Never hard-code keys in config files
2. **Rotate Regularly**: Change keys every 90 days
3. **Limit Scope**: Use API keys with minimal permissions
4. **Monitor Usage**: Set up alerts for unusual API usage patterns

**NEVER share your keys with:**
- AI agents (unless air-gapped mode)
- Third-party plugins without verifying their reputation
- Public forums or issue trackers

### Plugin Security

When installing plugins:

1. **Verify Source**: Only install from official repository or trusted sources
2. **Check Permissions**: Review what data the plugin requests access to
3. **Read Documentation**: Understand what the plugin does before enabling
4. **Keep Updated**: Update plugins regularly for security patches

### Sensitive Research Workflows

For highly sensitive financial research:

1. **Use Air-Gapped Mode**: Disable all cloud API connections
2. **Local Models Only**: Use Ollama/LM Studio exclusively
3. **Clear Session Data**: Clear browsing data before leaving session
4. **Disable History**: Turn off history recording in settings

---

## Security Architecture

### Encryption at Rest

- API keys are encrypted with AES-256-GCM
- Encryption key is derived from user password (PBKDF2)
- Encrypted vault stored at `~/.qanprism/vault.enc`

### Memory Protection

- Sensitive data cleared from memory after processing
- No data persisted to disk without encryption
- RAM protection via OS-native webview isolation

### Network Security

- HTTPS-only connections preferred
- API key transmission encrypted (TLS 1.3)
- No telemetry or analytics by default
- Optional privacy mode disables all network requests

### IPC Communication

- All IPC messages between frontend and backend are signed
- Message authentication prevents injection attacks
- Input sanitization on all user inputs

---

## Known Security Considerations

### Current Limitations

1. **Local Storage**: Encrypted vault depends on system file permissions
2. **IPC Bridge**: Tauri's IPC can be exploited if Rust code has vulnerabilities
3. **Browser Content**: Third-party websites can still use their own tracking
4. **Model Injections**: Malicious prompts could potentially influence AI responses

### Mitigations in Progress

- [ ] Implement model output validation layer
- [ ] Add network request inspection tool
- [ ] Develop sandbox mode for suspicious plugins
- [ ] Add GPG-signed release binaries

---

## Security Audit History

| Date | Auditor | Findings | Status |
|------|---------|----------|--------|
| 2024-Q1 | Internal audit | Passed with minor notes | ✅ Resolved |

Full audit reports are available upon request for enterprise customers.

---

## Third-Party Dependencies

QanPrism uses the following third-party libraries:

### Frontend Dependencies
- **React**: MIT License, well-audited
- **Vite**: MIT License, actively maintained
- **Lucide React**: MIT License, icon library

### Backend Dependencies  
- **Tauri 2.0**: Mozilla/Snapcraft, Rust-based
- **WebView2/WebKit**: OS-native components

### AI Model APIs
- **Ollama**: Apache 2.0, local-first
- **OpenAI**: Proprietary, enterprise-grade security
- **DeepSeek**: Proprietary, SOC 2 compliant

We review all dependencies quarterly for known vulnerabilities (CVEs).

---

## Enterprise Security Features

For organizations requiring additional security:

### Available Options

1. **Self-Hosted AI Models**: Full control over model deployment
2. **Custom API Keys Integration**: LDAP/SSO authentication support
3. **Audit Logging**: Comprehensive logging for compliance
4. **SAML SSO**: Enterprise single sign-on integration
5. **DLP Integration**: Data loss prevention hooks

### Compliance

QanPrism can be configured to meet:
- SOC 2 Type II
- GDPR requirements
- HIPAA (with appropriate configurations)
- FINRA guidelines for financial institutions

Contact us at raymond@qanexra.com for implementation details.

---

## Security Updates and Notifications

### Notification Channels

Security updates are distributed through:
1. **GitHub Releases**: Binary downloads with checksums
2. **Email Notifications**: Subscribe to security mailing list
3. **RSS Feed**: [https://qanprism.io/security/feed](https://qanprism.io/security/feed)

### Update Best Practices

- Enable automatic updates in settings (recommended for most users)
- Review changelog before each major version upgrade
- Test updates in staging environment before production deployment

---

## Security Team

Our security team consists of:
- 2 Full-time Security Engineers
- 3 Part-time Penetration Testers
- External bug bounty program via HackerOne

**Emergency Contact**: raymond@qanexra.com (for critical issues)

---

## Contributors

All contributors to QanPrism must sign our [Contributor License Agreement](./CLA.md) before merging code that affects security.

### Code Review Security Checklist

Before merging any PR, reviewers check:
- [ ] No hardcoded secrets or API keys
- [ ] Input validation on all user inputs
- [ ] Proper error handling (no stack traces exposed)
- [ ] Memory safety (Rust compilation warnings addressed)
- [ ] Dependency updates via security advisories

---

## License and Attributions

QanPrism is licensed under MIT. See [LICENSE](./LICENSE) for details.

This security policy was last updated: August 2024

Developed with ❤️ by **Qanexra** Security Team.
