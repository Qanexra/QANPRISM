# QanPrism Technical Architecture

## 1. Executive Summary
**QanPrism** is an AI-native browser and market intelligence workstation. It combines a lightweight multi-tab browser workspace with a low-level Rust execution engine and an autonomous AI Agent equipped with visual DOM grounding.

---

## 2. Subsystem Architecture

QanPrism is organized into four decoupled subsystems:

```
+-------------------------------------------------------------------------+
|                      1. QanPrism Workspace Shell (UI)                   |
|   - Multi-Tab Strip & Per-Tab State Container                           |
|   - AI Agent Sidebar & Prompt Console                                   |
|   - Live Diagnostics & Network Log Drawer (DebugConsole)                |
|   - Memory & Resource Optimization Monitor                              |
+------------------------------------+------------------------------------+
                                     |
                                     | Tauri IPC Bridge
                                     v
+------------------------------------+------------------------------------+
|                   2. QanPrism Native Network Subsystem                  |
|   - Out-of-process HTTP Client (Desktop Browser Profile)                |
|   - Request Multiplexing & Form Submission Router                       |
|   - In-Page Fetch & XHR Proxy Handler                                   |
|   - Network Diagnostics & Real-Time Performance Tracing                 |
+------------------------------------+------------------------------------+
                                     |
                                     | Internal Rust Sync
                                     v
+------------------------------------+------------------------------------+
|                  3. QanPrism Session & Storage Vault                    |
|   - Persistent Disk-Backed Cookie Jar (RFC 6265)                        |
|   - Encrypted Authentication & Token Cache                              |
|   - Structured Event Log Store (`qanprism_debug.log`)                   |
+------------------------------------+------------------------------------+
                                     |
                                     | Bi-Directional Bridge
                                     v
+------------------------------------+------------------------------------+
|            4. QanPrism Vision Grounding & AI Agent Runtime              |
|   - Non-Destructive Set-of-Marks (SoM) Visual Badge Overlay             |
|   - DOM Accessibility & Interactive Element Indexer (#1, #2, #3...)     |
|   - Autonomous ReAct Loop (Perceive -> Reason -> Act)                   |
|   - Local (Ollama) & Cloud (OpenAI/Anthropic/DeepSeek) Provider Hub     |
+-------------------------------------------------------------------------+
```

---

## 3. Subsystem Breakdown

### 3.1. QanPrism Workspace Shell (UI Layer)
- Built with React and Vanilla CSS design tokens.
- Manages browser tabs with persistent DOM mounting (`display: flex | none`) to eliminate reload thrashing when switching tabs.
- Features a live **Debug Console** with real-time level filtering (`NETWORK`, `ERROR`, `AGENT`, `WARN`, `INFO`), search, and one-click JSON export.

### 3.2. QanPrism Native Network Subsystem
- Powered by a persistent Rust HTTP client running out-of-process.
- Transmits authentic desktop browser headers (`Accept`, `Accept-Language`, `Sec-Fetch-*`, `User-Agent: QanPrism/1.0`) to avoid bot-blocking and captchas.
- Intercepts and routes web form submissions (`POST`/`GET`) and client-side Single Page Application (SPA) `fetch`/`XHR` requests through a native cookie bridge.

### 3.3. QanPrism Session & Storage Vault
- Automatically manages cross-origin cookies, session tokens, and security nonces across app sessions.
- Maintains persistent logs on disk (`qanprism_debug.log`) for rapid diagnostic tracing.

### 3.4. QanPrism Vision Grounding & AI Agent Runtime
- Implements non-destructive DOM indexing: extracts interactive elements (buttons, inputs, links) and overlays high-contrast visual badges without modifying the underlying webpage's SSR tree.
- Executes browser automation actions (`CLICK`, `TYPE`, `SCROLL`, `NAVIGATE`) in an autonomous ReAct loop.

---

## 4. Security & Privacy Principles
- **Strict Tab Isolation**: Inter-tab communication is strictly prevented; messages and commands are bound exclusively to the active tab ID.
- **Local-First AI Execution**: When connected to local Ollama endpoints (`http://localhost:11434`), zero telemetry or browsing data leaves the local machine.
