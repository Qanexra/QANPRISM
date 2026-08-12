import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, ArrowLeft, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

import { Logger } from '../utils/logger';

const buildProxySrc = (url) =>
  `http://qanprism.localhost/${encodeURIComponent(url || 'https://www.google.com')}`;

const TabPanel = ({ tab, isActive, onClose, onUpdateUrl, onUpdateTitle }) => {
  const [urlInput, setUrlInput] = useState(tab.url);
  const [history, setHistory] = useState([tab.url]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showVisionOverlay, setShowVisionOverlay] = useState(false);
  
  const containerRef = useRef(null);
  const lastLoadedUrlRef = useRef(tab.url);

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

  // Sync URL input when tab.url changes from outside (e.g. restored from localStorage)
  useEffect(() => {
    setUrlInput(tab.url);
  }, [tab.url]);

  // Navigate the iframe when tab.url changes — imperatively, without destroying the iframe
  useEffect(() => {
    if (tab.url && tab.url !== lastLoadedUrlRef.current) {
      lastLoadedUrlRef.current = tab.url;
      if (containerRef.current) {
        containerRef.current.src = buildProxySrc(tab.url);
      }
    }
  }, [tab.url]);

  const navigateTo = (newUrl) => {
    const finalUrl = getFinalUrl(newUrl);
    setUrlInput(finalUrl);
    
    onUpdateUrl(finalUrl);
    
    // Add to history if it's a new navigation
    if (finalUrl !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(finalUrl);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prevUrl = history[newIndex];
      setUrlInput(prevUrl);
      onUpdateUrl(prevUrl);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextUrl = history[newIndex];
      setUrlInput(nextUrl);
      onUpdateUrl(nextUrl);
    }
  };

  const reload = () => {
    if (containerRef.current) {
      containerRef.current.src = containerRef.current.src;
    }
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
          src={buildProxySrc(tab.url)}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
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
