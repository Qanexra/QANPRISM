/**
 * Vision & Interactive Element Grounding Engine for QanPrism
 * 
 * Provides:
 * 1. Script injection to index all interactive elements with numerical IDs (#1, #2, #3...)
 * 2. Visual Set-of-Marks (SoM) badge overlay generator for Vision models
 * 3. Element interaction dispatcher (click, type, scroll)
 * 4. Search and link navigation interceptor for cross-origin browsing
 * 5. Frame-busting / Clickjacking spoofing so secure login pages run smoothly
 * 6. In-page JavaScript error and diagnostic capture
 * 7. In-page fetch & XHR proxy bridge to bypass iframe CORS blocks for Single Page Apps (LinkedIn, Twitter, etc.)
 * 8. Safe Storage & Location Polyfills for SPA client-side routers
 */

export const INJECTED_AGENT_BRIDGE_SCRIPT = `
(function() {
  if (window.__QANPRISM_BRIDGE_INITIALIZED__) return;
  window.__QANPRISM_BRIDGE_INITIALIZED__ = true;

  // In-page error diagnostic logger
  window.addEventListener('error', function(e) {
    window.parent.postMessage({
      type: 'QANPRISM_LOG',
      level: 'ERROR',
      category: 'InPageJS',
      message: e.message || 'Script error',
      details: (e.filename || '') + ':' + (e.lineno || '') + ':' + (e.colno || '')
    }, '*');
  });

  window.addEventListener('unhandledrejection', function(e) {
    var reason = (e.reason && e.reason.message) ? e.reason.message : String(e.reason);
    window.parent.postMessage({
      type: 'QANPRISM_LOG',
      level: 'ERROR',
      category: 'InPagePromise',
      message: reason,
      details: (e.reason && e.reason.stack) ? e.reason.stack : null
    }, '*');
  });

  // Frame-busting / Clickjacking spoofing
  try {
    Object.defineProperty(window, 'top', { get: function() { return window; }, configurable: true });
    Object.defineProperty(window, 'parent', { get: function() { return window; }, configurable: true });
    Object.defineProperty(window, 'frameElement', { get: function() { return null; }, configurable: true });
  } catch(e) {}

  // Safe In-Memory Storage Polyfill (prevents SecurityError when SPAs access localStorage/sessionStorage)
  (function() {
    function createMockStorage() {
      var store = {};
      return {
        getItem: function(key) { return store[key] !== undefined ? store[key] : null; },
        setItem: function(key, val) { store[key] = String(val); },
        removeItem: function(key) { delete store[key]; },
        clear: function() { store = {}; },
        key: function(idx) { return Object.keys(store)[idx] || null; },
        get length() { return Object.keys(store).length; }
      };
    }

    try {
      if (!window.localStorage || typeof window.localStorage.getItem !== 'function') {
        var mockLocal = createMockStorage();
        Object.defineProperty(window, 'localStorage', { get: function() { return mockLocal; }, configurable: true });
      }
    } catch(e) {
      try {
        var fallbackLocal = createMockStorage();
        Object.defineProperty(window, 'localStorage', { get: function() { return fallbackLocal; }, configurable: true });
      } catch(err) {}
    }

    try {
      if (!window.sessionStorage || typeof window.sessionStorage.getItem !== 'function') {
        var mockSession = createMockStorage();
        Object.defineProperty(window, 'sessionStorage', { get: function() { return mockSession; }, configurable: true });
      }
    } catch(e) {
      try {
        var fallbackSession = createMockStorage();
        Object.defineProperty(window, 'sessionStorage', { get: function() { return fallbackSession; }, configurable: true });
      } catch(err) {}
    }
  })();

  // In-page API Proxy Bridge for SPAs (LinkedIn, Twitter, Google, etc.)
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    var originalFetch = window.fetch;
    window.fetch = function(input, init) {
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      if (url && (url.startsWith('/') || url.startsWith('http'))) {
        var absoluteUrl = url.startsWith('http') ? url : (document.baseURI ? new URL(url, document.baseURI).href : url);
        return new Promise(function(resolve, reject) {
          var requestId = 'req-' + Math.random().toString(36).substring(2) + Date.now();

          function onResponse(event) {
            if (event.data && event.data.type === 'QANPRISM_API_RESPONSE' && event.data.requestId === requestId) {
              window.removeEventListener('message', onResponse);
              if (event.data.error) {
                reject(new Error(event.data.error));
              } else {
                var responseHeaders = new Headers();
                if (event.data.headers) {
                  for (var k in event.data.headers) {
                    responseHeaders.append(k, event.data.headers[k]);
                  }
                }
                var resp = new Response(event.data.body || '', {
                  status: event.data.status || 200,
                  statusText: event.data.statusText || 'OK',
                  headers: responseHeaders
                });
                resolve(resp);
              }
            }
          }

          window.addEventListener('message', onResponse);

          var method = (init && init.method) ? init.method : 'GET';
          var reqHeaders = {};
          if (init && init.headers) {
            if (init.headers instanceof Headers) {
              init.headers.forEach(function(val, key) { reqHeaders[key] = val; });
            } else if (typeof init.headers === 'object') {
              reqHeaders = init.headers;
            }
          }

          window.parent.postMessage({
            type: 'QANPRISM_API_REQUEST',
            requestId: requestId,
            url: absoluteUrl,
            method: method,
            headers: reqHeaders,
            body: (init && init.body) ? String(init.body) : null
          }, '*');
        });
      }
      return originalFetch.apply(this, arguments);
    };

    // Also bridge XMLHttpRequest for SPAs
    function BridgedXHR() {
      var _url = '';
      var _method = 'GET';
      var _headers = {};

      var self = this;
      this.readyState = 0;
      this.status = 0;
      this.statusText = '';
      this.responseText = '';
      this.response = '';
      this.onreadystatechange = null;
      this.onload = null;
      this.onerror = null;

      this.open = function(method, url) {
        _method = method;
        _url = url;
        self.readyState = 1;
        if (self.onreadystatechange) self.onreadystatechange();
      };

      this.setRequestHeader = function(header, value) {
        _headers[header] = value;
      };

      this.send = function(body) {
        var absoluteUrl = _url.startsWith('http') ? _url : (document.baseURI ? new URL(_url, document.baseURI).href : _url);
        var requestId = 'xhr-' + Math.random().toString(36).substring(2) + Date.now();

        function onXhrResponse(event) {
          if (event.data && event.data.type === 'QANPRISM_API_RESPONSE' && event.data.requestId === requestId) {
            window.removeEventListener('message', onXhrResponse);
            if (event.data.error) {
              if (self.onerror) self.onerror(new Error(event.data.error));
            } else {
              self.readyState = 4;
              self.status = event.data.status || 200;
              self.statusText = event.data.statusText || 'OK';
              self.responseText = event.data.body || '';
              self.response = event.data.body || '';
              if (self.onreadystatechange) self.onreadystatechange();
              if (self.onload) self.onload();
            }
          }
        }

        window.addEventListener('message', onXhrResponse);

        window.parent.postMessage({
          type: 'QANPRISM_API_REQUEST',
          requestId: requestId,
          url: absoluteUrl,
          method: _method,
          headers: _headers,
          body: body ? String(body) : null
        }, '*');
      };

      this.abort = function() {};
      this.getResponseHeader = function(name) { return null; };
      this.getAllResponseHeaders = function() { return ''; };
    }
    window.XMLHttpRequest = BridgedXHR;
  }

  var elementMap = {};
  var overlayContainer = null;

  // Intercept link clicks
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a[href]');
    if (a && a.href && !a.href.startsWith('javascript:') && !a.href.startsWith('#')) {
      e.preventDefault();
      e.stopPropagation();
      window.parent.postMessage({ type: 'QANPRISM_NAVIGATE', url: a.href }, '*');
      return false;
    }
  }, true);

  // Intercept all form submissions (POST logins, GET searches)
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form) return;

    // Do not intercept if running on localhost (localhost processes forms natively)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    var method = (form.method || 'GET').toUpperCase();
    var actionUrl = form.action || window.location.href;

    var formData = {};
    var elements = form.elements;
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (el.name && !el.disabled) {
        if (el.type === 'checkbox' || el.type === 'radio') {
          if (el.checked) formData[el.name] = el.value || 'on';
        } else {
          formData[el.name] = el.value || '';
        }
      }
    }

    window.parent.postMessage({
      type: 'QANPRISM_FORM_SUBMIT',
      url: actionUrl,
      method: method,
      formData: formData
    }, '*');

    return false;
  }, true);

  // Intercept window.open
  window.open = function(url) {
    if (url) {
      window.parent.postMessage({ type: 'QANPRISM_NAVIGATE', url: url }, '*');
    }
    return null;
  };

  // Scan and index all interactive DOM elements
  function indexInteractiveElements() {
    elementMap = {};
    var interactiveSelectors = [
      'a[href]',
      'button',
      'input',
      'textarea',
      'select',
      '[role="button"]',
      '[role="link"]',
      '[role="checkbox"]',
      '[role="menuitem"]',
      '[role="tab"]',
      '[tabindex]:not([tabindex="-1"])',
      '[onclick]'
    ];

    var allElements = document.querySelectorAll(interactiveSelectors.join(','));
    var visibleElements = [];
    var count = 1;

    for (var i = 0; i < allElements.length; i++) {
      var el = allElements[i];
      var rect = el.getBoundingClientRect();
      var style = window.getComputedStyle(el);

      // Check visibility
      if (rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0') {
        var text = (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || el.title || el.alt || '').trim();
        text = text.replace(/\\s+/g, ' ').substring(0, 100);

        var id = count++;
        el.setAttribute('data-qp-id', id);
        
        var elementInfo = {
          id: id,
          tag: el.tagName.toLowerCase(),
          type: el.type || '',
          text: text,
          href: el.href || '',
          placeholder: el.placeholder || '',
          name: el.name || '',
          rect: {
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        };

        elementMap[id] = el;
        visibleElements.push(elementInfo);
      }
    }

    return visibleElements;
  }

  // Toggle visual Set-of-Marks badge overlays
  function toggleVisualBadges(show) {
    if (overlayContainer) {
      overlayContainer.remove();
      overlayContainer = null;
    }

    if (!show) return;

    overlayContainer = document.createElement('div');
    overlayContainer.id = 'qp-vision-overlay';
    overlayContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483647;';

    var elements = indexInteractiveElements();
    for (var i = 0; i < elements.length; i++) {
      var item = elements[i];
      var badge = document.createElement('div');
      badge.innerText = item.id;
      badge.style.cssText = 'position:fixed;left:' + item.rect.left + 'px;top:' + item.rect.top + 'px;' +
        'background:rgba(239, 68, 68, 0.95);color:#ffffff;font-size:10px;font-weight:bold;font-family:sans-serif;' +
        'padding:1px 4px;border-radius:3px;box-shadow:0 1px 3px rgba(0,0,0,0.5);border:1px solid #ffffff;z-index:2147483647;pointer-events:none;';
      overlayContainer.appendChild(badge);
    }

    document.body.appendChild(overlayContainer);
  }

  // Execute browser action
  function executeAction(action) {
    if (!action || !action.type) return { success: false, error: 'Invalid action payload' };

    switch (action.type) {
      case 'CLICK': {
        var el = elementMap[action.elementId] || document.querySelector(action.selector || '[data-qp-id="' + action.elementId + '"]');
        if (!el) return { success: false, error: 'Element #' + action.elementId + ' not found' };

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        
        var clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
        el.dispatchEvent(clickEvent);

        if (el.tagName === 'A' && el.href) {
          window.parent.postMessage({ type: 'QANPRISM_NAVIGATE', url: el.href }, '*');
        } else if (el.tagName === 'BUTTON' && el.type === 'submit' && el.form) {
          el.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }

        return { success: true, message: 'Clicked #' + action.elementId };
      }

      case 'TYPE': {
        var el = elementMap[action.elementId] || document.querySelector(action.selector || '[data-qp-id="' + action.elementId + '"]');
        if (!el) return { success: false, error: 'Input #' + action.elementId + ' not found' };

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        el.value = action.text;
        
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));

        if (action.pressEnter) {
          var enterEvent = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', keyCode: 13 });
          el.dispatchEvent(enterEvent);
          if (el.form) {
            el.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          }
        }

        return { success: true, message: 'Typed into #' + action.elementId };
      }

      case 'SCROLL': {
        var distance = action.pixels || (action.direction === 'UP' ? -500 : 500);
        window.scrollBy({ top: distance, behavior: 'smooth' });
        return { success: true, message: 'Scrolled ' + action.direction };
      }

      case 'GET_INTERACTIVE_ELEMENTS': {
        var elements = indexInteractiveElements();
        return { success: true, elements: elements };
      }

      default:
        return { success: false, error: 'Unknown action type: ' + action.type };
    }
  }

  // Listen for agent commands from parent frame
  window.addEventListener('message', function(event) {
    if (!event.data || !event.data.type || !event.data.type.startsWith('QP_AGENT_')) return;

    if (event.data.type === 'QP_AGENT_EXECUTE_ACTION') {
      var result = executeAction(event.data.action);
      window.parent.postMessage({
        type: 'QP_AGENT_ACTION_RESULT',
        actionId: event.data.actionId,
        result: result
      }, '*');
    } else if (event.data.type === 'QP_AGENT_GET_STATE') {
      var elements = indexInteractiveElements();
      window.parent.postMessage({
        type: 'QP_AGENT_STATE_RESPONSE',
        requestId: event.data.requestId,
        elements: elements,
        title: document.title,
        url: window.location.href
      }, '*');
    } else if (event.data.type === 'QP_AGENT_TOGGLE_BADGES') {
      toggleVisualBadges(event.data.show);
    }
  });

  // Announce bridge ready
  window.parent.postMessage({ type: 'QP_BRIDGE_READY' }, '*');
})();
`;

/**
 * Format interactive element list for the LLM prompt
 */
export function formatInteractiveMap(elements = []) {
  if (!elements || elements.length === 0) return 'No interactive elements detected on page.';

  return elements.slice(0, 40).map(el => {
    let desc = `[#${el.id}] <${el.tag}`;
    if (el.type) desc += ` type="${el.type}"`;
    if (el.placeholder) desc += ` placeholder="${el.placeholder}"`;
    desc += `>`;
    if (el.text) desc += ` "${el.text}"`;
    if (el.href) desc += ` -> ${el.href}`;
    return desc;
  }).join('\n');
}
