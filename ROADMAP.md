# QanPrism Roadmap

Development is organized into three phases. We are currently in Phase 1.

---

## Phase 1 — Browser (Current)

Ship a functional, low-RAM browser with a built-in local AI agent.

- [x] Tauri + Rust native shell with frameless window
- [x] Custom tab system with drag-to-move title bar
- [x] Local AI integration (Ollama, LM Studio)
- [x] Auto-discovery of installed models via API
- [x] Page context injection into LLM (Rust-side HTML fetch)
- [ ] Tab hibernation for idle tabs
- [ ] Encrypted local API key storage
- [ ] Bookmark and session management
- [ ] Extension/plugin system

---

## Phase 2 — Decentralized Livestreaming Protocol

Build a peer-to-peer streaming layer where every QanPrism browser instance acts as a relay node.

- [ ] WebRTC-based P2P mesh networking
- [ ] Chunk-based video distribution across nodes
- [ ] DHT (Distributed Hash Table) for stream discovery
- [ ] NAT traversal and relay fallback
- [ ] Basic streamer dashboard inside the browser
- [ ] Viewer UI with adaptive bitrate from nearest peers
- [ ] No central server — streams cannot be taken down by any single entity

The motivation: centralized platforms (Facebook, TikTok, YouTube) have the power to interrupt or block any livestream at any time. A decentralized network removes that single point of failure.

---

## Phase 3 — Encrypted P2P Infrastructure

Harden the network for production scale and add privacy guarantees.

- [ ] End-to-end encrypted streams
- [ ] Onion-style routing for streamer anonymity
- [ ] Reputation system for node reliability
- [ ] Incentive layer for relay nodes (optional tokenomics)
- [ ] Mobile support (iOS/Android)
- [ ] Cross-platform desktop builds (Windows, macOS, Linux)

---

## Backlog

- [ ] Multi-model simultaneous inference
- [ ] Financial data connector plugins (SEC, Bloomberg)
- [ ] Built-in PDF reader and annotation
- [ ] Research notebook with cross-tab synthesis

---

For feature requests, open a GitHub Issue.
