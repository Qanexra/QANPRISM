import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, ArrowLeft, ArrowRight, ShieldCheck, Search } from 'lucide-react';

const TabPanel = ({ tab, onClose, onUpdateUrl, onUpdateTitle }) => {
  const [urlInput, setUrlInput] = useState(tab.url);
  const [history, setHistory] = useState([tab.url]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const iframeRef = useRef(null);

  // Sync urlInput when tab.url changes externally
  useEffect(() => {
    setUrlInput(tab.url);
  }, [tab.url]);

  const isValidUrl = (str) => {
    try {
      const url = new URL(str.startsWith('http') ? str : `https://${str}`);
      // Check if it looks like a domain (has a dot and no spaces)
      return str.includes('.') && !str.includes(' ');
    } catch {
      return false;
    }
  };

  const navigateTo = (url) => {
    let finalUrl = url;
    if (!isValidUrl(url)) {
      // Treat as a search query
      finalUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    } else if (!finalUrl.startsWith('http')) {
      finalUrl = 'https://' + finalUrl;
    }

    // Trim forward history when navigating from middle of history
    const trimmedHistory = history.slice(0, historyIndex + 1);
    trimmedHistory.push(finalUrl);
    setHistory(trimmedHistory);
    setHistoryIndex(trimmedHistory.length - 1);

    setUrlInput(finalUrl);
    onUpdateUrl(finalUrl);
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
    if (iframeRef.current) {
      // Force reload by briefly setting src to empty then back
      const currentSrc = iframeRef.current.src;
      iframeRef.current.src = '';
      setTimeout(() => { iframeRef.current.src = currentSrc; }, 50);
    }
  };

  // Try to extract title from iframe on load
  const handleIframeLoad = () => {
    try {
      const doc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
      if (doc && doc.title) {
        onUpdateTitle(doc.title);
      }
    } catch {
      // Cross-origin — extract a readable title from the URL instead
      try {
        const url = new URL(tab.url);
        const host = url.hostname.replace('www.', '');
        const path = url.pathname === '/' ? '' : url.pathname.split('/').filter(Boolean).pop() || '';
        const title = path ? `${path} - ${host}` : host;
        onUpdateTitle(title.charAt(0).toUpperCase() + title.slice(1));
      } catch {
        // fallback — keep existing title
      }
    }
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  return (
    <div className="tab-panel">
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
          <RefreshCw size={16} />
        </button>
        
        <form onSubmit={handleNavigate} style={{ display: 'flex', flex: 1, alignItems: 'center', position: 'relative' }}>
          <ShieldCheck size={14} color="#10b981" style={{ position: 'absolute', left: 12 }} />
          <input 
            type="text" 
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            style={{ paddingLeft: 36 }}
            placeholder="Search or enter web address"
          />
        </form>
      </div>

      <div className="webview-placeholder">
        <iframe
          ref={iframeRef}
          src={tab.url}
          title={tab.title}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          onLoad={handleIframeLoad}
        />
      </div>
    </div>
  );
};

export default TabPanel;
