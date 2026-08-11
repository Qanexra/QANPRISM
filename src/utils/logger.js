import { invoke } from '@tauri-apps/api/core';

class DebugLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 500;
    this.errorCount = 0;
    this.listeners = new Set();
    this.initGlobalHandlers();
  }

  initGlobalHandlers() {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.error('WindowError', event.message, `${event.filename}:${event.lineno}:${event.colno}`);
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason?.message || String(event.reason);
      this.error('UnhandledPromise', reason, event.reason?.stack);
    });
  }

  log(level, category, message, details = null) {
    const entry = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      timestamp: new Date().toLocaleTimeString() + '.' + String(new Date().getMilliseconds()).padStart(3, '0'),
      level: level.toUpperCase(),
      category,
      message,
      details: typeof details === 'object' ? JSON.stringify(details, null, 2) : details
    };

    if (entry.level === 'ERROR') {
      this.errorCount++;
    }

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Notify UI subscribers
    this.notify();

    // Persist to Rust disk logger in background
    invoke('log_event', {
      level: entry.level,
      category: entry.category,
      message: entry.message,
      details: entry.details
    }).catch(() => {});

    return entry;
  }

  info(category, message, details) {
    return this.log('INFO', category, message, details);
  }

  warn(category, message, details) {
    return this.log('WARN', category, message, details);
  }

  error(category, message, details) {
    return this.log('ERROR', category, message, details);
  }

  network(category, message, details) {
    return this.log('NETWORK', category, message, details);
  }

  agent(category, message, details) {
    return this.log('AGENT', category, message, details);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.logs, this.errorCount);
      } catch (err) {
        console.error("Logger listener error:", err);
      }
    }
  }

  async clear() {
    this.logs = [];
    this.errorCount = 0;
    this.notify();
    try {
      await invoke('clear_debug_logs');
    } catch {}
  }

  async fetchLogsFromBackend() {
    try {
      const backendLogs = await invoke('get_debug_logs');
      if (Array.isArray(backendLogs)) {
        this.logs = backendLogs;
        this.errorCount = backendLogs.filter(l => l.level === 'ERROR').length;
        this.notify();
      }
    } catch (err) {
      console.warn("Could not load backend logs:", err);
    }
  }
}

export const Logger = new DebugLogger();
