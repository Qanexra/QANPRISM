import React, { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import TabPanel from './components/TabPanel';
import AgentSidebar from './components/AgentSidebar';
import MemoryMonitor from './components/MemoryMonitor';
import DebugConsole from './components/DebugConsole';
import { Logger } from './utils/logger';
import { Minus, Square, X, Plus, Terminal } from 'lucide-react';

const STORAGE_KEY = 'qanprism_tabs';

function App() {
  const [tabs, setTabs] = useState([]);
  const [currentTabId, setCurrentTabId] = useState(null);
  const [aiClient] = useState(null);
  const [isDebugConsoleOpen, setIsDebugConsoleOpen] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  // Subscribe to logger error counts
  useEffect(() => {
    const unsubscribe = Logger.subscribe((_, count) => {
      setErrorCount(count);
    });
    return unsubscribe;
  }, []);

  // Restore tabs from localStorage on first load
  useEffect(() => {
    let restored = false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tabs && parsed.tabs.length > 0) {
          setTabs(parsed.tabs);
          setCurrentTabId(parsed.currentTabId || parsed.tabs[0].id);
          restored = true;
        }
      }
    } catch {
      // Corrupted storage, ignore
    }

    if (!restored) {
      const initialTab = {
        id: 'tab-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        url: 'https://www.google.com',
        title: 'New Tab',
        memory_mb: 45,
        suspended: false,
        createdAt: new Date().toISOString()
      };
      setTabs([initialTab]);
      setCurrentTabId(initialTab.id);
    }
  }, []);

  // Persist tabs to localStorage whenever they change
  useEffect(() => {
    if (tabs.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs, currentTabId }));
    }
  }, [tabs, currentTabId]);

  const handleUrlChange = (tabId, url) => {
    setTabs(prev => prev.map(t => {
      if (t.id === tabId && t.url !== url) {
        return { ...t, url };
      }
      return t;
    }));
  };

  const handleTitleChange = (tabId, title) => {
    setTabs(prev => prev.map(t => {
      if (t.id === tabId && t.title !== title) {
        return { ...t, title };
      }
      return t;
    }));
  };

  const closeTab = (tabId) => {
    invoke('close_tab_webview', { tabId }).catch(() => {});
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    if (currentTabId === tabId) {
      setCurrentTabId(newTabs[newTabs.length - 1]?.id || null);
    }
    if (newTabs.length === 0) {
      addNewTab();
    }
  };

  const addNewTab = (initialUrl = 'https://www.google.com') => {
    const newTab = {
      id: 'tab-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      url: initialUrl,
      title: 'New Tab',
      memory_mb: 30,
      suspended: false,
      createdAt: new Date().toISOString()
    };
    setTabs(prev => [...prev, newTab]);
    setCurrentTabId(newTab.id);
  };

  const appWindow = getCurrentWindow();
  const activeTab = tabs.find(t => t.id === currentTabId);

  return (
    <div className="app-container">
      {/* Chrome-style Titlebar & Tabs */}
      <nav className="top-bar">
        <div className="browser-brand" data-tauri-drag-region style={{ flex: '0 0 auto', paddingRight: '20px' }}>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.5px' }}>QP</span>
        </div>

        <div className="tab-strip">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`tab ${currentTabId === tab.id ? 'active' : ''}`}
              onClick={() => setCurrentTabId(tab.id)}
              title={tab.title}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.title}</span>
              <button onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}>×</button>
            </div>
          ))}
          <button 
            className="new-tab-btn"
            onClick={() => addNewTab()} 
            title="New Tab"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="menu-actions" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Debug Console Toggle Button with Error Counter */}
          <button
            onClick={() => setIsDebugConsoleOpen(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: isDebugConsoleOpen ? '#334155' : 'transparent',
              color: errorCount > 0 ? '#ef4444' : '#94a3b8',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Toggle Debug Diagnostics Console"
          >
            <Terminal size={14} />
            <span>Logs</span>
            {errorCount > 0 && (
              <span style={{
                backgroundColor: '#ef4444',
                color: '#fff',
                borderRadius: '8px',
                padding: '0 4px',
                fontSize: '9px',
                fontWeight: 700
              }}>
                {errorCount}
              </span>
            )}
          </button>

          <button onClick={async () => { try { await appWindow.minimize(); } catch(e) { console.error(e); } }} title="Minimize"><Minus size={14} /></button>
          <button onClick={async () => { try { await appWindow.toggleMaximize(); } catch(e) { console.error(e); } }} title="Maximize"><Square size={12} /></button>
          <button onClick={async () => { try { await appWindow.close(); } catch(e) { console.error(e); } }} className="close-btn" title="Close"><X size={14} /></button>
        </div>
      </nav>

      <div className="main-workspace">
        {/* Main browser area with preserved tabs */}
        <div className="browser-content" style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }}>
          {tabs.map(tab => (
            <div 
              key={tab.id}
              style={{ 
                display: tab.id === currentTabId ? 'flex' : 'none', 
                width: '100%', 
                height: '100%', 
                flexDirection: 'column' 
              }}
            >
              <TabPanel
                tab={tab}
                isActive={tab.id === currentTabId}
                onClose={() => closeTab(tab.id)}
                onUpdateUrl={(url) => handleUrlChange(tab.id, url)}
                onUpdateTitle={(title) => handleTitleChange(tab.id, title)}
              />
            </div>
          ))}

          {/* Live Debug Diagnostics Console Drawer */}
          <DebugConsole
            isOpen={isDebugConsoleOpen}
            onClose={() => setIsDebugConsoleOpen(false)}
          />
        </div>

        {/* Right sidebar with AI agent */}
        <AgentSidebar 
          aiClient={aiClient} 
          activeTabUrl={activeTab?.url || 'https://www.google.com'} 
          onOpenNewTab={addNewTab}
        />

        {/* Memory monitor inside workspace overlay */}
        <MemoryMonitor />
      </div>
    </div>
  );
}

export default App;
