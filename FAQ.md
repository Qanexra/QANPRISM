# Frequently Asked Questions 💬

Common questions about QanPrism and their answers.

---

## Installation & Setup

**Q: What operating systems are supported?**  
A: Windows 10+, macOS 10.15+, and Linux (Ubuntu 20.04+, Fedora, Debian)

**Q: Do I need Rust installed?**  
A: Only for development or building from source. The pre-built installer includes everything needed.

**Q: Can I run it without Node.js?**  
A: Yes, the distributed installer is standalone and doesn't require Node.js.

**Q: What about WSL (Windows Subsystem for Linux)?**  
A: Supported! Install QanPrism on your WSL distro using the standard process.

---

## Performance & Resources

**Q: Why does my browser use more RAM than 80MB?**  
A: The 80MB is baseline. Each tab, extension, and loaded content adds memory. Chrome uses similar patterns - our smart hibernation helps manage this.

**Q: Can I disable automatic tab suspension?**  
A: Yes! Go to Settings → Performance → Disable "Auto-Hibernate Inactive Tabs"

**Q: How fast is the AI responses?**  
A: Depends on your setup:
- Local Ollama models: 20-60 seconds for complex queries
- Cloud APIs (GPT-4, DeepSeek): 5-15 seconds
- Optimized local quantized models: 5-10 seconds

**Q: Does it slow down my computer?**  
A: No! In fact, it should speed things up by freeing RAM from Chrome. We monitor this ourselves and users report noticeable improvements when switching from Chrome to QanPrism.

---

## AI & Models

**Q: Which models work best with QanPrism?**  
A: 
- **Financial analysis**: deepseek-coder, codegemma
- **General chat**: llama3, mistral
- **Math-heavy tasks**: codellama, mixtral

We recommend starting with `deepseek-coder:7b-q4` for financial research.

**Q: Can I use my own custom models?**  
A: Yes! Add your model to Ollama library or configure custom endpoint in AI settings.

**Q: Does the AI remember my conversations?**  
A: By default, no. Each session is independent unless you enable "Persistent History" in AI settings.

**Q: Is my data sent to third-party providers?**  
A: Only if you choose to use cloud APIs. Local models (Ollama) keep everything on your machine.

---

## Financial Data

**Q: Which financial websites are supported?**  
A: Any HTML-based site! We've tested:
- Yahoo Finance
- SEC EDGAR
- Investing.com
- Bloomberg (limited functionality)
- TradingView (chart exports only)

**Q: Can I export historical data?**  
A: Yes, use the table exporter on historical data pages to get CSV/JSON exports.

**Q: Does it work with paid financial terminals?**  
A: We support plugin integration for:
- Bloomberg Terminal API
- Refinitiv Workspace
- Polygon.io
- IEX Cloud

Check our [Plugin Documentation](./PLUGIN.md) for setup instructions.

---

## Security & Privacy

**Q: Is my data encrypted?**  
A: Yes, API keys and stored credentials use AES-256 encryption at rest.

**Q: Does QanPrism collect telemetry?**  
A: No. By default, we collect nothing. There's an optional diagnostic mode enabled via command line flag only.

**Q: Can I run it completely offline?**  
A: Yes! With local AI models (Ollama) and offline pages, you can browse cached content without internet.

**Q: Where are my bookmarks stored?**  
A: In your QanPrism profile at `~/.qanprism/profiles/default/bookmarks.json`

---

## Troubleshooting Common Issues

**Q: "Browser won't start" error**  
A: This usually means Node.js or Rust isn't installed. Run:
```bash
npm install
```

**Q: AI agent gives errors about endpoint**  
A: Make sure Ollama is running (`ollama serve` should show on port 11434), or configure a cloud API key.

**Q: Tables aren't extracting properly**  
A: Some complex tables require the latest version. Try updating and clearing cache. Also try simplifying your export selection.

**Q: Memory usage is too high**  
A: Enable auto-hibernation (Settings → Performance), close unused tabs, and check for memory-leaking plugins.

---

## Advanced Usage

**Q: How do I create custom AI prompts?**  
A: Use the Settings → AI → Custom System Prompts feature to set default instructions for your sessions.

**Q: Can I hotkey the AI sidebar?**  
A: Yes! Go to Settings → Shortcuts → Assign a keybinding to "Toggle AI Sidebar"

**Q: How do I batch export multiple tables?**  
A: Use the command palette (Ctrl+Shift+P) → "Export Multiple Tables as Bundle"

**Q: Can I use QanPrism with Docker?**  
A: Not natively, but we provide a Docker Compose setup in our enterprise repository.

---

## Developer Questions

**Q: How do I contribute code?**  
A: See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines and our [DEVELOPMENT.md](./DEVELOPMENT.md) for architecture details.

**Q: What IDE do you recommend?**  
A: VS Code with Rust Analyzer, ESLint, and Tailwind CSS extensions.

**Q: Can I build custom plugins?**  
A: Absolutely! Our plugin system is fully documented in [API.md](./API.md). See example plugins in the `/plugins/examples/` directory.

**Q: Where's the changelog?**  
A: Check out [CHANGELOG.md](./CHANGELOG.md) for all releases and updates.

---

## Community & Support

**Q: Where can I ask questions?**  
A: 
- GitHub Discussions (recommended for general questions)
- Discord community (link in README)
- Email raymond@qanexra.com for enterprise queries

**Q: Can I suggest features?**  
A: Yes! Create a feature request issue on GitHub or join our Discord discussions.

**Q: Is there a roadmap?**  
A: See [ROADMAP.md](./ROADMAP.md) for our planned development timeline.

---

## Other Questions

**Q: What's the difference between QanPrism and regular browsers?**  
A: QanPrism is built from scratch with low-RAM architecture (Rust/Tauri), not a Chromium fork. This means 10x less memory, local AI integration, and financial-focused features.

**Q: How does it compare to Brave or Firefox?**  
A: All three have their merits. QanPrism specializes in:
- Quantitative research workflows
- Financial data extraction
- Local-first privacy with AI
- Plugin extensibility for finance tools

**Q: Is this a fork of something?**  
A: No, QanPrism is entirely original codebase using Tauri and Rust. We're inspired by open-source values but built independently.

---

*Last updated: August 2024*

Still have questions? Check our [Support Channels](#) or create a GitHub Issue!
