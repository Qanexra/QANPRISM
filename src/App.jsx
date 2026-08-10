import React, { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import TabPanel from './components/TabPanel';
import AgentSidebar from './components/AgentSidebar';
import MemoryMonitor from './components/MemoryMonitor';
import { Minus, Square, X, Plus } from 'lucide-react';

function App() {
  const [tabs, setTabs] = useState([]);
  const [currentTabId, setCurrentTabId] = useState(null);
  const [aiClient] = useState(null);

  useEffect(() => {
    const initialTab = {
      id: 'tab-' + Date.now(),
      url: 'https://example.com',
      title: 'Welcome to QanPrism',
      memory_mb: 45,
      suspended: false,
      createdAt: new Date()
    };
    setTabs([initialTab]);
    setCurrentTabId(initialTab.id);
  }, []);

  const handleUrlChange = (url) => {
    if (!currentTabId) return;
    setTabs(tabs.map(t => t.id === currentTabId ? { ...t, url, title: url } : t));
  };

  const closeTab = (tabId) => {
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    if (currentTabId === tabId) {
      setCurrentTabId(newTabs[newTabs.length - 1]?.id || null);
    }
  };

  const addNewTab = () => {
    const newTab = {
      id: 'tab-' + Date.now(),
      url: 'https://example.com',
      title: 'New Tab',
      memory_mb: 30,
      suspended: false,
      createdAt: new Date()
    };
    setTabs([...tabs, newTab]);
    setCurrentTabId(newTab.id);
  };

  const appWindow = getCurrentWindow();

  return (
    <div className="app-container">
      {/* Chrome-style Titlebar & Tabs */}
      <nav className="top-bar">
        <div className="browser-brand" data-tauri-drag-region style={{ flex: '0 0 auto', paddingRight: '20px' }}>
          <span style={{ fontSize: 16 }}>💎</span>
        </div>

        <div className="tab-strip">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`tab ${currentTabId === tab.id ? 'active' : ''}`}
              onClick={() => setCurrentTabId(tab.id)}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.title}</span>
              <button onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}>×</button>
            </div>
          ))}
          <button 
            className="new-tab-btn"
            onClick={addNewTab} 
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="menu-actions">
          <button onClick={async () => { try { await appWindow.minimize(); } catch(e) { alert('Minimize Error: ' + e); } }}><Minus size={14} /></button>
          <button onClick={async () => { try { await appWindow.toggleMaximize(); } catch(e) { alert('Maximize Error: ' + e); } }}><Square size={12} /></button>
          <button onClick={async () => { try { await appWindow.close(); } catch(e) { alert('Close Error: ' + e); } }} className="close-btn"><X size={14} /></button>
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
              />
            )
          ))}
        </div>

        {/* Right sidebar with AI agent */}
        <AgentSidebar 
          aiClient={aiClient} 
          activeTabUrl={tabs.find(t => t.id === currentTabId)?.url || 'https://example.com'} 
        />

        {/* Memory monitor inside workspace overlay */}
        <MemoryMonitor />
      </div>
    </div>
  );
}

export default App;
