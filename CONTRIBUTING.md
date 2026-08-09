# Contributing to QanPrism 🚀

Thank you for your interest in contributing to QanPrism! This document provides guidelines for bug fixes, feature requests, and plugin development.

## Table of Contents
- [Code Style](#code-style)
- [Architecture Overview](#architecture-overview)
- [Development Setup](#development-setup)
- [Plugin Development](#plugin-development)
- [Bug Reports](#bug-reports)
- [Feature Requests](#feature-requests)

---

## Code Style

### JavaScript/React (Frontend)
- Use ESLint with Airbnb-style conventions
- Functional components with hooks
- Tailwind CSS for styling (if applicable)

### Rust (Backend/Tauri Core)
- Rust edition: 2021
- Clippy lints enabled
- Error handling via Result/Option types
- Prefer `async`/`await` over Future combinators

---

## Architecture Overview

QanPrism follows a layered architecture:

```
┌─────────────────────────────────────────────┐
│           React Frontend (UI Layer)         │
│   - Browser UI, Tabs, Agent Sidebar          │
│   - Financial Table Exporter                 │
└───────────────────┬─────────────────────────┘
                    │ IPC Messages
┌───────────────────▼─────────────────────────┐
│     Tauri/Rust Host Core (IPC Layer)         │
│   - Memory Management                        │
│   - Tab Hibernation                          │
│   - Encrypted Key Vault                      │
└───────────────────┬─────────────────────────┘
                    │ AI Protocol Bridge
┌───────────────────▼─────────────────────────┐
│     Unified AI Router (Agent Layer)          │
│   - OpenAI Protocol Client                   │
│   - Local Ollama/LM Studio Handler           │
│   - Cloud API Integrations                   │
└─────────────────────────────────────────────┘
```

---

## Development Setup

### Prerequisites
- Node.js 18+ 
- Rust stable toolchain
- Code editor (VS Code recommended)

### Installation

```bash
# Clone repository
git clone https://github.com/Qanexra/qanprism.git
cd qanprism

# Install dependencies
npm install

# Run development server
npm run tauri dev
```

### Hot Reload
The development server supports hot reload for both frontend and Rust code. Changes to:
- `src/` files → Frontend updates instantly
- `tauri.conf.json` → Full app restart required
- Rust backend modules → Requires rebuild

---

## Plugin Development

QanPrism uses a modular plugin system for extending functionality.

### Plugin Types

1. **Data Connectors** - Financial data sources (SEC, Bloomberg, etc.)
2. **UI Extensions** - Custom panels or toolbar widgets
3. **AI Agents** - Custom LLM wrappers or prompt templates
4. **Workflow Scripts** - Automation scripts for data processing

### Plugin Structure

```typescript
// plugins/my-connector/index.ts
export interface Config {
  name: "my-connector";
  version: "1.0.0";
  type: "data-connector";
}

export async function init(config: Config): Promise<any> {
  // Initialize connector
  return new MyConnector();
}

class MyConnector {
  async fetch(url: string) {
    // Fetch data from source
  }
  
  async parse(html: string) {
    // Parse and extract tables/data
  }
}
```

### Plugin Registration

Place plugins in `~/.qanprism/plugins/`:

```bash
mkdir -p ~/.qanprism/plugins/my-connector
cp my-connector.js ~/.qanprism/plugins/my-connector/
```

---

## Bug Reports

When reporting bugs, please include:

1. **Environment Details**
   - OS and version (Windows/macOS/Linux)
   - RAM usage before crash
   - Installed models (Ollama, LM Studio)

2. **Reproduction Steps**
   - Clear numbered steps to reproduce
   - Expected vs actual behavior

3. **Logs & Diagnostics**
   - Console errors (F12 DevTools)
   - Tauri logs (`npm run tauri dev` output)
   - Memory profile if applicable

### Example Bug Report Template

```markdown
## Environment
- OS: Windows 10
- RAM: 32GB
- Installed: Ollama, DeepSeek API

## Description
Browser crashes when parsing SEC filings larger than 50MB

## Reproduction
1. Navigate to EDGAR homepage
2. Search for a large filing (e.g., Tesla annual report)
3. Click on the filing link
4. App crashes after 30 seconds

## Console Errors
[Attach screenshot or copy error message]
```

---

## Feature Requests

### Submission Process

1. **Check Existing Issues** - Search [GitHub Issues](https://github.com/Qanexra/qanprism/issues)
2. **Propose Implementation** - Outline how the feature fits the architecture
3. **PR First** - Small features preferred over large pull requests

### Example Feature Request

```markdown
## Title: Add SEC Filings Metadata Export

## Use Case
Researchers need to export metadata (filing date, period, etc.) alongside financial tables

## Proposed Implementation
- New context menu option in table exporter
- JSON format with metadata fields
- Optional CSV export with embedded metadata

## Architecture Impact
- Minimal changes to core data connector
- New export format handler in IPC layer
```

---

## Code Review Guidelines

When submitting a PR, ensure:

- [ ] All tests pass (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] Documentation updated
- [ ] Changes are atomic (one feature per PR)
- [ ] Backwards compatibility maintained

### Review Checklist

Reviewers will check:
- Code quality and style consistency
- Performance impact on memory usage
- Security implications (API keys, data handling)
- Compatibility with existing plugins
- Error handling completeness

---

## Plugin Contributor Guidelines

If contributing a plugin or connector:

1. **Test Thoroughly** - Include test cases for edge cases
2. **Document API** - Provide clear interface documentation
3. **Error Handling** - Handle timeouts, network failures gracefully
4. **Rate Limiting** - Respect source API limits in connectors

### Plugin Manifest Format

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "type": "data-connector" | "ui-extension" | "ai-agent",
  "author": "Your Name",
  "license": "MIT",
  "description": "Plugin description",
  "config": {
    "required": [],
    "optional": ["api_key"]
  }
}
```

---

## Code of Conduct

Please be respectful and constructive. Remember:
- Different experiences and backgrounds make for better solutions
- Be welcoming to newcomers
- Focus on what's best for the project and community

---

## Questions?

Open an issue or discuss in GitHub Discussions. Happy contributing! 💎
