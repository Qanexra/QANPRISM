# QanPrism API Reference 💎

Comprehensive API documentation for QanPrism's backend, frontend, and plugin interfaces.

---

## Table of Contents
- [Backend IPC API](#backend-ipc-api)
- [AI Router API](#ai-router-api)
- [Data Connector Interface](#data-connector-interface)
- [Frontend Component API](#frontend-component-api)
- [Plugin API](#plugin-api)

---

## Backend IPC API

### Memory Management

#### `getMemoryStats()` → `Promise<MemoryStats>`

```typescript
interface MemoryStats {
  used_mb: number;          // Current memory usage in MB
  available_mb: number;     // Available system memory in MB
  limit_percent: number;    // Percentage of limit reached (0-100)
}
```

**Usage:**
```javascript
const stats = await ipc.invoke('getMemoryStats');
console.log(`Using ${stats.used_mb}MB / ${stats.limit_percent}%`);
```

#### `suspendTab(tabId)` → `Promise<void>`

Suspend a specific tab to free memory.

#### `resumeTab(tabId)` → `Promise<void>`

Resume a suspended tab and restore its state.

---

### Tab Management

#### `getTabs()` → `Promise<Tab[]>`

Retrieve all active tabs with their memory usage.

```typescript
interface Tab {
  id: string;
  url: string;
  title: string;
  memory_mb: number;
  suspended: boolean;
  createdAt: Date;
}
```

#### `createTab(url)` → `Promise<TabId>`

Create a new browser tab.

#### `closeTab(tabId)` → `Promise<void>`

Close and suspend a tab.

---

### Data Extraction

#### `extractTableFromSelection()` → `Promise<ExtractedData>`

Extract table data from user-selected region.

```typescript
interface ExtractedData {
  format: 'csv' | 'json' | 'parquet';
  data: Array<any>;
  columns: string[];
  sourceUrl: string;
  timestamp: Date;
}
```

#### `fetchFinancialData(provider, symbol)` → `Promise<DataResponse>`

Fetch financial data from connected providers.

```typescript
interface DataResponse {
  success: boolean;
  data: any;
  provider: string;
  cached: boolean;
  timestamp: Date;
}
```

---

## AI Router API

### Chat Completion

#### `chat(prompt, systemPrompt)` → `Promise<ChatResponse>`

Send a prompt to the configured AI model.

```typescript
interface ChatResponse {
  content: string;
  model: string;
  timestamp: Date;
  tokens_used?: number;
}
```

**Example:**
```javascript
const response = await aiRouter.chat(
  'What is Tesla's revenue for Q4 2024?',
  'You are a financial research assistant.'
);
console.log(response.content);
```

### Model Configuration

#### `setModel(endpoint, model, apiKey)` → `Promise<void>`

Configure the AI router with a new endpoint and model.

```typescript
interface ModelConfig {
  endpoint: string;           // URL to AI service
  model: string;              // Model name/ID
  apiKey?: string;            // API key (optional for local models)
}
```

**Available Models:**
- **Local:** `deepseek-coder`, `llama3`, `mistral` (via Ollama/LM Studio)
- **Cloud:** `gpt-4`, `deepseek-chat`, `claude-3`, custom endpoints

---

## Data Connector Interface

### Base Connector Class

All data connectors must implement this interface:

```typescript
abstract class BaseConnector {
  abstract fetch(url: string): Promise<any>;
  
  abstract parse(html: string): ExtractedData;
  
  abstract getMetadata(): ConnectorMetadata;
}

interface ConnectorMetadata {
  name: string;
  version: string;
  description: string;
  supportedDomains: string[];
  rateLimit?: number;
}
```

### SEC EDGAR Example

```typescript
class SecEdgarConnector extends BaseConnector {
  async fetch(url) {
    const response = await fetch(url);
    return response.text();
  }
  
  parse(html) {
    // Extract tables from SEC filings
    return {
      format: 'json',
      data: [/* parsed data */],
      columns: ['filing_date', 'cik', 'accession_number'],
      sourceUrl: url,
      timestamp: new Date()
    };
  }
  
  getMetadata() {
    return {
      name: 'sec-edgar',
      version: '1.0.0',
      description: 'SEC EDGAR filing parser',
      supportedDomains: ['*sec.gov']
    };
  }
}
```

---

## Frontend Component API

### AgentSidebar Props

```typescript
interface AgentSidebarProps {
  aiClient: AIChatClient;     // AI chat client instance
  onSettingsChange?: () => void;
}
```

### TabPanel Props

```typescript
interface TabPanelProps {
  tab: Tab;                   // Tab information
  onClose: (tabId: string) => void;
  onUpdateUrl?: (url: string, tabId: string) => void;
}
```

### TableExporter Component

```typescript
interface TableExporterProps {
  data: Array<any>;          // Extracted table data
  columns: string[];         // Column headers
  format: 'csv' | 'json';    // Export format
  onSave?: (filename: string) => void;
}
```

---

## Plugin API

### Plugin Interface

All plugins must conform to this structure:

```typescript
interface Plugin {
  name: string;              // Unique plugin identifier
  version: string;           // Semantic versioning
  type: 'data-connector' | 'ui-extension' | 'ai-agent';
  
  init(config): Promise<any>; // Initialization function
  
  dispose?(): void;          // Cleanup on uninstall (optional)
}
```

### Plugin Configuration Schema

```typescript
interface PluginConfig {
  name: string;
  version: string;
  type: 'data-connector' | 'ui-extension' | 'ai-agent';
  author?: string;
  license?: string;
  description: string;
  
  config?: {                 // Configuration options
    required: string[];      // Required config keys
    optional: Array<{        // Optional config keys
      key: string;
      type: 'string' | 'number' | 'boolean';
      default?: any;
    }>;
  };
  
  permissions?: string[];    // Required permissions
  
  manifest?: {               // Plugin metadata
    icon?: string;           // Icon URL/path
    displayName?: string;
    category?: string;
  };
}
```

### Data Connector Plugin Example

```typescript
// plugins/stock-screener/index.js

const plugin = {
  name: 'stock-screener',
  version: '1.0.0',
  type: 'data-connector',
  
  async init(config) {
    return new StockScreener({
      apiEndpoint: config.api_endpoint || 'https://api.stock-api.com',
      apiKey: config.api_key,
      rateLimit: config.rate_limit || 100 // requests per minute
    });
  },
  
  dispose() {
    // Cleanup resources
  }
};

export default plugin;
```

### UI Extension Plugin Example

```typescript
// plugins/custom-toolbar/index.js

const plugin = {
  name: 'custom-toolbar',
  version: '1.0.0',
  type: 'ui-extension',
  
  async init(config) {
    return {
      render() {
        return `
          <div class="custom-toolbar" data-plugin="stock-screener">
            <button id="screenStockBtn">Screen Stocks</button>
            <input type="text" id="tickerInput" placeholder="Enter ticker">
          </div>
        `;
      },
      
      handleEvents() {
        document.getElementById('screenStockBtn').addEventListener('click', () => {
          const ticker = document.getElementById('tickerInput').value;
          // Trigger stock screening
        });
      }
    };
  }
};

export default plugin;
```

---

## Event System

### IPC Events

#### `on('memory-critical')` → Function

Emit when memory usage exceeds critical threshold.

**Payload:**
```typescript
{
  used_mb: number;
  threshold_percent: number;
  timestamp: Date;
}
```

#### `on('tab-suspended')` → Function

Emit when a tab is automatically suspended.

**Payload:**
```typescript
{
  tabId: string;
  url: string;
  memory_mb: number;
  reason: 'memory-limit' | 'idle-timeout';
}
```

### Emitting Events

```javascript
// Backend emits event
ipc.emit('memory-critical', {
  used_mb: 800,
  threshold_percent: 75,
  timestamp: new Date()
});
```

---

## Security API

### Key Vault Operations

#### `storeKey(key, value)` → `Promise<void>`

Store an API key securely.

#### `getKey(key)` → `Promise<string>`

Retrieve a stored API key.

#### `deleteKey(key)` → `Promise<void>`

Remove a stored API key.

**Usage:**
```javascript
await ipc.invoke('storeKey', { key: 'openai_api_key', value: 'sk-...' });
const apiKey = await ipc.invoke('getKey', { key: 'openai_api_key' });
```

---

## Performance APIs

### Profile Mode

Enable/disable performance profiling:

```javascript
await ipc.invoke('setProfileMode', { enabled: true });
// Enables memory tracking and performance logging
```

### Batch Operations

Process multiple tabs efficiently:

```javascript
await ipc.invoke('batchSuspendTabs', {
  tabIds: ['tab1', 'tab2', 'tab3'],
  reason: 'user-request'
});
```

---

## Error Handling

All IPC calls return `Promise<Result<T, E>>`:

```typescript
type Result<T, E> = 
  | { success: true; data: T }
  | { success: false; error: string };
```

**Example:**
```javascript
const result = await ipc.invoke('fetchFinancialData', {
  provider: 'yahoo',
  symbol: 'TSLA'
});

if (!result.success) {
  console.error(result.error);
}
```

---

## Version Information

- **QanPrism Core:** `0.1.0`
- **Backend API:** Stable
- **Frontend API:** Stable
- **Plugin API:** Beta (may change in v1.0)

For the latest API changes, see the [CHANGELOG.md](./CHANGELOG.md).
