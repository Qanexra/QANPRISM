# QanPrism Changelog

All notable changes to QanPrism will be documented in this file.

---

## [Unreleased]

### Added
- Real LLM inference: replaced mock responses with actual `/v1/chat/completions` HTTP requests to local models.
- LM Studio auto-discovery: API URL configuration panel with dynamic model fetching.
- Frameless window mode: custom React title bar with native Tauri drag regions and window controls.
- Page context engine: Rust-side HTML fetch that injects the active page content into the LLM system prompt.
- Initial browser release (v0.1.0).
- Tauri + Rust native core with ~80MB baseline memory.
- Unified AI router supporting Ollama, LM Studio, and cloud APIs.

### Fixed
- Granted strict Tauri v2 capabilities for window management (allow-minimize, allow-toggle-maximize, allow-close).
- Corrected documentation emails to official raymond@qanexra.com contact.
- Scrubbed sensitive AI configuration files from public Git history.
- Fixed CI workflow: removed broken test job, corrected Rust toolchain action, added Linux system dependencies.

---

## Version History Format

This changelog follows [Keep a Changelog](https://keepachangelog.com/) specifications.

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Fixed**: Bug fixes
- **Removed**: Removed features

---

For bug reports and feature requests, please visit [GitHub Issues](https://github.com/Qanexra/QANPRISM/issues).
