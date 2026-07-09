import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';
import { toastError, toastSuccess } from '../toast';

export default function MentorSystem() {
  const t = useT();
  const [data, setData] = useState(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => api.mentor.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const act = async (fn, msg) => {
    setLoading(true);
    try { await fn(); if (msg) toastSuccess(msg); await load(); }
    catch (err) { toastError(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  const xpPct = data.nextMilestone
    ? Math.min(100, (data.totalTeachingXp / data.nextMilestone.xp) * 100)
    : 100;

  return (
    <div className="mentor-panel">
      <div className="mentor-header">{t('mentor_header')}</div>

      {data.myMentor ? (
        <div className="mentor-my-mentor">
          <div className="mentor-my-mentor-title">{t('mentor_my_mentor')}</div>
          <div className="mentor-my-mentor-row">
            <span className="mentor-my-mentor-name">👤 {data.myMentor.username}</span>
            <span className="mentor-bonus">{t('mentor_bonus', { n: Math.round(data.myMentor.bonusPct * 100) })}</span>
          </div>
          <button className="mentor-resign-btn" onClick={() => act(() => api.mentor.resign(), t('mentor_resign_alert'))} disabled={loading}>
            {t('mentor_resign_btn')}
          </button>
        </div>
      ) : (
        <div className="mentor-find">
          <div className="mentor-find-title">{t('mentor_find_title')}</div>
          <div className="mentor-find-row">
            <input
              className="mentor-input"
              placeholder={t('mentor_ph_mentor')}
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
            <button
              className="mentor-take-btn"
              onClick={() => act(() => api.mentor.take(username), t('mentor_take_alert', { name: username }))}
              disabled={loading || !username}
            >
              {t('mentor_take_btn')}
            </button>
          </div>
        </div>
      )}

      <div className="mentor-section-title">
        {t('mentor_apprentices_title', { n: data.apprentices.length, max: data.maxApprentices })}
      </div>

      {data.apprentices.length === 0 ? (
        <div className="mentor-empty">{t('mentor_empty')}</div>
      ) : (
        <div className="mentor-apprentices">
          {data.apprentices.map(a => (
            <div key={a.telegramId} className="mentor-apprentice-row">
              <span className="mentor-ap-name">👤 {a.username}</span>
              <span className="mentor-ap-xp">📚 {a.teachingXp} XP</span>
              <button className="mentor-remove-btn" onClick={() => act(() => api.mentor.remove(a.telegramId))} disabled={loading}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {data.apprentices.length > 0 && (
        <div className="mentor-progress">
          <div className="mentor-progress-top">
            <span className="mentor-progress-label">{t('mentor_teaching_xp', { n: data.totalTeachingXp })}</span>
            {data.nextMilestone && <span className="mentor-next">{t('mentor_next', { name: data.nextMilestone.name })}</span>}
          </div>
          <div className="mentor-progress-bar">
            <div className="mentor-progress-fill" style={{ width: `${xpPct}%` }} />
          </div>
          <div className="mentor-milestones">
            {data.milestones.map(m => (
              <div key={m.xp} className={`mentor-milestone ${data.totalTeachingXp >= m.xp ? 'done' : ''}`}>
                <span className="mentor-ms-name">{m.name}</span>
                <span className="mentor-ms-reward">+{m.reward.gems}💎</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.apprentices.length < data.maxApprentices && (
        <div className="mentor-find">
          <div className="mentor-find-title">{t('mentor_add_title')}</div>
          <div className="mentor-find-row">
            <input
              className="mentor-input"
              placeholder={t('mentor_ph_apprentice')}
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
            <button
              className="mentor-take-btn"
              onClick={() => act(() => api.mentor.take(username), t('mentor_add_alert', { name: username }))}
              disabled={loading || !username}
            >
              {t('mentor_add_btn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
