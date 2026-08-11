import React, { useState, useRef } from 'react';
import { Send, Bot, Database, Zap, RefreshCw, Eye, EyeOff, Play, Square, Compass, Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { formatInteractiveMap } from '../utils/visionEngine';
import { BROWSER_AGENT_SYSTEM_PROMPT, parseAgentAction } from '../utils/browserActions';

const AgentSidebar = ({ aiClient, activeTabUrl, onOpenNewTab }) => {
  const [input, setInput] = useState('');
  const [activeAgent, setActiveAgent] = useState('Ollama');
  const [apiUrl, setApiUrl] = useState('http://localhost:11434');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isAutoPilot, setIsAutoPilot] = useState(true);
  const [isRunningAutoPilot, setIsRunningAutoPilot] = useState(false);
  const [showVisionBadges, setShowVisionBadges] = useState(false);
  const [activeElementsCount, setActiveElementsCount] = useState(0);

  const abortControllerRef = useRef(null);

  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem('qanprism_apikey') || ''; } catch { return ''; }
  });
  
  const [messages, setMessages] = useState([
    { 
      role: 'agent', 
      content: 'Hello! I am your Autonomous QanPrism Agent. I have full visual perception ("AI Eyes") and can navigate, search, click, type, and analyze any website for you.' 
    }
  ]);

  const handleAgentChange = (e) => {
    const newAgent = e.target.value;
    setActiveAgent(newAgent);
    
    if (newAgent === 'Ollama') setApiUrl('http://localhost:11434');
    else if (newAgent === 'LM Studio') setApiUrl('http://localhost:1234/v1');
    else if (newAgent === 'DeepSeek') setApiUrl('https://api.deepseek.com/v1');
    else if (newAgent === 'OpenAI') setApiUrl('https://api.openai.com/v1');
    else setApiUrl('');
    
    setModels([]);
    setSelectedModel('');
    setConnectionError('');
    
    setMessages(prev => [...prev, { 
      role: 'system', 
      content: `Switched backend to ${newAgent === 'Ollama' ? 'Local Ollama' : newAgent}.` 
    }]);
  };

  const connectToLocalAI = async () => {
    setIsConnecting(true);
    setConnectionError('');
    setModels([]);
    
    try {
      let fetchedModels = [];
      if (activeAgent === 'LM Studio') {
        const response = await fetch(`${apiUrl}/models`);
        if (!response.ok) throw new Error('Failed to reach LM Studio');
        const data = await response.json();
        fetchedModels = data.data.map(m => m.id);
      } else if (activeAgent === 'Ollama') {
        const response = await fetch(`${apiUrl}/api/tags`);
        if (!response.ok) throw new Error('Failed to reach Ollama');
        const data = await response.json();
        fetchedModels = data.models.map(m => m.name);
      }
      
      if (fetchedModels.length === 0) {
        setConnectionError('No models found');
      } else {
        setModels(fetchedModels);
        setSelectedModel(fetchedModels[0]);
        setMessages(prev => [...prev, { role: 'system', content: `Connected! Found ${fetchedModels.length} models.` }]);
      }
    } catch (err) {
      setConnectionError(err.message || 'Connection failed');
      setMessages(prev => [...prev, { role: 'system', content: `Connection error: ${err.message}` }]);
    } finally {
      setIsConnecting(false);
    }
  };

  // Query the active tab's interactive DOM elements & visual markers via the Bridge
  const getPageInteractiveElements = () => {
    return new Promise((resolve) => {
      const requestId = 'req_' + Date.now();
      const listener = (e) => {
        if (e.detail && e.detail.requestId === requestId) {
          window.removeEventListener('QP_AGENT_STATE_RESPONSE', listener);
          const elements = e.detail.elements || [];
          setActiveElementsCount(elements.length);
          resolve(elements);
        }
      };
      window.addEventListener('QP_AGENT_STATE_RESPONSE', listener);
      window.dispatchEvent(new CustomEvent('QP_DISPATCH_TO_TAB', {
        detail: { type: 'QP_AGENT_GET_STATE', requestId }
      }));
      
      // Fallback timeout in case iframe is busy
      setTimeout(() => {
        window.removeEventListener('QP_AGENT_STATE_RESPONSE', listener);
        resolve([]);
      }, 700);
    });
  };

  // Dispatch an action (click, type, scroll) to the active tab
  const executeBrowserAction = (action) => {
    return new Promise((resolve) => {
      const actionId = 'act_' + Date.now();
      const listener = (e) => {
        if (e.detail && e.detail.actionId === actionId) {
          window.removeEventListener('QP_AGENT_ACTION_RESULT', listener);
          resolve(e.detail.result || { success: true });
        }
      };
      window.addEventListener('QP_AGENT_ACTION_RESULT', listener);
      window.dispatchEvent(new CustomEvent('QP_DISPATCH_TO_TAB', {
        detail: { type: 'QP_AGENT_EXECUTE_ACTION', action, actionId }
      }));

      setTimeout(() => {
        window.removeEventListener('QP_AGENT_ACTION_RESULT', listener);
        resolve({ success: true, message: 'Dispatched' });
      }, 1200);
    });
  };

  const toggleVisionOverlay = () => {
    const nextState = !showVisionBadges;
    setShowVisionBadges(nextState);
    window.dispatchEvent(new CustomEvent('QP_DISPATCH_TO_TAB', {
      detail: { type: 'QP_AGENT_TOGGLE_BADGES', show: nextState }
    }));
  };

  const callLLM = async (messagesPayload) => {
    const completionsUrl = apiUrl.endsWith('/v1') ? `${apiUrl}/chat/completions` : `${apiUrl}/v1/chat/completions`;
    const response = await fetch(completionsUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(apiKey && !isLocal ? { 'Authorization': `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        model: selectedModel || (activeAgent === 'DeepSeek' ? 'deepseek-chat' : activeAgent === 'OpenAI' ? 'gpt-4o' : 'default'),
        messages: messagesPayload,
        temperature: 0.2
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  };

  // Autonomous ReAct Auto-Pilot Loop
  const runAutoPilotLoop = async (userGoal) => {
    setIsRunningAutoPilot(true);
    setIsThinking(true);
    
    // Enable vision badges so user sees agent targeting elements
    window.dispatchEvent(new CustomEvent('QP_DISPATCH_TO_TAB', {
      detail: { type: 'QP_AGENT_TOGGLE_BADGES', show: true }
    }));
    setShowVisionBadges(true);

    const agentTrail = [];
    let stepCount = 0;
    const maxSteps = 8;
    let completed = false;

    try {
      while (stepCount < maxSteps && !completed) {
        stepCount++;

        // 1. OBSERVE
        const elements = await getPageInteractiveElements();
        const interactiveMapStr = formatInteractiveMap(elements);

        let pageText = "";
        try {
          const res = await invoke('fetch_page_context', { url: activeTabUrl });
          const rawHtml = typeof res === 'string' ? res : (res?.html || '');
          const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
          pageText = (doc.body?.innerText || '').replace(/\s+/g, ' ').trim().substring(0, 4000);
        } catch {
          pageText = "Unable to extract raw text.";
        }

        // 2. BUILD PROMPT
        const systemPrompt = BROWSER_AGENT_SYSTEM_PROMPT;
        const currentObservation = `[CURRENT STEP ${stepCount}/${maxSteps}]
Current Webpage URL: ${activeTabUrl}
Visible Interactive Elements with Visual [#IDs]:
${interactiveMapStr}

Page Text Snippet:
${pageText}

User's High-Level Objective:
"${userGoal}"
`;

        const messagesPayload = [
          { role: 'system', content: systemPrompt },
          ...agentTrail,
          { role: 'user', content: currentObservation }
        ];

        // 3. THINK
        const responseText = await callLLM(messagesPayload);
        const action = parseAgentAction(responseText);

        // Record history
        agentTrail.push({ role: 'user', content: currentObservation });
        agentTrail.push({ role: 'assistant', content: responseText });

        // Add visual step to UI
        if (action.thought) {
          setMessages(prev => [...prev, {
            role: 'agent',
            content: `💭 **Step ${stepCount}**: ${action.thought}`,
            actionType: action.type
          }]);
        }

        // 4. ACT
        if (action.type === 'DONE') {
          completed = true;
          setMessages(prev => [...prev, {
            role: 'agent',
            content: `✨ **Task Complete**: ${action.message || 'All steps executed successfully.'}`
          }]);
          break;
        }

        if (action.type === 'NAVIGATE' && action.url) {
          setMessages(prev => [...prev, {
            role: 'system',
            content: `🌐 Navigating to: ${action.url}`
          }]);
          window.dispatchEvent(new CustomEvent('QP_DISPATCH_TO_TAB', {
            detail: { type: 'QP_AGENT_EXECUTE_ACTION', action }
          }));
          await new Promise(r => setTimeout(r, 2000));
        } else if (action.type === 'CLICK' && action.elementId) {
          setMessages(prev => [...prev, {
            role: 'system',
            content: `👆 Clicking element [#${action.elementId}]`
          }]);
          await executeBrowserAction(action);
          await new Promise(r => setTimeout(r, 1500));
        } else if (action.type === 'TYPE' && action.elementId) {
          setMessages(prev => [...prev, {
            role: 'system',
            content: `⌨️ Typing "${action.text}" into [#${action.elementId}]`
          }]);
          await executeBrowserAction(action);
          await new Promise(r => setTimeout(r, 1500));
        } else if (action.type === 'SCROLL') {
          setMessages(prev => [...prev, {
            role: 'system',
            content: `📜 Scrolling ${action.direction}`
          }]);
          await executeBrowserAction(action);
          await new Promise(r => setTimeout(r, 800));
        } else if (action.type === 'NEW_TAB' && onOpenNewTab) {
          onOpenNewTab(action.url);
          await new Promise(r => setTimeout(r, 1500));
        } else {
          // Unrecognized or finished
          completed = true;
          setMessages(prev => [...prev, {
            role: 'agent',
            content: action.message || responseText
          }]);
        }
      }

      if (stepCount >= maxSteps && !completed) {
        setMessages(prev => [...prev, {
          role: 'system',
          content: `⚠️ Auto-pilot reached maximum step limit (${maxSteps} steps).`
        }]);
      }

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `❌ Auto-pilot error: ${err.message}`
      }]);
    } finally {
      setIsRunningAutoPilot(false);
      setIsThinking(false);
    }
  };

  // Standard Conversational Chat
  const handleChat = async (userPrompt) => {
    setIsThinking(true);
    try {
      const elements = await getPageInteractiveElements();
      const interactiveMapStr = formatInteractiveMap(elements);

      let pageText = "No page content available.";
      try {
        const res = await invoke('fetch_page_context', { url: activeTabUrl });
        const rawHtml = typeof res === 'string' ? res : (res?.html || '');
        const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
        pageText = (doc.body?.innerText || '').replace(/\s+/g, ' ').trim().substring(0, 10000);
      } catch (ctxErr) {
        console.error("Failed to fetch page context:", ctxErr);
      }

      const apiMessages = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'agent' ? 'assistant' : m.role,
        content: m.content
      }));

      const contextMessage = { 
        role: 'system', 
        content: `You are QanPrism, a powerful AI assistant with browser vision and control.
Active Page URL: ${activeTabUrl}
Interactive Elements with Visual [#IDs]:
${interactiveMapStr}

Page Text Content:
---
${pageText}
---
Answer the user's questions using this page context.` 
      };

      const responseText = await callLLM([contextMessage, ...apiMessages, { role: 'user', content: userPrompt }]);
      setMessages(prev => [...prev, { role: 'agent', content: responseText }]);

    } catch (err) {
      setMessages(prev => [...prev, { role: 'system', content: `Error: ${err.message}` }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || isThinking || isRunningAutoPilot) return;

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);

    if (isAutoPilot) {
      runAutoPilotLoop(userText);
    } else {
      handleChat(userText);
    }
  };

  const stopAutoPilot = () => {
    setIsRunningAutoPilot(false);
    setIsThinking(false);
    setMessages(prev => [...prev, { role: 'system', content: '🛑 Auto-pilot stopped by user.' }]);
  };

  const isLocal = activeAgent === 'Ollama' || activeAgent === 'LM Studio';

  return (
    <div className="agent-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <h2><Bot size={18} color="var(--accent-color)" /> QanPrism Agent</h2>
        
        <div className="agent-selector">
          <Database size={12} />
          <select 
            value={activeAgent} 
            onChange={handleAgentChange}
            className="agent-dropdown"
          >
            <option value="Ollama">Ollama</option>
            <option value="LM Studio">LM Studio</option>
            <option value="DeepSeek">DeepSeek API</option>
            <option value="OpenAI">OpenAI API</option>
          </select>
          <div className={`status-indicator ${isLocal ? 'local' : 'cloud'}`} title="Connected"></div>
        </div>
      </div>

      {/* Mode Switcher: Auto-Pilot vs Chat */}
      <div style={{ display: 'flex', gap: '6px', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
        <button
          onClick={() => setIsAutoPilot(true)}
          style={{
            flex: 1,
            padding: '5px 8px',
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: '6px',
            background: isAutoPilot ? 'var(--accent-color, #3b82f6)' : 'transparent',
            color: isAutoPilot ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}
        >
          <Sparkles size={13} /> Auto-Pilot (100% Control)
        </button>
        <button
          onClick={() => setIsAutoPilot(false)}
          style={{
            flex: 1,
            padding: '5px 8px',
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: '6px',
            background: !isAutoPilot ? 'var(--accent-color, #3b82f6)' : 'transparent',
            color: !isAutoPilot ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}
        >
          <Compass size={13} /> Chat & Read
        </button>
      </div>

      {/* Vision Perception HUD */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', fontSize: '11px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Eye size={12} color="#10b981" />
          <span><strong>AI Eyes:</strong> Active</span>
        </div>
        <button 
          onClick={toggleVisionOverlay}
          style={{ background: 'transparent', border: 'none', color: showVisionBadges ? '#3b82f6' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          {showVisionBadges ? <EyeOff size={12} /> : <Eye size={12} />}
          {showVisionBadges ? 'Hide #IDs' : 'Show #IDs'}
        </button>
      </div>
      
      {/* API Config Panel for Local AI */}
      {isLocal && (
        <div className="api-config-panel">
          <div className="api-url-row">
            <input 
              type="text" 
              value={apiUrl} 
              onChange={e => setApiUrl(e.target.value)} 
              placeholder="API URL (e.g. http://localhost:11434)"
            />
            <button onClick={connectToLocalAI} disabled={isConnecting} className="connect-btn">
              {isConnecting ? <RefreshCw size={12} className="spinning" /> : 'Connect'}
            </button>
          </div>
          {connectionError && <div className="config-error">{connectionError}</div>}
          
          {models.length > 0 && (
            <div className="model-selector-row">
              <span style={{fontSize: '11px', color: 'var(--text-secondary)'}}>Model:</span>
              <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
                {models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* API Config Panel for Cloud Providers */}
      {!isLocal && (
        <div className="api-config-panel">
          <div className="api-url-row">
            <input 
              type="password" 
              value={apiKey} 
              onChange={e => {
                setApiKey(e.target.value);
                try { localStorage.setItem('qanprism_apikey', e.target.value); } catch {}
              }} 
              placeholder={`${activeAgent} API Key`}
              style={{ flex: 1 }}
            />
          </div>
          <div className="model-selector-row">
            <span style={{fontSize: '11px', color: 'var(--text-secondary)'}}>Model:</span>
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
              {activeAgent === 'DeepSeek' && (
                <>
                  <option value="deepseek-chat">deepseek-chat</option>
                  <option value="deepseek-reasoner">deepseek-reasoner</option>
                </>
              )}
              {activeAgent === 'OpenAI' && (
                <>
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                  <option value="gpt-4.1">gpt-4.1</option>
                </>
              )}
            </select>
          </div>
          {!apiKey && <div className="config-error">Enter your API key to use {activeAgent}</div>}
        </div>
      )}

      {/* Chat / Step History */}
      <div className="chat-history">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {isThinking && (
          <div className="chat-bubble agent" style={{ opacity: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span className="spinning" style={{ display: 'inline-block', marginRight: '8px' }}>⟳</span> 
              {isRunningAutoPilot ? 'Observing page & executing action...' : 'Analyzing with AI Eyes...'}
            </div>
            {isRunningAutoPilot && (
              <button 
                onClick={stopAutoPilot} 
                style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#ef4444', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}
              >
                <Square size={10} style={{ verticalAlign: 'middle', marginRight: '3px' }} /> Stop
              </button>
            )}
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="chat-input-container">
        <form onSubmit={handleSend} className="chat-input-wrapper">
          <input 
            type="text" 
            placeholder={isAutoPilot ? "Give a task (e.g. 'Search for NVIDIA stock and click first link')..." : "Ask a question about this page..."} 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isThinking || isRunningAutoPilot}
          />
          <button type="submit" disabled={isThinking || isRunningAutoPilot} title={isAutoPilot ? "Execute on browser" : "Send message"}>
            {isAutoPilot ? <Play size={16} /> : <Send size={16} />}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '10px', color: 'var(--text-secondary)' }}>
          <Zap size={10} style={{ verticalAlign: 'middle', marginRight: '2px' }} />
          {isAutoPilot ? '⚡ 100% AI Browser Control • Autonomous ReAct Loop' : (isLocal ? 'Zero API Cost • Air-Gapped Mode' : 'Cloud API Connected')}
        </div>
      </div>
    </div>
  );
};

export default AgentSidebar;
