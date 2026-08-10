import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, ArrowLeft, ArrowRight, ShieldCheck, Search } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

const TabPanel = ({ tab, onClose, onUpdateUrl, onUpdateTitle }) => {
  const [urlInput, setUrlInput] = useState(tab.url);
  const [history, setHistory] = useState([tab.url]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [srcDoc, setSrcDoc] = useState('');
  const [fallbackSrc, setFallbackSrc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const iframeRef = useRef(null);

  const isValidUrl = (str) => {
    const trimmed = (str || '').trim();
    if (!trimmed || trimmed.includes(' ')) return false;

    // Check if it already has a protocol like http://, https://, or file://
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) {
      try {
        new URL(trimmed);
        return true;
      } catch {
        return false;
      }
    }

    // Check for localhost or IP with port
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

  const loadUrl = useCallback(async (rawUrl) => {
    const finalUrl = getFinalUrl(rawUrl);
    setUrlInput(finalUrl);
    onUpdateUrl(finalUrl);
    setIsLoading(true);
    setLoadError(null);

    try {
      // 1. Fetch the raw webpage HTML via Rust reqwest engine (bypasses CORS & X-Frame-Options)
      const rawHtml = await invoke('fetch_page_context', { url: finalUrl });

      if (rawHtml && typeof rawHtml === 'string' && (rawHtml.includes('<html') || rawHtml.includes('<!DOCTYPE') || rawHtml.includes('<body'))) {
        // Extract title
        const titleMatch = rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          onUpdateTitle(titleMatch[1].trim());
        }

        // Script to inject for link navigation & form submission interception
        const interceptScript = `
          <script>
            document.addEventListener('click', function(e) {
              var target = e.target.closest('a');
              if (target && target.href && !target.href.startsWith('javascript:')) {
                e.preventDefault();
                window.parent.postMessage({ type: 'QANPRISM_NAVIGATE', url: target.href }, '*');
              }
            }, true);
            document.addEventListener('submit', function(e) {
              var form = e.target;
              if (form && form.action) {
                var method = (form.method || 'GET').toUpperCase();
                if (method === 'GET') {
                  e.preventDefault();
                  var formData = new FormData(form);
                  var params = new URLSearchParams(formData);
                  var actionUrl = form.action + (form.action.includes('?') ? '&' : '?') + params.toString();
                  window.parent.postMessage({ type: 'QANPRISM_NAVIGATE', url: actionUrl }, '*');
                }
              }
            }, true);
          </script>
        `;

        // Base tag so relative resources (CSS, JS, images, fonts) resolve to origin domain
        const baseTag = `<base href="${finalUrl}" target="_self">`;

        let processedHtml = rawHtml;
        if (processedHtml.includes('<head>')) {
          processedHtml = processedHtml.replace('<head>', `<head>${baseTag}${interceptScript}`);
        } else if (processedHtml.includes('<html')) {
          processedHtml = processedHtml.replace(/(<html[^>]*>)/i, `$1<head>${baseTag}${interceptScript}</head>`);
        } else {
          processedHtml = `${baseTag}${interceptScript}` + processedHtml;
        }

        setFallbackSrc('');
        setSrcDoc(processedHtml);
      } else {
        // Not HTML or empty, fallback to standard iframe
        setSrcDoc('');
        setFallbackSrc(finalUrl);
      }
    } catch (err) {
      console.warn("fetch_page_context failed, falling back to direct iframe:", err);
      setSrcDoc('');
      setFallbackSrc(finalUrl);
    } finally {
      setIsLoading(false);
    }
  }, [onUpdateUrl, onUpdateTitle]);

  // Initial load or external tab URL change
  useEffect(() => {
    loadUrl(tab.url);
  }, [tab.url]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for iframe navigation events
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'QANPRISM_NAVIGATE' && event.data.url) {
        navigateTo(event.data.url);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [history, historyIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateTo = (url) => {
    const finalUrl = getFinalUrl(url);
    const trimmedHistory = history.slice(0, historyIndex + 1);
    trimmedHistory.push(finalUrl);
    setHistory(trimmedHistory);
    setHistoryIndex(trimmedHistory.length - 1);
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
      loadUrl(prevUrl);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextUrl = history[newIndex];
      loadUrl(nextUrl);
    }
  };

  const reload = () => {
    const currentUrl = history[historyIndex] || tab.url;
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
            style={{ paddingLeft: 36 }}
            placeholder="Search or enter web address"
          />
        </form>
      </div>

      <div className="webview-placeholder" style={{ flex: 1, position: 'relative', width: '100%', height: '100%', backgroundColor: '#fff' }}>
        {srcDoc ? (
          <iframe
            ref={iframeRef}
            srcDoc={srcDoc}
            title={tab.title || "Browser View"}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : fallbackSrc ? (
          <iframe
            ref={iframeRef}
            src={fallbackSrc}
            title={tab.title || "Browser View"}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : null}
      </div>
    </div>
  );
};

export default TabPanel;
