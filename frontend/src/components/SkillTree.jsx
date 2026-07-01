import { useState, useEffect } from 'react';
import { api } from '../api';

export default function SkillTree() {
  const [data, setData] = useState(null);
  const [activeTree, setActiveTree] = useState(null);
  const [upgrading, setUpgrading] = useState(null);

  const load = () => api.skills.list().then((d) => {
    setData(d);
    if (!activeTree && d.trees[0]) setActiveTree(d.trees[0].key);
  });
  useEffect(() => { load(); }, []);

  const handleUpgrade = async (skillKey) => {
    if (upgrading) return;
    setUpgrading(skillKey);
    try {
      await api.skills.upgrade(skillKey);
      load();
    } catch (err) { alert(err.message || 'Cannot upgrade'); }
    finally { setUpgrading(null); }
  };

  if (!data) return <div className="tap-loading">Loading skills...</div>;

  const tree = data.trees.find((t) => t.key === activeTree) || data.trees[0];

  return (
    <div className="skill-tree-section">
      <div className="skill-tree-header">
        <span className="skill-tree-title">🧩 Skill Tree</span>
        <span className="skill-pts-badge">🧪 {data.skillPoints} pts</span>
      </div>

      <div className="skill-tree-tabs">
        {data.trees.map((t) => (
          <button
            key={t.key}
            className={`skill-tree-tab${activeTree === t.key ? ' skill-tree-tab--active' : ''}`}
            onClick={() => setActiveTree(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tree && (
        <div className="skill-list">
          {tree.skills.map((skill) => (
            <div key={skill.key} className={`skill-card${skill.isMaxed ? ' skill-card--maxed' : ''}`}>
              <div className="skill-card-info">
                <div className="skill-card-name">{skill.name}</div>
                <div className="skill-card-desc">{skill.desc}</div>
                <div className="skill-card-level">
                  {Array.from({ length: skill.maxLevel }, (_, i) => (
                    <span key={i} className={`skill-pip${i < skill.level ? ' skill-pip--filled' : ''}`} />
                  ))}
                  <span className="skill-level-text">{skill.level}/{skill.maxLevel}</span>
                </div>
              </div>
              {skill.isMaxed ? (
                <span className="skill-maxed">MAX</span>
              ) : (
                <button
                  className="skill-upgrade-btn"
                  onClick={() => handleUpgrade(skill.key)}
                  disabled={!skill.canAfford || !!upgrading}
                >
                  {upgrading === skill.key ? '...' : `🧪 ${skill.nextCost}`}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
