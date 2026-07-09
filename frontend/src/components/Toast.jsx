import { useState, useEffect } from 'react';
import { registerToast } from '../toast';

export default function Toast() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    registerToast((msg, type = 'info') => {
      const id = Date.now() + Math.random();
      setItems(prev => [...prev.slice(-3), { id, msg, type }]);
      setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 3200);
    });
  }, []);

  if (!items.length) return null;

  return (
    <div className="toast-container">
      {items.map(item => (
        <div key={item.id} className={`toast-item toast-item--${item.type}`}>
          {item.type === 'error' && '⚠️ '}
          {item.type === 'success' && '✅ '}
          {item.msg}
        </div>
      ))}
    </div>
  );
}
