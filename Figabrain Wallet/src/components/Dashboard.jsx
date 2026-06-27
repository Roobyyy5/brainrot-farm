import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useWallet } from '../context/WalletContext'
import { useBalances } from '../hooks/useBalances'
import { NETWORKS } from '../utils/rpc'
import SendTokens from './SendTokens'
import TransactionHistory from './TransactionHistory'

function AddressCard({ address, onCopy, copied }) {
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 mb-1">Your Address</p>
          <p className="font-mono text-sm text-gray-200 break-all">{address}</p>
          <button
            onClick={onCopy}
            className="mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy address'}
          </button>
        </div>
        <div className="flex-shrink-0 bg-white p-2 rounded-xl">
          <QRCodeSVG value={address} size={80} />
        </div>
      </div>
    </div>
  )
}

function BalanceRow({ symbol, amount, loading }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-200">
          {symbol[0]}
        </div>
        <span className="text-gray-200 font-medium">{symbol}</span>
      </div>
      <span className="font-mono text-gray-200">
        {loading ? (
          <span className="text-gray-600 text-sm">Loading…</span>
        ) : (
          `${parseFloat(amount || '0').toFixed(6)} ${symbol}`
        )}
      </span>
    </div>
  )
}

export default function Dashboard() {
  const { wallet, network, password } = useWallet()
  const { balances, loading, refetch } = useBalances(wallet?.address, network)
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState('assets') // assets | send | history
  const [showPrivKey, setShowPrivKey] = useState(false)
  const [pkPassword, setPkPassword] = useState('')
  const [pkError, setPkError] = useState('')
  const net = NETWORKS[network]
  const symbols = [net.symbol, ...Object.keys(net.tokens)]

  function handleCopy() {
    navigator.clipboard.writeText(wallet.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleRevealPK(e) {
    e.preventDefault()
    if (pkPassword !== password) {
      setPkError('Incorrect password')
      return
    }
    setShowPrivKey(true)
    setPkError('')
    setPkPassword('')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: net.color }}
          />
          <span className="text-sm text-gray-400">{net.name}</span>
        </div>
        <button
          onClick={refetch}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      <AddressCard address={wallet.address} onCopy={handleCopy} copied={copied} />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-5">
        {[
          { id: 'assets', label: 'Assets' },
          { id: 'send', label: 'Send' },
          { id: 'history', label: 'History' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'assets' && (
        <div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4">
            <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Token Balances</h3>
            {symbols.map(sym => (
              <BalanceRow key={sym} symbol={sym} amount={balances[sym]} loading={loading} />
            ))}
          </div>

          {/* Private Key reveal */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Security</h3>
            {!showPrivKey ? (
              <form onSubmit={handleRevealPK} className="space-y-3">
                <p className="text-sm text-gray-400">Enter your password to view private key</p>
                <input
                  type="password"
                  value={pkPassword}
                  onChange={e => setPkPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                {pkError && <p className="text-red-400 text-xs">{pkError}</p>}
                <button
                  type="submit"
                  className="text-sm text-amber-400 hover:text-amber-300 transition-colors border border-amber-500/30 hover:border-amber-500/50 rounded-lg px-3 py-1.5"
                >
                  Reveal Private Key
                </button>
              </form>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-red-400">⚠ Never share this key with anyone</p>
                <div className="bg-gray-800 rounded-xl p-3 font-mono text-xs text-gray-300 break-all">
                  {wallet.privateKey}
                </div>
                <button
                  onClick={() => setShowPrivKey(false)}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Hide
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'send' && (
        <SendTokens
          address={wallet.address}
          privateKey={wallet.privateKey}
          network={network}
          password={password}
          balances={balances}
          onSuccess={refetch}
        />
      )}

      {tab === 'history' && (
        <TransactionHistory address={wallet.address} network={network} />
      )}
    </div>
  )
}
