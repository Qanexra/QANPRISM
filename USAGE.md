# QanPrism Usage Guide 📖

Complete user documentation for QanPrism browser features and workflows.

---

## First Time Setup

### Installation

```bash
git clone https://github.com/Qanexra/qanprism.git
cd qanprism
npm install
npm run tauri dev
```

### Building for Production

```bash
npm run tauri build
```

The installer will be available in `dist/` directory.

---

## Basic Usage

### Opening the Browser

1. Launch QanPrism from desktop or terminal
2. You'll see a welcome screen with Google search
3. Use the address bar to navigate to any URL

### Creating New Tabs

Click the **+** button in the top bar or press **Ctrl+T**.

### Closing Tabs

- Click the **×** on a tab
- Press **Ctrl+W**
- Right-click tab → "Close Tab"

### Managing Bookmarks

1. Press **Ctrl+D** to bookmark current page
2. Use the bookmark icon (📑) to manage favorites
3. Bookmarks sync with your browser profile

---

## AI Agent Features

### Opening the Agent Sidebar

Click the robot icon in the top-right corner or press **Alt+A**.

### Chatting with the AI

**Example prompts:**
- "What is Tesla's revenue for Q4 2024?"
- "Summarize this SEC filing"
- "Extract table data from this earnings report"
- "Compare AAPL and MSFT stock prices"

### Configuration

The AI agent can be configured to use:
- **Local models**: Ollama (deepseek-coder, llama3)
- **Cloud APIs**: OpenAI, DeepSeek, Anthropic, OpenRouter
- **Hybrid mode**: Local for personal tasks, cloud for heavy lifting

**To configure:** Click the settings icon (⚙️) in the AI sidebar.

---

## Financial Data Extraction

### Quick Table Export

1. Navigate to a financial data page (Yahoo Finance, SEC EDGAR, etc.)
2. Hover over any HTML table
3. Right-click and select "Export Table"
4. Choose format: CSV, JSON, or Parquet

### SEC Filing Intelligence

**Supported filings:**
- 10-K (Annual reports)
- 10-Q (Quarterly reports)
- 8-K (Current reports)
- DEF 14A (Proxy statements)

**Workflow:**
1. Search for company on EDGAR search page
2. Click filing to open it
3. Right-click table → "Extract with AI"
4. AI parses and structures the data

### Multi-Tab Synthesis

Open multiple tabs for different companies:
- Tab 1: Apple earnings report
- Tab 2: Microsoft earnings report
- Ask AI: "Compare revenue growth and profit margins between these two companies"

The AI will automatically synthesize data across tabs.

---

## Memory Management

### Monitoring Memory Usage

Click the memory monitor icon (🧠) to see:
- Current RAM usage per tab
- System memory available
- Hibernation status

### Automatic Tab Hibernation

QanPrism automatically suspends inactive tabs when:
- Another tab is being used heavily
- Total memory exceeds threshold (configurable in settings)
- System resources are under pressure

**To resume:** Click the hibernated tab to restore its state.

---

## Security & Privacy

### Air-Gapped Mode

When using local models (Ollama/LM Studio):
- All AI processing happens locally
- No data leaves your machine
- Perfect for sensitive research

### Encrypted Key Vault

Store API keys securely:
1. Settings → API Keys
2. Click "Add New Key"
3. Enter key name and value
4. Keys are encrypted with AES-256

### Session Security

- Sessions don't persist across restarts by default
- Enable "Remember sessions" if you want persistent tabs
- Clear browsing data: Settings → Privacy → Clear History

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close current tab |
| `Ctrl+L` | Focus address bar |
| `Alt+A` | Toggle AI sidebar |
| `Ctrl+S` | Save current page (PDF) |
| `Ctrl+F` | Find on page |
| `Ctrl+R` | Reload page |
| `F11` | Toggle fullscreen |

---

## Plugin System

### Installing Plugins

1. Download plugin from official repository or trusted source
2. Place in `~/.qanprism/plugins/`
3. Restart QanPrism

### Available Plugins

#### Data Connectors
- **SEC EDGAR** - Official SEC filing parser
- **Yahoo Finance** - Stock price and news data
- **Bloomberg Terminal** (paid) - Professional financial data

#### UI Extensions
- **Custom Toolbar** - Add custom buttons and panels
- **News Reader** - Integrated news feed sidebar

#### AI Agents
- **Research Assistant** - Academic paper analysis
- **Code Reviewer** - Software code analysis

---

## Troubleshooting

### Browser Won't Start

**Symptoms:** App icon doesn't launch, error on startup

**Solutions:**
1. Reinstall dependencies: `npm run tauri dev`
2. Check Rust installation: `rustc --version`
3. Clear cache: Remove `~/.qanprism/cache/` and restart

### AI Agent Not Responding

**Symptoms:** Robot icon shows loading, no response

**Solutions:**
1. Check Ollama is running: `ollama list`
2. Verify endpoint: `curl http://localhost:11434/api/tags`
3. Configure alternative API key in settings
4. Try switching models: deepseek-coder → llama3

### Memory Usage Spikes

**Symptoms:** System RAM fills up quickly

**Solutions:**
1. Enable auto-hibernation: Settings → Performance
2. Close unused tabs
3. Reduce image quality: Settings → Web Content → Compress images
4. Increase system memory limit (advanced)

---

## Getting Help

- **Documentation**: Visit [docs.qanprism.io](https://docs.qanprism.io)
- **GitHub Issues**: [Report bugs](../../.github/issues)
- **Community**: Join our Discord or forum discussions
- **API Reference**: See API.md for developer documentation

---

## FAQ

**Q: Is QanPrism free?**  
A: Yes, completely open source under MIT License.

**Q: Can I use it without an internet connection?**  
A: Yes, if using local AI models (Ollama) and offline pages.

**Q: How much RAM does it actually use?**  
A: ~80MB baseline vs Chrome's 500MB+. Actual usage depends on tabs and content.

**Q: Is my data safe with the AI agent?**  
A: Yes, when using local models or trusted API providers. Keys are encrypted.

**Q: Can I run it on Linux?**  
A: Yes, QanPrism supports Windows, macOS, and Linux via Tauri.
