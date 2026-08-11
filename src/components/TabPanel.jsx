import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, ArrowLeft, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Logger } from '../utils/logger';

const TabPanel = ({ tab, isActive, onClose, onUpdateUrl, onUpdateTitle }) => {
  const [urlInput, setUrlInput] = useState(tab.url);
  const [history, setHistory] = useState([tab.url]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showVisionOverlay, setShowVisionOverlay] = useState(false);
  
  const containerRef = useRef(null);
  const lastLoadedUrlRef = useRef('');

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

  useEffect(() => {
    // Legacy bounds updating removed for iframe native architecture
  }, []);

  const navigateTo = (newUrl) => {
    const finalUrl = getFinalUrl(newUrl);
    setUrlInput(finalUrl);
    
    // Check if we need to inject the bridge script for newly navigated URLs
    if (finalUrl !== tab.url) {
      if (containerRef.current && containerRef.current.contentWindow) {
        containerRef.current.contentWindow.postMessage({ type: 'QP_INJECT_BRIDGE' }, '*');
      }
    }
    
    onUpdateUrl(tab.id, finalUrl);
    
    // Add to history if it's a new navigation
    if (finalUrl !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(finalUrl);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };
    if (finalUrl !== tab.url) {
      onUpdateUrl(finalUrl);
    }
    const trimmedHistory = history.slice(0, historyIndex + 1);
    trimmedHistory.push(finalUrl);
    setHistory(trimmedHistory);
    setHistoryIndex(trimmedHistory.length - 1);
    lastLoadedUrlRef.current = finalUrl;

    invoke('navigate_tab_webview', { tabId: tab.id, url: finalUrl }).catch(e => console.warn(e));
  };

  const handleNavigate = (e) => {
    e.preventDefault();
    navigateTo(urlInput);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prevUrl = history[newIndex];
      setUrlInput(prevUrl);
      onUpdateUrl(prevUrl);
      invoke('navigate_tab_webview', { tabId: tab.id, url: prevUrl }).catch(e => console.warn(e));
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextUrl = history[newIndex];
      setUrlInput(nextUrl);
      onUpdateUrl(nextUrl);
      invoke('navigate_tab_webview', { tabId: tab.id, url: nextUrl }).catch(e => console.warn(e));
    }
  };

  const reload = () => {
    const currentUrl = history[historyIndex] || tab.url;
    invoke('navigate_tab_webview', { tabId: tab.id, url: currentUrl }).catch(e => console.warn(e));
  };

  const toggleVisionMarks = () => {
    const nextState = !showVisionOverlay;
    setShowVisionOverlay(nextState);
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  return (
    <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
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
        Native Iframe Architecture (QanPrism Protocol)
        This replaces the buggy Windows Native Webview Z-ordering with a rock solid
        React-native iframe that proxies natively through Rust.
      */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', backgroundColor: '#fff' }}>
        <iframe
          ref={containerRef}
          src={`http://qanprism.localhost/${encodeURIComponent(tab.url || 'https://www.google.com')}`}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          title={`Tab ${tab.id}`}
        />
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="tab-loading-overlay">
            <div className="spinner"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TabPanel;
