import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';
import { toastError, toastSuccess } from '../toast';

export default function WalletPage() {
  const t = useT();
  const [data, setData] = useState(null);
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => {
    api.wallet.get().then((d) => {
      setData(d);
      setAddress(d.walletAddress || '');
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!address.trim()) return;
    setSaving(true);
    try {
      const res = await api.wallet.connect(address.trim());
      setData((d) => ({ ...d, walletAddress: res.walletAddress }));
      toastSuccess(t('wallet_saved'));
    } catch {
      toastError(t('wallet_invalid'));
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.wallet.disconnect();
      setAddress('');
      setData((d) => ({ ...d, walletAddress: null }));
      toastSuccess(t('wallet_disconnected'));
    } catch {}
  };

  if (!data) return <div className="tap-loading">{t('loading')}</div>;

  const pct = Math.round(data.supplyRemaining / data.totalSupply * 100);

  return (
    <div className="wallet-page">
      {/* Token balance */}
      <div className="wallet-balance-card">
        <div className="wallet-balance-label">{t('wallet_total_earned')}</div>
        <div className="wallet-balance-amount">{data.tokens.toLocaleString()}</div>
        <div className="wallet-balance-sym">FGB</div>
      </div>

      {/* Supply bar */}
      <div className="wallet-card">
        <div className="wallet-card-title">{t('wallet_supply_title')}</div>
        <div className="wallet-supply-bar-bg">
          <div className="wallet-supply-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="wallet-supply-meta">
          <span>{t('wallet_supply_pct').replace('{pct}', pct)}</span>
          <span>{t('wallet_rate').replace('{n}', data.rateNow)}</span>
        </div>
        <div className="wallet-supply-numbers">
          {data.supplyRemaining.toLocaleString()} / {data.totalSupply.toLocaleString()} FGB
        </div>
      </div>

      {/* Connect wallet */}
      <div className="wallet-card">
        <div className="wallet-card-title">{t('wallet_connect_title')}</div>
        {data.walletAddress ? (
          <div className="wallet-connected-section">
            <div className="wallet-connected-row">
              <span className="wallet-connected-label">{t('wallet_connected')}</span>
              <span className="wallet-addr">
                {data.walletAddress.slice(0, 8)}...{data.walletAddress.slice(-6)}
              </span>
            </div>
            <button className="wallet-disconnect-btn" onClick={handleDisconnect}>
              {t('wallet_disconnect')}
            </button>
          </div>
        ) : (
          <div className="wallet-connect-form">
            <p className="wallet-no-wallet-text">{t('wallet_no_wallet')}</p>
            <input
              className="wallet-addr-input"
              placeholder={t('wallet_addr_ph')}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <button
              className="wallet-save-btn"
              onClick={handleSave}
              disabled={saving || !address.trim()}
            >
              {saving ? t('loading') : t('wallet_save')}
            </button>
          </div>
        )}
      </div>

      {/* Withdraw */}
      <div className="wallet-card">
        <button className="wallet-withdraw-btn" onClick={() => setShowWithdraw(true)}>
          {t('wallet_withdraw')}
        </button>
        {showWithdraw && (
          <div className="wallet-soon-banner">
            <div className="wallet-soon-title">{t('wallet_soon')}</div>
            <div className="wallet-soon-desc">{t('wallet_soon_desc')}</div>
            <button className="wallet-close-btn" onClick={() => setShowWithdraw(false)}>
              {t('common_close')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
