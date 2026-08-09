# QanPrism Development Guide 🛠️

This guide covers development workflows, architecture details, and best practices for contributing to QanPrism.

---

## Table of Contents
- [Project Structure](#project-structure)
- [Build System](#build-system)
- [Development Workflow](#development-workflow)
- [Rust Backend Development](#rust-backend-development)
- [Frontend Development](#frontend-development)
- [AI Agent Integration](#ai-agent-integration)
- [Testing](#testing)
- [Debugging](#debugging)

---

## Project Structure

```
qanprism/
├── src/                    # React frontend source
│   ├── App.jsx            # Main app component
│   ├── main.jsx           # Entry point
│   └── components/        # Reusable UI components
├── tauri.conf.json        # Tauri configuration
├── vite.config.js         # Vite bundler config
├── package.json           # Node dependencies
├── ARCHITECTURE.md        # High-level architecture
├── README.md              # Project overview
└── CONTRIBUTING.md        # Contribution guidelines
```

---

## Build System

### Development Server

```bash
# Frontend development (hot reload)
npm run dev

# Full Tauri development (Rust + React)
npm run tauri dev
```

### Production Build

```bash
# Minified frontend build
npm run build

# Package as distributable
npm run tauri build
```

### Clean Build

```bash
# Clear node_modules and rebuild
rm -rf node_modules package-lock.json
npm install
npm run tauri build
```

---

## Development Workflow

### Recommended VS Code Extensions

- **ESLint** - JavaScript linting
- **Prettier** - Code formatting
- **Rust Analyzer** - Rust language support
- **Tailwind CSS IntelliSense** - CSS utilities
- **Thunder Client** / **Postman** - API testing

### Hot Reload Setup

The development server supports hot reload:

1. **Frontend Changes** → Instant reload (React Fast Refresh)
2. **Rust Backend Changes** → Requires rebuild
3. **Tauri Config Changes** → Full restart

```bash
# Watch Rust backend for changes
cargo watch -x 'run --bin qanprism-core'
```

---

## Rust Backend Development

### Core Modules

The Rust backend handles:
- Memory management
- Tab hibernation
- IPC communication
- Data parsing

### Creating a New Module

```rust
// src/backend/mod.rs
pub mod memory_manager;
pub mod tab_hibernation;
pub mod data_parser;

use tauri::State;
use std::sync::Arc;

#[tauri::command]
pub fn init_backend() -> Result<(), String> {
    Ok(())
}
```

### Memory Manager Example

```rust
// src/backend/memory_manager.rs
use crate::ipc::MemoryStats;

pub struct MemoryManager {
    current_usage: f64,
    target_limit: f64,
}

impl MemoryManager {
    pub fn new(target_limit_mb: f64) -> Self {
        Self {
            current_usage: 0.0,
            target_limit: target_limit,
        }
    }
    
    pub fn suspend_inefficient_tabs(&self, tabs: Vec<TabInfo>) {
        for tab in tabs {
            if tab.memory_mb > self.target_limit * 0.5 {
                // Suspend tab via IPC
            }
        }
    }
}
```

### IPC Communication

Tauri's IPC enables secure communication between Rust and React:

```typescript
// In Rust backend
#[tauri::command]
pub async fn get_memory_stats() -> Result<MemoryStats, String> {
    Ok(MemoryStats {
        used_mb: 65.0,
        available_mb: 16384.0,
    })
}

// In React frontend
import { invoke } from '@tauri-apps/api/core';

const memory = await invoke('get_memory_stats');
console.log(`Using ${memory.used_mb}MB of RAM`);
```

---

## Frontend Development

### Component Structure

```jsx
// src/components/TabPanel.jsx
import { useState } from 'react';
import { X } from 'lucide-react';

export default function TabPanel({ tab, onClose }) {
  const [url, setUrl] = useState(tab.url);

  return (
    <div className="tab-panel">
      <div className="tab-header">
        <input 
          type="text" 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="address-bar"
        />
        <button onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      
      {/* Web content renderer */}
      <div className="web-content">
        {/* WebView2/WebKit integration */}
      </div>
    </div>
  );
}
```

### Agent Sidebar Component

```jsx
// src/components/AgentSidebar.jsx
import { useState } from 'react';
import { Send, Settings } from 'lucide-react';

export default function AgentSidebar({ aiClient }) {
  const [prompt, setPrompt] = useState('');

  const handleSend = async () => {
    if (!prompt.trim()) return;
    
    const response = await aiClient.chat(prompt);
    console.log(response);
  };

  return (
    <div className="agent-sidebar">
      <div className="sidebar-header">
        <h2>AI Agent</h2>
        <Settings icon />
      </div>
      
      <div className="chat-history">
        {/* Message history */}
      </div>
      
      <div className="input-area">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask the AI agent..."
        />
        <button onClick={handleSend}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
```

---

## AI Agent Integration

### Unified AI Protocol

QanPrism uses the OpenAI-compatible protocol for all LLM integrations:

```typescript
// src/ai/unified-router.ts
import { openai } from '@ai-sdk/openai';
import { ollama } from '@ai-sdk/ollama';

export class UnifiedAIRouter {
  constructor(
    private localEndpoint = 'http://localhost:11434',
    private apiKey = process.env.OPENAI_API_KEY,
    private model = 'deepseek-coder'
  ) {}

  async chat(prompt: string) {
    // Route to local or cloud based on configuration
    const systemPrompt = 'You are a financial research assistant. You can analyze financial data, answer questions about stocks, companies, and markets.';
    
    if (this.isLocalEndpoint(this.model)) {
      return await ollama({ path: this.localEndpoint })
        .completion({ 
          model: this.model, 
          prompt,
          system: systemPrompt
        });
    } else {
      return await openai({ 
        apiKey: this.apiKey,
        model: 'gpt-4'
      }).completion({ prompt });
    }
  }

  isLocalEndpoint(model: string): boolean {
    return model.includes('ollama') || model.includes('lmstudio');
  }
}
```

### Local Ollama Integration

```typescript
// src/ai/ollama-client.ts
import { ollama as ollamaFunctionCall } from 'ollama';

export class OllamaClient {
  constructor(private endpoint = 'http://localhost:11434') {}

  async generate(prompt: string, systemPrompt: string = ''): Promise<string> {
    const response = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-coder',
        prompt,
        system: systemPrompt,
        stream: false,
      }),
    });

    const data = await response.json();
    return data.response;
  }
}
```

---

## Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

### Test Structure

```javascript
// __tests__/memory-manager.test.js
import { MemoryManager } from '../src/backend/memory_manager';

describe('MemoryManager', () => {
  let manager;

  beforeEach(() => {
    manager = new MemoryManager(1024); // 1GB limit
  });

  test('should suspend tabs exceeding memory threshold', () => {
    const inefficientTabs = [
      { id: 'tab1', memory_mb: 600 },
      { id: 'tab2', memory_mb: 400 },
      { id: 'tab3', memory_mb: 200 },
    ];

    manager.suspend_inefficient_tabs(inefficientTabs);
    
    expect(inefficientTabs[0].suspended).toBe(true);
    expect(inefficientTabs[1].suspended).toBe(true);
    expect(inefficientTabs[2].suspended).toBe(false);
  });
});
```

### Integration Tests

```javascript
// __tests__/integration/ai-router.test.js
import { UnifiedAIRouter } from '../../src/ai/unified-router';

describe('UnifiedAIRouter', () => {
  let router;

  beforeEach(() => {
    router = new UnifiedAIRouter(
      'http://localhost:11434',
      process.env.OPENAI_API_KEY,
      'deepseek-coder'
    );
  });

  test('should route to local endpoint for Ollama models', async () => {
    const response = await router.chat('Test prompt');
    expect(response).toContain('Test');
  });
});
```

---

## Debugging

### Frontend Debugging

1. **React DevTools** - Inspect component state and props
2. **Browser DevTools** - Network, Console, Performance tabs

```bash
# Enable React debugging in Vite config
npm run dev -- --host 0.0.0.0
```

### Backend Debugging

```bash
# Rust logging
RUST_LOG=debug cargo run

# Tauri debugging
DEBUG=1 npm run tauri dev
```

### Memory Profiling

```rust
// Enable memory profiling in Tauri
use std::time::Instant;

pub fn profile_memory_operation(name: &str, f: impl FnOnce()) -> Result<(), String> {
    let start = Instant::now();
    let before = process_mem_usage()?;
    
    f();
    
    let after = process_mem_usage()?;
    let elapsed = start.elapsed();
    
    println!("{}: {}ms, {}MB → {}MB", name, elapsed.as_secs_f64(), before, after);
    
    Ok(())
}
```

---

## Performance Optimization

### Memory Management Best Practices

1. **Tab Hibernation** - Suspend inactive tabs automatically
2. **Resource Limits** - Set per-tab memory budgets
3. **Image Loading** - Lazy load images and use thumbnails
4. **Cache Management** - Clear old API responses

### Code Splitting

```javascript
// In vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'src/main.ts',
        agent: 'src/agent/index.ts'
      }
    }
  }
});
```

---

## CI/CD Setup

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run build
```

---

## License & Attribution

QanPrism is licensed under the MIT License. See [LICENSE](../../LICENSE) for details.

Developed with ❤️ by **Qanexra**.
