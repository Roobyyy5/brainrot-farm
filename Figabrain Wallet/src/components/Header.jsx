import { useWallet } from '../context/WalletContext'
import { NETWORKS } from '../utils/rpc'
import { hasWallet } from '../utils/storage'

export default function Header() {
  const { wallet, network, switchNetwork, lock } = useWallet()
  const nets = Object.values(NETWORKS)

  return (
    <header className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-bold">F</div>
          <span className="font-semibold text-white tracking-tight">Figabrain Wallet</span>
        </div>

        {wallet && (
          <div className="flex items-center gap-2">
            <select
              value={network}
              onChange={e => switchNetwork(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {nets.map(n => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
            <button
              onClick={lock}
              className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              Lock
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
