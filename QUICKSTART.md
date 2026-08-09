# Quick Start Guide 🚀

Get QanPrism running in 5 minutes!

---

## Installation (First Time)

### Option 1: Install via Git (Recommended for Development)

```bash
# Clone the repository
git clone https://github.com/Qanexra/qanprism.git
cd qanprism

# Install dependencies
npm install

# Start development server
npm run tauri dev
```

### Option 2: Download Pre-built Installer

Visit [GitHub Releases](../../releases/latest) to download the installer for your platform.

---

## First Launch

1. **Welcome Screen**: You'll see QanPrism's clean, minimal interface
2. **AI Sidebar**: Click the robot icon 🤖 to open the AI agent
3. **First Prompt**: Try asking "What's today's market sentiment on Tesla?"

---

## Essential Commands

```bash
# Start development (with hot reload)
npm run tauri dev

# Build for production
npm run tauri build

# Preview production build
npm run tauri preview

# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## Configure AI Endpoint

**Step 1: Check if Ollama is Running**
```bash
ollama serve
```

**Step 2: Pull a Model**
```bash
ollama pull deepseek-coder
```

**Step 3: Open QanPrism → Settings → AI → Set Endpoint**
- Local: `http://localhost:11434`
- Cloud: Your preferred API endpoint

---

## Try Your First Workflow

### Extract SEC Table Data

1. Navigate to https://www.sec.gov/cgi-edgar-search
2. Search for a company (e.g., "TSLA")
3. Open a filing (e.g., latest 10-K)
4. Find any financial table in the document
5. Right-click → "Export Table as CSV"
6. Save to your preferred location

### Analyze Stock Performance

1. Go to Yahoo Finance: https://finance.yahoo.com/quote/TSLA/key-statistics
2. Hover over the earnings table
3. Click the robot icon in sidebar
4. Type: "Extract historical EPS growth and explain the trend"
5. AI will parse and analyze the data for you

---

## Next Steps

- 📖 Read [USAGE.md](./USAGE.md) for detailed features
- 🔌 Explore [API.md](./API.md) for plugin development
- 🛠️ Check [CONTRIBUTING.md](./CONTRIBUTING.md) to contribute
- 🎨 Customize your workflow with plugins!

---

## Troubleshooting Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| "npm install" fails | Check Node.js version ≥18, reinstall Node if needed |
| Ollama connection error | Run `ollama serve` in terminal, verify port 11434 is open |
| App won't start | Delete `.tauri` folder and restart |
| AI not responding | Try switching models: `ollama pull llama3` then select in settings |

---

*Need help? See [FAQ.md](./FAQ.md) or create a GitHub Issue.*
