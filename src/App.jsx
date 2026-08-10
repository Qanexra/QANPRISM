import React, { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import TabPanel from './components/TabPanel';
import AgentSidebar from './components/AgentSidebar';
import MemoryMonitor from './components/MemoryMonitor';
import { Minus, Square, X, Plus } from 'lucide-react';

const STORAGE_KEY = 'qanprism_tabs';

function App() {
  const [tabs, setTabs] = useState([]);
  const [currentTabId, setCurrentTabId] = useState(null);
  const [aiClient] = useState(null);

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
        id: 'tab-' + Date.now(),
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

  const handleUrlChange = (url) => {
    if (!currentTabId) return;
    setTabs(prev => prev.map(t => t.id === currentTabId ? { ...t, url } : t));
  };

  const handleTitleChange = (title) => {
    if (!currentTabId) return;
    setTabs(prev => prev.map(t => t.id === currentTabId ? { ...t, title } : t));
  };

  const closeTab = (tabId) => {
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    if (currentTabId === tabId) {
      setCurrentTabId(newTabs[newTabs.length - 1]?.id || null);
    }
    if (newTabs.length === 0) {
      // If all tabs closed, open a fresh one
      addNewTab();
    }
  };

  const addNewTab = () => {
    const newTab = {
      id: 'tab-' + Date.now(),
      url: 'https://www.google.com',
      title: 'New Tab',
      memory_mb: 30,
      suspended: false,
      createdAt: new Date().toISOString()
    };
    setTabs(prev => [...prev, newTab]);
    setCurrentTabId(newTab.id);
  };

  const appWindow = getCurrentWindow();

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
            onClick={addNewTab} 
            title="New Tab"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="menu-actions">
          <button onClick={async () => { try { await appWindow.minimize(); } catch(e) { console.error(e); } }} title="Minimize"><Minus size={14} /></button>
          <button onClick={async () => { try { await appWindow.toggleMaximize(); } catch(e) { console.error(e); } }} title="Maximize"><Square size={12} /></button>
          <button onClick={async () => { try { await appWindow.close(); } catch(e) { console.error(e); } }} className="close-btn" title="Close"><X size={14} /></button>
        </div>
      </nav>

      <div className="main-workspace">
        {/* Main browser area */}
        <div className="browser-content">
          {tabs.map(tab => (
            tab.id === currentTabId && (
              <TabPanel
                key={tab.id}
                tab={tab}
                onClose={() => closeTab(tab.id)}
                onUpdateUrl={handleUrlChange}
                onUpdateTitle={handleTitleChange}
              />
            )
          ))}
        </div>

        {/* Right sidebar with AI agent */}
        <AgentSidebar 
          aiClient={aiClient} 
          activeTabUrl={tabs.find(t => t.id === currentTabId)?.url || 'https://www.google.com'} 
        />

        {/* Memory monitor inside workspace overlay */}
        <MemoryMonitor />
      </div>
    </div>
  );
}

export default App;
