import { useState } from 'react'
import { validateMnemonic, walletFromMnemonic, walletFromPrivateKey } from '../utils/crypto'
import { useWallet } from '../context/WalletContext'

export default function ImportWallet({ onBack }) {
  const { storeWallet } = useWallet()
  const [method, setMethod] = useState('phrase') // phrase | key
  const [input, setInput] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleImport(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    if (password !== confirm) return setError('Passwords do not match')

    setLoading(true)
    try {
      let walletData
      if (method === 'phrase') {
        const phrase = input.trim().toLowerCase()
        if (!validateMnemonic(phrase)) {
          setLoading(false)
          return setError('Invalid seed phrase. Check all 12 words.')
        }
        walletData = await walletFromMnemonic(phrase)
      } else {
        if (!input.trim().startsWith('0x') || input.trim().length !== 66) {
          setLoading(false)
          return setError('Invalid private key format.')
        }
        walletData = await walletFromPrivateKey(input.trim())
      }
      storeWallet(walletData, password)
    } catch (err) {
      setError('Import failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors">
        ← Back
      </button>

      <h2 className="text-xl font-semibold text-white mb-1">Import Wallet</h2>
      <p className="text-gray-400 text-sm mb-6">Restore your existing wallet.</p>

      <div className="flex gap-2 mb-6">
        {['phrase', 'key'].map(m => (
          <button
            key={m}
            onClick={() => { setMethod(m); setInput(''); setError('') }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              method === m
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            {m === 'phrase' ? 'Seed Phrase' : 'Private Key'}
          </button>
        ))}
      </div>

      <form onSubmit={handleImport} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">
            {method === 'phrase' ? '12-Word Seed Phrase' : 'Private Key (0x…)'}
          </label>
          {method === 'phrase' ? (
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Enter your 12 words separated by spaces…"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none font-mono text-sm"
            />
          ) : (
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="0x…"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono text-sm"
            />
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1.5">New Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min 8 characters"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat password"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-medium py-3 rounded-xl transition-colors"
        >
          {loading ? 'Importing…' : 'Import Wallet'}
        </button>
      </form>
    </div>
  )
}
