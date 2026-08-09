# QanPrism Changelog 📋

All notable changes to QanPrism will be documented in this file.

---

## [Unreleased]

### Added
- Initial release of QanPrism browser engine (v0.1.0)
- Tauri + Rust native core with ~80MB baseline memory
- Unified AI router supporting Ollama, LM Studio, and cloud APIs
- Financial data table extraction from web pages
- SEC EDGAR filing parser integration
- Plugin system for extensibility

### Planned for v0.2.0
- Smart tab hibernation engine
- Encrypted API key vault
- Additional data connectors (Bloomberg, Polygon.io)
- Enhanced agent sidebar with multi-tab synthesis

---

## [0.1.0] - 2024-XX-XX

### Initial Release

#### Features
- **Ultra-Low RAM Architecture**
  - Baseline memory: ~30-80 MB (90% less than Chrome)
  - Native WebView2 on Windows / WebKit on macOS/Linux
  - Rust-based IPC bridge for efficient communication
  
- **Bring Your Own AI (BYO-AI)**
  - Full local model support via Ollama/LM Studio (localhost:11434)
  - Cloud API integrations (DeepSeek, OpenAI, Anthropic, OpenRouter)
  - Air-gapped execution mode for privacy
  
- **Financial Workflows**
  - One-click HTML table to CSV/JSON/Parquet export
  - SEC 10-K, 10-Q parsing with footnoted extraction
  - Multi-tab financial data synthesis

#### Architecture Components
- React frontend with Vite bundler
- Tauri 2.0 native host (Rust)
- Unified OpenAI protocol AI router
- Modular plugin system

#### Dependencies
- Node.js 18+
- Rust stable toolchain
- Ollama (optional, for local LLMs)

---

## [0.0.1] - Pre-release

### Foundation Work
- Project scaffolding setup
- Initial README and ARCHITECTURE docs
- Basic package.json configuration
- Vite development environment

---

## Migration Guide: From Chrome to QanPrism

### Benefits of Switching
- **90% Lower RAM Usage**: Free up system resources for financial terminals
- **Local AI Privacy**: Run sensitive research offline with Ollama
- **Cost Savings**: No need for paid API subscriptions for all tasks

### Migration Steps
1. Install QanPrism via npm or GitHub
2. Configure preferred AI endpoint (local or cloud)
3. Import bookmarks and sessions
4. Enable Smart Tab Hibernation in settings

---

## Known Issues

- [ ] Initial startup on first launch can take 2-3 seconds
- [ ] SEC filings >50MB may timeout on slow connections
- [ ] Some legacy browser extensions are incompatible

---

## Version History Format

This changelog follows [Keep a Changelog](https://keepachangelog.com/) specifications.

### Release Types
- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security-related changes

---

For bug reports and feature requests, please visit [GitHub Issues](../../.github/issues).
