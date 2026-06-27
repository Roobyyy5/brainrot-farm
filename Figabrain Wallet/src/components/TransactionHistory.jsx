import { useTransactions } from '../hooks/useTransactions'
import { NETWORKS } from '../utils/rpc'
import { ethers } from 'ethers'

function formatDate(timestamp) {
  return new Date(parseInt(timestamp) * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shortAddr(addr) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export default function TransactionHistory({ address, network }) {
  const { txs, loading, refetch } = useTransactions(address, network)
  const net = NETWORKS[network]

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
        <p className="text-gray-500 text-sm">Loading transactions…</p>
      </div>
    )
  }

  if (!txs.length) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
        <p className="text-gray-400 text-sm mb-1">No transactions yet</p>
        <p className="text-gray-600 text-xs">
          {import.meta.env.VITE_ETHERSCAN_KEY
            ? 'Transactions will appear here.'
            : 'Add VITE_ETHERSCAN_KEY to .env to load history.'}
        </p>
        <button onClick={refetch} className="mt-4 text-xs text-violet-400 hover:text-violet-300 transition-colors">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-200">Recent Transactions</h3>
        <button onClick={refetch} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">↻</button>
      </div>
      <div className="divide-y divide-gray-800">
        {txs.map(tx => {
          const isOut = tx.from.toLowerCase() === address.toLowerCase()
          const valueEth = ethers.formatEther(tx.value)
          const success = tx.txreceipt_status === '1'
          return (
            <a
              key={tx.hash}
              href={`${net.explorer}/tx/${tx.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-800/50 transition-colors"
            >
              <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                isOut ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
              }`}>
                {isOut ? '↑' : '↓'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-200 font-medium">
                    {isOut ? 'Sent' : 'Received'}
                  </span>
                  <span className={`text-sm font-mono font-medium ${isOut ? 'text-red-400' : 'text-green-400'}`}>
                    {isOut ? '-' : '+'}{parseFloat(valueEth).toFixed(6)} {net.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs text-gray-500 font-mono">
                    {isOut ? `To: ${shortAddr(tx.to)}` : `From: ${shortAddr(tx.from)}`}
                  </span>
                  <span className={`text-xs ${success ? 'text-gray-500' : 'text-red-400'}`}>
                    {success ? formatDate(tx.timeStamp) : 'Failed'}
                  </span>
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
