import { useState, useEffect, useCallback } from 'react'
import { fetchTransactions } from '../utils/rpc'

export function useTransactions(address, networkId) {
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!address || !networkId) return
    setLoading(true)
    try {
      const etherscanKey = import.meta.env.VITE_ETHERSCAN_KEY
      const data = await fetchTransactions(address, networkId, etherscanKey)
      setTxs(data)
    } catch {
      setTxs([])
    } finally {
      setLoading(false)
    }
  }, [address, networkId])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { txs, loading, refetch: fetch }
}
