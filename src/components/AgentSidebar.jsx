import React, { useState } from 'react';
import { Send, Bot, Database, Zap, RefreshCw } from 'lucide-react';

const AgentSidebar = ({ aiClient }) => {
  const [input, setInput] = useState('');
  const [activeAgent, setActiveAgent] = useState('Ollama');
  const [apiUrl, setApiUrl] = useState('http://localhost:11434');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  
  const [messages, setMessages] = useState([
    { role: 'agent', content: 'Agent initialized. How can I assist you today?' }
  ]);

  const handleAgentChange = (e) => {
    const newAgent = e.target.value;
    setActiveAgent(newAgent);
    
    // Set default URLs based on selection
    if (newAgent === 'Ollama') setApiUrl('http://localhost:11434');
    else if (newAgent === 'LM Studio') setApiUrl('http://localhost:1234/v1');
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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsThinking(true);

    try {
      const completionsUrl = apiUrl.endsWith('/v1') ? `${apiUrl}/chat/completions` : `${apiUrl}/v1/chat/completions`;
      
      // Filter out system messages that are just UI info before sending to LLM
      const apiMessages = newMessages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'agent' ? 'assistant' : m.role,
        content: m.content
      }));

      const response = await fetch(completionsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel || 'default',
          messages: [
            { role: 'system', content: 'You are QanPrism, a helpful local AI assistant.' },
            ...apiMessages
          ]
        })
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        setMessages(prev => [...prev, { role: 'agent', content: data.choices[0].message.content }]);
      } else {
        throw new Error('Invalid response format from API');
      }

    } catch (err) {
      setMessages(prev => [...prev, { role: 'system', content: `Error: Failed to fetch response. (${err.message})` }]);
    } finally {
      setIsThinking(false);
    }
  };

  const isLocal = activeAgent === 'Ollama' || activeAgent === 'LM Studio';

  return (
    <div className="agent-sidebar">
      <div className="sidebar-header">
        <h2><Bot size={18} color="var(--accent-color)" /> Local Quant Agent</h2>
        
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
      
      {/* API Config Panel for Local AI */}
      {isLocal && (
        <div className="api-config-panel">
          <div className="api-url-row">
            <input 
              type="text" 
              value={apiUrl} 
              onChange={e => setApiUrl(e.target.value)} 
              placeholder="API URL (e.g. http://localhost:1234/v1)"
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

      <div className="chat-history">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {isThinking && (
          <div className="chat-bubble agent" style={{ opacity: 0.7 }}>
            <span className="spinning" style={{ display: 'inline-block', marginRight: '8px' }}>⟳</span> Thinking...
          </div>
        )}
      </div>

      <div className="chat-input-container">
        <form onSubmit={handleSend} className="chat-input-wrapper">
          <input 
            type="text" 
            placeholder="Ask about this page..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isThinking}
          />
          <button type="submit" disabled={isThinking}>
            <Send size={16} />
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '10px', color: 'var(--text-secondary)' }}>
          <Zap size={10} style={{ verticalAlign: 'middle', marginRight: '2px' }} />
          {isLocal ? 'Zero API Cost • Air-Gapped Mode' : 'Cloud API Connected'}
        </div>
      </div>
    </div>
  );
};

export default AgentSidebar;
