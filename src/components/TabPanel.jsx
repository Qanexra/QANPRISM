import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

const TabPanel = ({ tab, isActive, onClose, onUpdateUrl, onUpdateTitle }) => {
  const [urlInput, setUrlInput] = useState(tab.url);
  const [history, setHistory] = useState([tab.url]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
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

  const syncNativeWebview = useCallback(async (targetUrl) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    try {
      await invoke('create_or_update_tab_webview', {
        label: tab.id,
        url: targetUrl,
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
    } catch (err) {
      console.warn("create_or_update_tab_webview error:", err);
    }
  }, [tab.id]);

  const loadUrl = useCallback(async (rawUrl) => {
    const finalUrl = getFinalUrl(rawUrl);
    if (finalUrl === lastLoadedUrlRef.current) return;
    lastLoadedUrlRef.current = finalUrl;

    setUrlInput(finalUrl);
    if (finalUrl !== tab.url) {
      onUpdateUrl(finalUrl);
    }

    setIsLoading(true);
    await syncNativeWebview(finalUrl);
    setIsLoading(false);
  }, [tab.url, onUpdateUrl, syncNativeWebview]);

  // Initial load or tab URL change
  useEffect(() => {
    if (tab.url && tab.url !== lastLoadedUrlRef.current) {
      loadUrl(tab.url);
    }
  }, [tab.url, loadUrl]);

  // Visibility management when switching tabs
  useEffect(() => {
    invoke('set_tab_webview_visibility', {
      label: tab.id,
      visible: isActive
    }).catch(() => {});

    if (isActive && lastLoadedUrlRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        invoke('set_tab_webview_bounds', {
          label: tab.id,
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }).catch(() => {});
      }
    }
  }, [tab.id, isActive]);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && isActive) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          invoke('set_tab_webview_bounds', {
            label: tab.id,
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }).catch(() => {});
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tab.id, isActive]);

  // Clean up native webview on tab close
  useEffect(() => {
    return () => {
      invoke('close_tab_webview', { label: tab.id }).catch(() => {});
    };
  }, [tab.id]);

  const navigateTo = (url) => {
    const finalUrl = getFinalUrl(url);
    const trimmedHistory = history.slice(0, historyIndex + 1);
    trimmedHistory.push(finalUrl);
    setHistory(trimmedHistory);
    setHistoryIndex(trimmedHistory.length - 1);
    lastLoadedUrlRef.current = '';
    loadUrl(finalUrl);
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
      lastLoadedUrlRef.current = '';
      loadUrl(prevUrl);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextUrl = history[newIndex];
      lastLoadedUrlRef.current = '';
      loadUrl(nextUrl);
    }
  };

  const reload = () => {
    const currentUrl = history[historyIndex] || tab.url;
    lastLoadedUrlRef.current = '';
    loadUrl(currentUrl);
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  return (
    <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div className="address-bar-container">
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
      </div>

      {/* Native Webview Container */}
      <div 
        ref={containerRef} 
        className="webview-placeholder" 
        style={{ flex: 1, position: 'relative', width: '100%', height: '100%', backgroundColor: '#fff' }}
      />
    </div>
  );
};

export default TabPanel;
