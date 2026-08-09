import React, { useState } from 'react';
import { RefreshCw, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';

const TabPanel = ({ tab, onClose, onUpdateUrl }) => {
  const [urlInput, setUrlInput] = useState(tab.url);

  const handleNavigate = (e) => {
    e.preventDefault();
    let finalUrl = urlInput;
    if (!finalUrl.startsWith('http')) {
      finalUrl = 'https://' + finalUrl;
    }
    onUpdateUrl(finalUrl);
  };

  return (
    <div className="tab-panel">
      <div className="address-bar-container">
        <button><ArrowLeft size={16} /></button>
        <button><ArrowRight size={16} /></button>
        <button><RefreshCw size={16} /></button>
        
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
        {/* Placeholder for Tauri WebView. In a real app this uses the tauri window api or an iframe temporarily */}
        <iframe src={tab.url} title={tab.title} sandbox="allow-same-origin allow-scripts" />
      </div>
    </div>
  );
};

export default TabPanel;
