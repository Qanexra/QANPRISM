# QanPrism 💎

> **The Open-Source, Low-RAM AI Agent Browser for Quantitative Research & Financial Intelligence.**  
> Powered by **Qanexra**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)]()
[![Tauri](https://img.shields.io/badge/Engine-Tauri%20%2B%20Rust-orange.svg)](https://tauri.app)
[![AI Integration](https://img.shields.io/badge/AI-Ollama%20%7C%20DeepSeek%20%7C%20OpenAI-purple.svg)]()

---

## 🌟 Overview

**QanPrism** is a next-generation, high-efficiency web browser engineered specifically for quantitative analysts, financial researchers, hedge funds, and traders.

Standard web browsers like Google Chrome consume gigabytes of RAM per window, slowing down workstation performance alongside heavy financial terminals, Excel, and local Python models. Furthermore, mainstream browsers lock users into closed AI ecosystems without options for privacy-compliant, local LLMs.

**QanPrism** solves these challenges by combining an **ultra-lightweight browser shell (Tauri + Rust)** with a **modular AI agent architecture** supporting both local models (Ollama, LM Studio) and cloud provider APIs (DeepSeek, OpenAI, Anthropic, OpenRouter).

---

## 🔥 Key Features

### 🚀 1. Ultra-Low RAM Footprint
* **Native WebEngine Core**: Powered by Rust & Tauri (`WebView2` on Windows, `WebKit` on macOS/Linux).
* **Baseline Memory**: ~30 MB - 80 MB (Up to **90% less RAM** than Google Chrome).
* **Smart Tab Hibernation**: Automatically suspends background tabs during heavy data processing sessions.

### 🤖 2. Bring Your Own AI (BYO-AI)
* **100% Local Models**: Full support for Ollama, LM Studio, llama.cpp, and vLLM (`localhost:11434`, `localhost:1234`).
* **Cloud API Integrations**: DeepSeek, OpenAI, Anthropic, Grok, OpenRouter, or custom OpenAI-compatible endpoints.
* **Privacy & Compliance**: Air-gapped mode ensures sensitive research and queries never leave your local workstation.

### 📊 3. Quantitative Financial Workflows
* **1-Click Table to Data**: Hover over any HTML data table (Yahoo Finance, SEC EDGAR, Investing.com) and export instantly to **CSV, JSON, Parquet, or Pandas DataFrame**.
* **SEC Filing Intelligence**: Automated parsing of 10-K, 10-Q, and earnings call transcripts with footnoted table extraction.
* **Multi-Tab Cross Synthesis**: Compare financials across multiple open tabs with simple prompt commands.

### 🔌 4. Extensible Data Connector Engine
Pluggable data layer for both **free** and **paid** financial data sources:
* **Free Connectors**: SEC EDGAR, Yahoo Finance, FRED Economic Data, Stooq, Web Scrapers.
* **Paid Connectors**: Bloomberg Terminal, Refinitiv Eikon, Polygon.io, TradingView APIs, IEX Cloud.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       QanPrism UI                           │
│           (React / Svelte + Address Bar + Agent Sidebar)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
    ┌─────────────────────┐         ┌─────────────────────┐
    │     Tauri Core      │         │   QanPrism Agent    │
    │ (Rust / Low RAM IPC)│         │ (DOM Parser / CDP)  │
    └─────────────────────┘         └──────────┬──────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │ Unified AI Router   │
                                    │ (OpenAI Protocol)   │
                                    └──────────┬──────────┘
                                               │
                         ┌─────────────────────┴─────────────────────┐
                         ▼                                           ▼
            ┌────────────────────────┐                  ┌────────────────────────┐
            │   Local LLMs (Ollama)  │                  │  Cloud APIs (DeepSeek) │
            └────────────────────────┘                  └────────────────────────┘
```

---

## 🛠️ Quick Start & Installation

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* [Rust](https://www.rust-lang.org/tools/install) (latest stable)
* [Ollama](https://ollama.com/) *(Optional, for running local AI models)*

### Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/Qanexra/qanprism.git
cd qanprism

# 2. Install frontend dependencies
npm install

# 3. Run in development mode
npm run tauri dev
```

### Building for Production

```bash
# Build distributable installer
npm run tauri build

# Find installer in dist/ directory
ls dist/
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [USAGE.md](./USAGE.md) | Complete user guide with all features |
| [QUICKSTART.md](./QUICKSTART.md) | Get started in 5 minutes |
| [API.md](./API.md) | Developer API reference |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Development workflow guide |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guidelines |
| [SECURITY.md](./SECURITY.md) | Security policy and best practices |
| [ROADMAP.md](./ROADMAP.md) | Planned development timeline |
| [FAQ.md](./FAQ.md) | Frequently asked questions |

---

## 🔌 Plugin & Connector System

Users can add custom data sources or quant workflows by placing plugins in the `~/.qanprism/plugins/` directory.

**Example plugin structure:**
```json
{
  "name": "sec-edgar-parser",
  "version": "1.0.0",
  "type": "data-connector",
  "entry": "index.js",
  "description": "Extracts 10-K financial tables directly into Polars/Pandas"
}
```

See [plugins/examples/](./plugins/examples/) for sample implementations.

---

## 🤝 Contributing

We welcome contributions from the open-source community! Here's how you can help:

### Types of Contributions
- **Bug Fixes**: Report issues or submit patches
- **Feature Requests**: Propose new functionality
- **Documentation**: Improve existing docs or write new ones
- **Plugins**: Create data connectors or UI extensions
- **Security**: Report vulnerabilities responsibly

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

### Code of Conduct
Please note that this project is released with a [Contributor Code of Conduct](./CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💖 Support & Sponsorship

QanPrism is an open-source project. My goal is to build even larger, more advanced AI agents and quantitative tools. If this project has helped you or your firm, please consider sponsoring my work. Your sponsorship directly funds the development of next-generation AI workflows!

* **Sponsor via GitHub**: [Click here to Sponsor](#) *(Update with your GitHub Sponsors link)*
* **Claude for OSS**: I am actively seeking support through the [Claude for Open Source](https://claude.com/contact-sales/claude-for-oss) program to integrate more powerful, advanced Claude agent capabilities into QanPrism.
* **Enterprise Customization**: Need a custom AI agent tailored for your firm's specific workflows? Reach out below.

---

## 💎 Developed with ❤️ by **Qanexra**

*For enterprise inquiries, contact: raymond@qanexra.com*  
*Security issues: raymond@qanexra.com*
