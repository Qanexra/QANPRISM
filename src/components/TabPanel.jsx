import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, ArrowLeft, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

const TabPanel = ({ tab, isActive, onClose, onUpdateUrl, onUpdateTitle }) => {
  const [urlInput, setUrlInput] = useState(tab.url);
  const [history, setHistory] = useState([tab.url]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showVisionOverlay, setShowVisionOverlay] = useState(false);
  
  const viewportRef = useRef(null);
  const createdRef = useRef(false);

  const isValidUrl = (str) => {
    const trimmed = (str || '').trim();
    if (!trimmed || trimmed.includes(' ')) return false;

    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) {
      try {
        new URL(trimmed);
        return true;
      } catch {
        return false;
      }
    }

    if (trimmed.startsWith('localhost:') || trimmed === 'localhost' || trimmed.startsWith('localhost/')) {
      return true;
    }

    try {
      const url = new URL(`https://${trimmed}`);
      return url.hostname.includes('.') || url.hostname === 'localhost';
    } catch {
      return false;
    }
  };

  const getFinalUrl = (url) => {
    let finalUrl = (url || '').trim();
    if (!finalUrl) return 'https://www.google.com';
    
    if (!isValidUrl(finalUrl)) {
      return `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
    }
    
    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(finalUrl)) {
      if (finalUrl.startsWith('localhost') || finalUrl.startsWith('127.0.0.1')) {
        return 'http://' + finalUrl;
      }
      return 'https://' + finalUrl;
    }

    return finalUrl;
  };

  // Sync URL input when tab.url changes
  useEffect(() => {
    setUrlInput(tab.url);
  }, [tab.url]);

  // Synchronize native webview position and size with the DOM viewport
  const syncBounds = useCallback(() => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    if (isActive) {
      if (!createdRef.current) {
        createdRef.current = true;
        invoke('create_tab_webview', {
          tabId: tab.id,
          url: tab.url || 'https://www.google.com',
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }).catch(err => console.error('Failed to create tab webview:', err));
      } else {
        invoke('set_tab_webview_active', {
          activeTabId: tab.id,
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }).catch(err => console.error('Failed to set tab webview active:', err));
      }
    }
  }, [isActive, tab.id, tab.url]);

  // Sync bounds on mount, active state change, and tab changes
  useEffect(() => {
    // Small timeout to allow layout flow to settle
    const timer = setTimeout(() => {
      syncBounds();
    }, 50);

    return () => clearTimeout(timer);
  }, [syncBounds]);

  // ResizeObserver to track layout changes (window resize, sidebar toggle)
  useEffect(() => {
    if (!viewportRef.current) return;

    const observer = new ResizeObserver(() => {
      if (isActive && viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          invoke('update_tab_webview_bounds', {
            tabId: tab.id,
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }).catch(() => {});
        }
      }
    });

    observer.observe(viewportRef.current);
    window.addEventListener('resize', syncBounds);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncBounds);
    };
  }, [isActive, syncBounds, tab.id]);

  const navigateTo = (newUrl) => {
    const finalUrl = getFinalUrl(newUrl);
    setUrlInput(finalUrl);
    
    invoke('navigate_tab_webview', {
      tabId: tab.id,
      url: finalUrl
    }).catch(err => console.error('Failed to navigate native webview:', err));

    onUpdateUrl(finalUrl);
    
    if (finalUrl !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(finalUrl);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const goBack = () => {
    invoke('tab_go_back', { tabId: tab.id }).catch(() => {});
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prevUrl = history[newIndex];
      setUrlInput(prevUrl);
      onUpdateUrl(prevUrl);
    }
  };

  const goForward = () => {
    invoke('tab_go_forward', { tabId: tab.id }).catch(() => {});
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextUrl = history[newIndex];
      setUrlInput(nextUrl);
      onUpdateUrl(nextUrl);
    }
  };

  const reload = () => {
    invoke('tab_reload', { tabId: tab.id }).catch(() => {});
  };

  const toggleVisionMarks = () => {
    const nextState = !showVisionOverlay;
    setShowVisionOverlay(nextState);
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  return (
    <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Chrome-style Address Bar */}
      <div className="address-bar-container" style={{ zIndex: 10 }}>
        <button
          onClick={goBack}
          disabled={!canGoBack}
          style={{ opacity: canGoBack ? 1 : 0.3, cursor: canGoBack ? 'pointer' : 'default' }}
          title="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <button
          onClick={goForward}
          disabled={!canGoForward}
          style={{ opacity: canGoForward ? 1 : 0.3, cursor: canGoForward ? 'pointer' : 'default' }}
          title="Forward"
        >
          <ArrowRight size={16} />
        </button>
        <button onClick={reload} title="Reload">
          <RefreshCw size={16} />
        </button>
        <div className="url-input-wrapper">
          <ShieldCheck size={16} className="security-icon" />
          <form onSubmit={(e) => {
            e.preventDefault();
            navigateTo(urlInput);
          }} style={{ width: '100%' }}>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="url-input"
              onFocus={(e) => e.target.select()}
            />
          </form>
        </div>
        <button 
          onClick={toggleVisionMarks} 
          title="Toggle AI Vision"
          className={showVisionOverlay ? 'active' : ''}
        >
          {showVisionOverlay ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      
      {/* 
        Native Viewport Anchor (Ladybird / Tauri v2 Native Architecture)
        This DOM element acts as the precise geometric anchor for the native Windows WebView2 child view.
        No iframes, no URL proxy rewriting, no CORS/cookie conflicts.
      */}
      <div 
        ref={viewportRef}
        className="native-webview-viewport"
        style={{ 
          flex: 1, 
          position: 'relative', 
          width: '100%', 
          height: '100%', 
          backgroundColor: '#1e1e2e' 
        }}
      />
    </div>
  );
};

export default TabPanel;
