import React, { useState, useEffect, useRef } from 'react';
import { Logger } from '../utils/logger';
import { Terminal, Trash2, Copy, Check, ChevronDown, ChevronUp, Search, Bug, X } from 'lucide-react';

const DebugConsole = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState(null);

  const scrollRef = useRef(null);

  useEffect(() => {
    Logger.fetchLogsFromBackend();
    const interval = setInterval(() => {
      if (isOpen) {
        Logger.fetchLogsFromBackend();
      }
    }, 1000);
    const unsubscribe = Logger.subscribe((newLogs) => {
      setLogs([...newLogs]);
    });
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [isOpen]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchMsg = (log.message || '').toLowerCase().includes(q);
      const matchCat = (log.category || '').toLowerCase().includes(q);
      const matchDetails = (log.details || '').toLowerCase().includes(q);
      return matchMsg || matchCat || matchDetails;
    }
    return true;
  });

  const handleCopyLogs = () => {
    const text = JSON.stringify(logs, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelStyle = (level) => {
    switch (level) {
      case 'ERROR':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' };
      case 'NETWORK':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' };
      case 'AGENT':
        return { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.3)' };
      case 'WARN':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.2)' };
    }
  };

  const errorCount = logs.filter(l => l.level === 'ERROR').length;

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '320px',
      backgroundColor: '#0f172a',
      borderTop: '1px solid #334155',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 9999,
      boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.5)',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '12px'
    }}>
      {/* Header Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155',
        userSelect: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={15} color="#38bdf8" />
          <span style={{ fontWeight: 600, color: '#f8fafc' }}>Browser Debug Diagnostics</span>
          {errorCount > 0 && (
            <span style={{
              backgroundColor: '#ef4444',
              color: '#fff',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '10px',
              fontWeight: 700
            }}>
              {errorCount} {errorCount === 1 ? 'Error' : 'Errors'}
            </span>
          )}
        </div>

        {/* Filters & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Level Filter Buttons */}
          <div style={{ display: 'flex', backgroundColor: '#0f172a', borderRadius: '4px', padding: '2px', border: '1px solid #334155' }}>
            {['ALL', 'ERROR', 'NETWORK', 'AGENT', 'WARN', 'INFO'].map(lvl => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                style={{
                  background: filterLevel === lvl ? '#334155' : 'transparent',
                  color: filterLevel === lvl ? '#f8fafc' : '#94a3b8',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={12} color="#94a3b8" style={{ position: 'absolute', left: 6 }} />
            <input
              type="text"
              placeholder="Filter logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#f8fafc',
                padding: '3px 8px 3px 22px',
                fontSize: '11px',
                width: '140px'
              }}
            />
          </div>

          {/* Copy Logs */}
          <button
            onClick={handleCopyLogs}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: '#334155',
              color: '#f8fafc',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
            title="Copy all logs to clipboard as JSON"
          >
            {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Export'}
          </button>

          {/* Clear Logs */}
          <button
            onClick={() => Logger.clear()}
            style={{
              background: '#334155',
              color: '#94a3b8',
              border: 'none',
              borderRadius: '4px',
              padding: '4px',
              cursor: 'pointer'
            }}
            title="Clear all logs"
          >
            <Trash2 size={13} />
          </button>

          {/* Close / Collapse */}
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: '#94a3b8',
              border: 'none',
              padding: '4px',
              cursor: 'pointer'
            }}
            title="Close Debug Console"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Log Feed */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}
      >
        {filteredLogs.length === 0 ? (
          <div style={{ color: '#64748b', textAlign: 'center', marginTop: '40px', fontStyle: 'italic' }}>
            No debug log entries recorded yet. Navigate or perform actions to see live diagnostics.
          </div>
        ) : (
          filteredLogs.map(log => {
            const style = getLevelStyle(log.level);
            const isExpanded = expandedLogId === log.id;

            return (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#1e293b',
                  borderRadius: '4px',
                  border: '1px solid #334155',
                  padding: '4px 8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#64748b', fontSize: '10px', flexShrink: 0 }}>{log.timestamp}</span>
                  
                  <span style={{
                    backgroundColor: style.bg,
                    color: style.text,
                    border: style.border,
                    borderRadius: '3px',
                    padding: '1px 5px',
                    fontSize: '10px',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>
                    {log.level}
                  </span>

                  <span style={{ color: '#38bdf8', fontWeight: 600, fontSize: '11px', flexShrink: 0 }}>
                    [{log.category}]
                  </span>

                  <span style={{ color: '#f1f5f9', wordBreak: 'break-all', flex: 1 }}>
                    {log.message}
                  </span>

                  {log.details && (
                    <button
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '0 4px'
                      }}
                      title="Toggle details"
                    >
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  )}
                </div>

                {isExpanded && log.details && (
                  <pre style={{
                    marginTop: '4px',
                    padding: '6px',
                    backgroundColor: '#0f172a',
                    borderRadius: '4px',
                    border: '1px solid #334155',
                    color: '#cbd5e1',
                    fontSize: '11px',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {log.details}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DebugConsole;
