import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, ArrowLeft, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { INJECTED_AGENT_BRIDGE_SCRIPT } from '../utils/visionEngine';
import { Logger } from '../utils/logger';

const TabPanel = ({ tab, isActive, onClose, onUpdateUrl, onUpdateTitle }) => {
  const [urlInput, setUrlInput] = useState(tab.url);
  const [history, setHistory] = useState([tab.url]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [srcDoc, setSrcDoc] = useState('');
  const [fallbackSrc, setFallbackSrc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVisionOverlay, setShowVisionOverlay] = useState(false);
  
  const iframeRef = useRef(null);
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

  const isLocalhostUrl = (url) => {
    return url.startsWith('http://localhost') || 
           url.startsWith('https://localhost') || 
           url.startsWith('http://127.0.0.1') || 
           url.startsWith('https://127.0.0.1');
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

    // Map LinkedIn SPA login endpoint to canonical server-rendered login portal
    if (finalUrl.includes('linkedin.com/login') || finalUrl.includes('linkedin.com/uas/login')) {
      return 'https://www.linkedin.com/checkpoint/lg/login';
    }

    return finalUrl;
  };

  const prepareHtmlPayload = (rawHtml, resolvedUrl) => {
    if (!rawHtml || typeof rawHtml !== 'string') return '';

    const baseTag = `<base href="${resolvedUrl}" target="_self">`;
    let processed = rawHtml;

    // Inject base href cleanly if not present
    if (!processed.includes('<base ')) {
      if (processed.includes('<head>')) {
        processed = processed.replace('<head>', `<head>${baseTag}`);
      } else if (processed.includes('<head ')) {
        processed = processed.replace(/(<head[^>]*>)/i, `$1${baseTag}`);
      } else if (processed.includes('<html')) {
        processed = processed.replace(/(<html[^>]*>)/i, `$1<head>${baseTag}</head>`);
      } else {
        processed = baseTag + processed;
      }
    }

    // Inject Bridge Script at the very end of body to prevent React 18/SSR Hydration mismatch error #418
    const scriptPayload = `<script>${INJECTED_AGENT_BRIDGE_SCRIPT}</script>`;
    if (processed.includes('</body>')) {
      processed = processed.replace('</body>', `${scriptPayload}</body>`);
    } else if (processed.includes('</html>')) {
      processed = processed.replace('</html>', `${scriptPayload}</html>`);
    } else {
      processed = processed + scriptPayload;
    }

    return processed;
  };

  const loadUrl = useCallback(async (rawUrl) => {
    const finalUrl = getFinalUrl(rawUrl);
    if (finalUrl === lastLoadedUrlRef.current) return;
    lastLoadedUrlRef.current = finalUrl;

    setUrlInput(finalUrl);
    if (finalUrl !== tab.url) {
      onUpdateUrl(finalUrl);
    }

    // Localhost dev servers & internal apps load directly via native iframe
    if (isLocalhostUrl(finalUrl)) {
      setSrcDoc('');
      setFallbackSrc(finalUrl);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch webpage HTML via Rust reqwest engine with persistent cookies and browser headers
      const res = await invoke('fetch_page_context', { url: finalUrl });
      const rawHtml = typeof res === 'string' ? res : (res?.html || '');
      const resolvedUrl = (typeof res === 'object' && res?.url) ? res.url : finalUrl;

      if (resolvedUrl && resolvedUrl !== finalUrl) {
        setUrlInput(resolvedUrl);
        onUpdateUrl(resolvedUrl);
      }

      if (rawHtml && typeof rawHtml === 'string' && (rawHtml.includes('<html') || rawHtml.includes('<!DOCTYPE') || rawHtml.includes('<body'))) {
        const titleMatch = rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          const newTitle = titleMatch[1].trim();
          if (newTitle !== tab.title) {
            onUpdateTitle(newTitle);
          }
        }

        const processedHtml = prepareHtmlPayload(rawHtml, resolvedUrl);
        setFallbackSrc('');
        setSrcDoc(processedHtml);
      } else {
        setSrcDoc('');
        setFallbackSrc(resolvedUrl || finalUrl);
      }
    } catch (err) {
      console.warn("fetch_page_context failed, falling back to direct iframe:", err);
      setSrcDoc('');
      setFallbackSrc(finalUrl);
    } finally {
      setIsLoading(false);
    }
  }, [tab.url, tab.title, onUpdateUrl, onUpdateTitle]);

  const handleFormSubmit = useCallback(async (formUrl, method, formData) => {
    setIsLoading(true);
    try {
      const res = await invoke('submit_form_context', {
        url: formUrl,
        method: method || 'POST',
        formData: formData || {}
      });

      const rawHtml = typeof res === 'string' ? res : (res?.html || '');
      const resolvedUrl = (typeof res === 'object' && res?.url) ? res.url : formUrl;

      if (resolvedUrl && resolvedUrl !== tab.url) {
        setUrlInput(resolvedUrl);
        onUpdateUrl(resolvedUrl);
      }

      if (rawHtml && typeof rawHtml === 'string' && (rawHtml.includes('<html') || rawHtml.includes('<!DOCTYPE') || rawHtml.includes('<body'))) {
        const titleMatch = rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          const newTitle = titleMatch[1].trim();
          if (newTitle !== tab.title) {
            onUpdateTitle(newTitle);
          }
        }

        const processedHtml = prepareHtmlPayload(rawHtml, resolvedUrl);
        setFallbackSrc('');
        setSrcDoc(processedHtml);
      } else {
        setSrcDoc('');
        setFallbackSrc(resolvedUrl || formUrl);
      }
    } catch (err) {
      Logger.error('FormSubmit', `Form submit failed: ${err}`);
      console.warn("submit_form_context failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [tab.url, tab.title, onUpdateUrl, onUpdateTitle]);

  useEffect(() => {
    if (tab.url && tab.url !== lastLoadedUrlRef.current) {
      loadUrl(tab.url);
    }
  }, [tab.url, loadUrl]);

  // Handle messages from the iframe and commands from the Agent (scoped to active tab)
  useEffect(() => {
    const handleMessage = (event) => {
      if (!event.data) return;
      // Strict source isolation: ONLY process events originating from this tab's own iframe!
      if (event.source !== iframeRef.current?.contentWindow) return;

      if (event.data.type === 'QANPRISM_NAVIGATE' && event.data.url) {
        Logger.info('Navigation', `Tab [${tab.id}] navigating to -> ${event.data.url}`);
        navigateTo(event.data.url);
      } else if (event.data.type === 'QANPRISM_FORM_SUBMIT') {
        Logger.info('FormSubmit', `Tab [${tab.id}] submitting ${event.data.method} form to -> ${event.data.url}`);
        handleFormSubmit(event.data.url, event.data.method, event.data.formData);
      } else if (event.data.type === 'QANPRISM_API_REQUEST' && event.data.requestId) {
        invoke('fetch_api_context', {
          url: event.data.url,
          method: event.data.method || 'GET',
          headers: event.data.headers || {},
          body: event.data.body || null
        }).then((apiRes) => {
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
              type: 'QANPRISM_API_RESPONSE',
              requestId: event.data.requestId,
              status: apiRes.status,
              statusText: apiRes.status_text,
              headers: apiRes.headers,
              body: apiRes.body
            }, '*');
          }
        }).catch((apiErr) => {
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
              type: 'QANPRISM_API_RESPONSE',
              requestId: event.data.requestId,
              error: String(apiErr)
            }, '*');
          }
        });
      } else if (event.data.type === 'QANPRISM_LOG') {
        Logger.log(event.data.level || 'INFO', event.data.category || 'InPage', event.data.message || '', event.data.details);
      } else if (event.data.type === 'QP_BRIDGE_READY' && isActive) {
        Logger.info('Bridge', `AI Vision Bridge initialized for Tab [${tab.id}]`);
        window.dispatchEvent(new CustomEvent('QP_ACTIVE_TAB_BRIDGE_READY', { detail: { tabId: tab.id } }));
      } else if ((event.data.type === 'QP_AGENT_STATE_RESPONSE' || event.data.type === 'QP_AGENT_ACTION_RESULT') && isActive) {
        window.dispatchEvent(new CustomEvent(event.data.type, { detail: event.data }));
      }
    };

    // Agent -> Tab Panel command listener (only active tab responds)
    const handleAgentCommand = (e) => {
      if (!isActive || !iframeRef.current || !iframeRef.current.contentWindow) return;
      const { action, actionId, requestId, type } = e.detail || {};

      if (type === 'QP_AGENT_EXECUTE_ACTION') {
        iframeRef.current.contentWindow.postMessage({
          type: 'QP_AGENT_EXECUTE_ACTION',
          action,
          actionId
        }, '*');
      } else if (type === 'QP_AGENT_GET_STATE') {
        iframeRef.current.contentWindow.postMessage({
          type: 'QP_AGENT_GET_STATE',
          requestId
        }, '*');
      } else if (type === 'QP_AGENT_TOGGLE_BADGES') {
        iframeRef.current.contentWindow.postMessage({
          type: 'QP_AGENT_TOGGLE_BADGES',
          show: e.detail.show
        }, '*');
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('QP_DISPATCH_TO_TAB', handleAgentCommand);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('QP_DISPATCH_TO_TAB', handleAgentCommand);
    };
  }, [tab.id, isActive, history, historyIndex, handleFormSubmit]); // eslint-disable-line react-hooks/exhaustive-deps

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
    lastLoadedUrlRef.current = ''; // force reload
    loadUrl(currentUrl);
  };

  const toggleVisionMarks = () => {
    const nextState = !showVisionOverlay;
    setShowVisionOverlay(nextState);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'QP_AGENT_TOGGLE_BADGES',
        show: nextState
      }, '*');
    }
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
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : null}
      </div>
    </div>
  );
};

export default TabPanel;
