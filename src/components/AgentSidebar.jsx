import React, { useState } from 'react';
import { Send, Bot, Database, Zap, ChevronDown } from 'lucide-react';

const AgentSidebar = ({ aiClient }) => {
  const [input, setInput] = useState('');
  const [activeAgent, setActiveAgent] = useState('Ollama');
  const [messages, setMessages] = useState([
    { role: 'agent', content: 'QanPrism Agent initialized. I can parse SEC filings, extract financial tables from the current page, and cross-reference data. How can I assist you today?' }
  ]);

  const handleAgentChange = (e) => {
    const newAgent = e.target.value;
    setActiveAgent(newAgent);
    setMessages(prev => [...prev, { 
      role: 'system', 
      content: `Switched backend to ${newAgent === 'Ollama' ? 'Local Ollama' : newAgent}.` 
    }]);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');

    setTimeout(() => {
      setMessages([...newMessages, { 
        role: 'agent', 
        content: `[${activeAgent}] Analyzing the current DOM structure... Extracting financial tables. (This is a mock response pending backend integration)` 
      }]);
    }, 1000);
  };

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
            <option value="DeepSeek">DeepSeek API</option>
            <option value="OpenAI">OpenAI API</option>
          </select>
          <div className={`status-indicator ${activeAgent === 'Ollama' ? 'local' : 'cloud'}`} title="Connected"></div>
        </div>
      </div>

      <div className="chat-history">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>

      <div className="chat-input-container">
        <form onSubmit={handleSend} className="chat-input-wrapper">
          <input 
            type="text" 
            placeholder="Ask about this page..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit">
            <Send size={16} />
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '10px', color: 'var(--text-secondary)' }}>
          <Zap size={10} style={{ verticalAlign: 'middle', marginRight: '2px' }} />
          {activeAgent === 'Ollama' ? 'Zero API Cost • Air-Gapped Mode' : 'Cloud API Connected'}
        </div>
      </div>
    </div>
  );
};

export default AgentSidebar;
