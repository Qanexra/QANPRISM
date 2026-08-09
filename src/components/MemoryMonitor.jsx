import React, { useState, useEffect } from 'react';
import { Cpu } from 'lucide-react';

const MemoryMonitor = () => {
  const [memory, setMemory] = useState(32.4);

  // Simulate slight memory fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      const fluctuation = (Math.random() - 0.5) * 1.5;
      setMemory(prev => Math.max(25, Math.min(80, prev + fluctuation)));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const percentage = Math.min(100, (memory / 100) * 100);

  return (
    <div className="memory-monitor" title="Current Browser RAM Footprint">
      <Cpu size={14} />
      <span>{memory.toFixed(1)} MB</span>
      <div className="memory-bar-bg">
        <div 
          className="memory-bar-fill" 
          style={{ width: `${percentage}%`, background: memory > 60 ? '#f59e0b' : '#10b981' }} 
        />
      </div>
    </div>
  );
};

export default MemoryMonitor;
