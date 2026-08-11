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

  // Synchronize native child webview bounds and visibility with the container
  const updateWebviewBounds = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const finalUrl = getFinalUrl(tab.url);
      invoke('create_or_update_tab_webview', {
        tabId: tab.id,
        url: finalUrl,
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        visible: isActive
      }).catch(err => {
        console.warn("create_or_update_tab_webview error:", err);
      });
    }
  }, [tab.id, tab.url, isActive]);

  useEffect(() => {
    updateWebviewBounds();

    const handleResize = () => {
      updateWebviewBounds();
    };

    window.addEventListener('resize', handleResize);
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [updateWebviewBounds]);

  const navigateTo = (newUrl) => {
    const finalUrl = getFinalUrl(newUrl);
    setUrlInput(finalUrl);
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
          <RefreshCw size={16} className={isLoading ? "spinning" : ""} />
        </button>
        
        <form onSubmit={handleNavigate} style={{ display: 'flex', flex: 1, alignItems: 'center', position: 'relative' }}>
          <ShieldCheck size={14} color="#10b981" style={{ position: 'absolute', left: 12 }} />
          <input 
            type="text" 
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            style={{ paddingLeft: 36, paddingRight: 36 }}
            placeholder="Search or enter web address"
          />
        </form>

        {/* Vision Marks Toggle Button */}
        <button 
          onClick={toggleVisionMarks}
          style={{ 
            color: showVisionOverlay ? 'var(--accent-color, #3b82f6)' : 'var(--text-secondary, #94a3b8)',
            marginLeft: '4px'
          }}
          title={showVisionOverlay ? "Hide AI Vision Markers" : "Show AI Vision Markers (#IDs)"}
        >
          {showVisionOverlay ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>

      {/* Native Webview Viewport Host Element */}
      <div 
        ref={containerRef} 
        className="webview-viewport-host" 
        style={{ 
          flex: 1, 
          position: 'relative', 
          width: '100%', 
          height: '100%', 
          backgroundColor: '#0f172a' 
        }} 
      />
    </div>
  );
};

export default TabPanel;
