import { useState } from 'react'
import { ethers } from 'ethers'
import { NETWORKS, estimateGas, sendNative, sendToken } from '../utils/rpc'

export default function SendTokens({ address, privateKey, network, password, balances, onSuccess }) {
  const net = NETWORKS[network]
  const tokens = [net.symbol, ...Object.keys(net.tokens)]

  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [token, setToken] = useState(net.symbol)
  const [gasInfo, setGasInfo] = useState(null)
  const [gasLoading, setGasLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const [txHash, setTxHash] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  // Reset token when network changes
  const currentSymbol = tokens.includes(token) ? token : net.symbol

  async function handleEstimate(e) {
    e.preventDefault()
    setError('')
    if (!ethers.isAddress(to)) return setError('Invalid recipient address')
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return setError('Invalid amount')

    setGasLoading(true)
    try {
      const info = await estimateGas(address, to, amount, currentSymbol, network)
      setGasInfo(info)
      setShowConfirm(true)
    } catch (err) {
      setError('Gas estimation failed: ' + err.message)
    } finally {
      setGasLoading(false)
    }
  }

  async function handleSend() {
    if (pwInput !== password) {
      setPwError('Incorrect password')
      return
    }
    setPwError('')
    setSending(true)
    setError('')
    try {
      let hash
      if (currentSymbol === net.symbol) {
        hash = await sendNative(privateKey, to, amount, network)
      } else {
        hash = await sendToken(privateKey, to, amount, currentSymbol, network)
      }
      setTxHash(hash)
      setShowConfirm(false)
      setTo('')
      setAmount('')
      setPwInput('')
      setGasInfo(null)
      onSuccess?.()
    } catch (err) {
      setError('Transaction failed: ' + err.message)
      setShowConfirm(false)
    } finally {
      setSending(false)
    }
  }

  function setMax() {
    const bal = balances[currentSymbol] || '0'
    setAmount(parseFloat(bal).toString())
  }

  return (
    <div className="space-y-4">
      {txHash && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
          <p className="text-green-400 font-medium text-sm mb-1">Transaction sent!</p>
          <p className="text-xs text-gray-400 font-mono break-all">{txHash}</p>
          <a
            href={`${net.explorer}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-violet-400 hover:text-violet-300 mt-1 inline-block"
          >
            View on explorer →
          </a>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <form onSubmit={handleEstimate} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Recipient Address</label>
            <input
              type="text"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="0x…"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-sm"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm text-gray-300 mb-1.5">Amount</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.0"
                  min="0"
                  step="any"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 pr-16"
                />
                <button
                  type="button"
                  onClick={setMax}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-violet-400 hover:text-violet-300 font-medium px-1"
                >
                  MAX
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Balance: {parseFloat(balances[currentSymbol] || '0').toFixed(6)} {currentSymbol}
              </p>
            </div>

            <div className="w-32">
              <label className="block text-sm text-gray-300 mb-1.5">Token</label>
              <select
                value={currentSymbol}
                onChange={e => setToken(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {tokens.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={gasLoading}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-medium py-3 rounded-xl transition-colors"
          >
            {gasLoading ? 'Estimating gas…' : 'Review Transaction'}
          </button>
        </form>
      </div>

      {/* Confirm Modal */}
      {showConfirm && gasInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Confirm Transaction</h3>

            <div className="space-y-3 mb-5">
              <Row label="To" value={`${to.slice(0, 10)}…${to.slice(-8)}`} mono />
              <Row label="Amount" value={`${amount} ${currentSymbol}`} />
              <Row label="Gas price" value={`${parseFloat(gasInfo.gasPrice).toFixed(2)} Gwei`} />
              <Row label="Gas limit" value={gasInfo.gasLimit} />
              <Row label="Network fee" value={`${parseFloat(gasInfo.gasCostEth).toFixed(8)} ${net.symbol}`} />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-1.5">Enter password to confirm</label>
              <input
                type="password"
                value={pwInput}
                onChange={e => setPwInput(e.target.value)}
                placeholder="Password"
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
              />
              {pwError && <p className="text-red-400 text-xs mt-1">{pwError}</p>}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirm(false); setPwInput(''); setPwError('') }}
                className="flex-1 border border-gray-700 text-gray-300 hover:text-white py-2.5 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
              >
                {sending ? 'Sending…' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-gray-500 text-sm shrink-0">{label}</span>
      <span className={`text-gray-200 text-sm text-right break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
