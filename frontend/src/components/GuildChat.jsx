import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function GuildChat({ currentUsername }) {
  const t = useT();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = () => api.guilds.chat().then(d => setMessages(d.messages)).catch(() => {});

  useEffect(() => {
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.guilds.sendMessage(text.trim());
      setText('');
      load();
    } catch (err) { alert(err.message); }
    finally { setSending(false); }
  };

  return (
    <div className="gchat-section">
      <div className="gchat-header">💬 {t('gchat_title')}</div>
      <div className="gchat-messages">
        {messages.length === 0 && <div className="gchat-empty">{t('gchat_no_msgs')}</div>}
        {messages.map(m => (
          <div key={m.id} className={`gchat-msg${m.username === currentUsername ? ' gchat-msg--me' : ''}`}>
            <span className="gchat-author">{m.username}</span>
            <span className="gchat-text">{m.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="gchat-form" onSubmit={handleSend}>
        <input
          className="gchat-input"
          placeholder={t('gchat_ph')}
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={200}
        />
        <button type="submit" className="gchat-send-btn" disabled={sending || !text.trim()}>
          {sending ? '...' : '➤'}
        </button>
      </form>
    </div>
  );
}
