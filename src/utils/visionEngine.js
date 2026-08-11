/**
 * Vision & Interactive Element Grounding Engine for QanPrism
 * 
 * Provides:
 * 1. Script injection to index all interactive elements with numerical IDs (#1, #2, #3...)
 * 2. Visual Set-of-Marks (SoM) badge overlay generator for Vision models
 * 3. Element interaction dispatcher (click, type, scroll)
 * 4. Search and link navigation interceptor for cross-origin browsing
 * 5. Frame-busting / Clickjacking spoofing so secure login pages run smoothly
 */

export const INJECTED_AGENT_BRIDGE_SCRIPT = `
(function() {
  if (window.__QANPRISM_BRIDGE_INITIALIZED__) return;
  window.__QANPRISM_BRIDGE_INITIALIZED__ = true;

  // Frame-busting / Clickjacking spoofing
  try {
    Object.defineProperty(window, 'top', { get: function() { return window; }, configurable: true });
    Object.defineProperty(window, 'parent', { get: function() { return window; }, configurable: true });
    Object.defineProperty(window, 'frameElement', { get: function() { return null; }, configurable: true });
  } catch(e) {}

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

  // Intercept search engine and GET form submissions (e.g. Google, Bing, DuckDuckGo)
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form) return;
    var method = (form.method || 'GET').toUpperCase();
    if (method === 'GET') {
      e.preventDefault();
      e.stopPropagation();
      try {
        var formData = new FormData(form);
        var params = new URLSearchParams(formData);
        var actionUrl = form.action || window.location.href;
        var separator = actionUrl.includes('?') ? '&' : '?';
        var targetUrl = actionUrl + separator + params.toString();
        window.parent.postMessage({ type: 'QANPRISM_NAVIGATE', url: targetUrl }, '*');
      } catch(err) {
        console.error("Form navigation intercept error:", err);
      }
      return false;
    }
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
