import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { UserLootBoxItem } from "../api/types";
import { RARITY_META } from "../lib/rankMeta";
import { useAuth } from "../context/AuthContext";

interface OpenResult {
  pointsAwarded: number;
  xpAwarded: number;
  boosterKey: string | null;
}

export function LootBoxShelf() {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();
  const [boxes, setBoxes] = useState<UserLootBoxItem[]>([]);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [result, setResult] = useState<OpenResult | null>(null);

  function load() {
    api.get<{ data: UserLootBoxItem[] }>("/lootboxes").then((res) => setBoxes(res.data));
  }

  useEffect(() => {
    load();
  }, []);

  async function openBox(id: string) {
    setOpeningId(id);
    setResult(null);
    try {
      const res = await api.post<{ data: OpenResult }>(`/lootboxes/${id}/open`);
      setTimeout(() => {
        setResult(res.data);
        load();
        refreshUser();
      }, 700);
    } finally {
      setTimeout(() => setOpeningId(null), 700);
    }
  }

  const unopened = boxes.filter((b) => !b.opened);

  return (
    <div className="glass-panel rounded-2xl p-5">
      <h2 className="font-bold mb-3">{t("economy.lootboxes", "Loot Boxes")}</h2>
      {unopened.length === 0 && <p className="text-white/40 text-sm">{t("economy.noLootboxes", "No unopened loot boxes. Earn XP to get new ones!")}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {unopened.map((box) => {
          const rarity = RARITY_META[box.lootBox.rarity];
          const isOpening = openingId === box.id;
          return (
            <button
              key={box.id}
              onClick={() => openBox(box.id)}
              disabled={openingId !== null}
              className="rounded-xl p-4 flex flex-col items-center gap-2 disabled:opacity-50"
              style={{ background: `${rarity.color}1a`, border: `1px solid ${rarity.color}66` }}
            >
              <motion.span
                className="text-3xl"
                animate={isOpening ? { rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1.2, 1.2, 1.2, 1] } : {}}
                transition={{ duration: 0.7 }}
              >
                🎁
              </motion.span>
              <span className="text-xs font-semibold">{box.lootBox.name}</span>
              <span className="text-[10px]" style={{ color: rarity.color }}>
                {rarity.label}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setResult(null)}
          >
            <div className="glass-panel rounded-2xl p-8 text-center shadow-glow">
              <div className="text-4xl mb-3">🎉</div>
              <div className="text-brain-point font-bold text-lg">+{result.pointsAwarded.toFixed(2)} BP</div>
              <div className="text-brain-accent2 font-bold text-lg">+{result.xpAwarded} XP</div>
              {result.boosterKey && <div className="text-brain-accent font-semibold mt-2">🚀 Booster: {result.boosterKey}</div>}
              <p className="text-white/40 text-xs mt-3">Натисни, щоб закрити</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
