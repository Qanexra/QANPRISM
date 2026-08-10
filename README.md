<div align="center">

# QanPrism

**A low-RAM, open-source browser with a built-in local AI agent — and the foundation for a decentralized livestreaming network where every user is a node.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Self-contained](https://img.shields.io/badge/Node.js-bundled%20%C2%B7%20none%20required-brightgreen.svg)](https://nodejs.org/)
[![Tauri](https://img.shields.io/badge/Engine-Tauri%20%2B%20Rust-orange.svg)](https://tauri.app)

[![Windows](https://img.shields.io/badge/Windows-supported-blue.svg)](#supported-platforms)
[![macOS](https://img.shields.io/badge/macOS-supported-blue.svg)](#supported-platforms)
[![Linux](https://img.shields.io/badge/Linux-supported-blue.svg)](#supported-platforms)

<br>

**The decentralized livestreaming platform is coming** — no central servers, no interruptions, powered by the community.

<sub>[English](./README.md) · [Tieng Viet](./README_VI.md)</sub>

</div>

## Contents

- [What is QanPrism](#what-is-qanprism)
- [The Bigger Picture](#the-bigger-picture)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Documentation](#documentation)
- [License](#license)
- [Support](#support)

---

## What is QanPrism

QanPrism is a lightweight web browser built on Tauri and Rust. It uses your operating system's native web engine instead of bundling its own, which drops the memory footprint to around 30-80 MB — roughly 90% less than Chrome.

It ships with a built-in AI sidebar that connects to local models running on your machine (Ollama, LM Studio) or cloud APIs (DeepSeek, OpenAI). The agent can read the page you are currently looking at and answer questions about it, extract data from tables, or help with research.

But QanPrism is not just a browser.

## The Bigger Picture

The long-term vision is to build a **decentralized livestreaming network** on top of the browser. Every person running QanPrism also contributes as a relay node in a peer-to-peer streaming mesh. No single company controls the infrastructure. No one can pull the plug on a livestream because there is no central server to shut down.

This idea came from watching what happened during Mrs. Hang's livestream sessions in Vietnam — platforms like Facebook, TikTok, and YouTube repeatedly interrupted and blocked her streams because they had the power to do so. A truly decentralized network removes that single point of failure entirely.

Phase 1 is the browser. Phase 2 is the streaming protocol.

---

## Features

### Browser
- Native web engine (WebView2 on Windows, WebKit on macOS/Linux)
- Baseline memory: 30-80 MB
- Custom frameless UI with integrated tabs

### Local AI Agent
- Supports Ollama, LM Studio, and any OpenAI-compatible API
- Auto-discovers models installed on your machine
- Reads the active page and injects context into the LLM
- Zero API cost when running local models

### Data Extraction
- Export HTML tables to CSV, JSON, or Parquet
- SEC filing parser (10-K, 10-Q)
- Cross-tab data comparison

---

## Architecture

```text
QanPrism UI (React + Vite)
        |
   Tauri Core (Rust)
        |
   +----+----+
   |         |
 WebView   AI Router (OpenAI protocol)
             |
        +----+----+
        |         |
   Local LLMs   Cloud APIs
  (Ollama/LM)   (DeepSeek/OpenAI)
```

---

## Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v18 or later
- [Rust](https://www.rust-lang.org/tools/install) stable toolchain
- [Ollama](https://ollama.com/) or [LM Studio](https://lmstudio.ai/) (optional, for local AI)

### 2. Development Setup

```bash
git clone https://github.com/Qanexra/QANPRISM.git
cd QANPRISM
npm install
npm run tauri dev
```

### 3. Build for Production

```bash
npm run tauri build
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [ROADMAP.md](./ROADMAP.md) | Development phases and long-term vision |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute |
| [SECURITY.md](./SECURITY.md) | Security policy |
| [CHANGELOG.md](./CHANGELOG.md) | Release history |

---

## Contributing

We welcome contributions. See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

This project follows a [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

QanPrism is open-source. If this project is useful to you, consider sponsoring via [GitHub Sponsors](https://github.com/sponsors/Qanexra).

---

<div align="center">
  
**Developed by Qanexra**
  
For inquiries: raymond@qanexra.com
  
</div>
