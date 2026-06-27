import { useState, useEffect, useCallback } from 'react'
import { getNativeBalance, getTokenBalance, NETWORKS } from '../utils/rpc'

export function useBalances(address, networkId) {
  const [balances, setBalances] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!address || !networkId) return
    setLoading(true)
    setError(null)
    try {
      const net = NETWORKS[networkId]
      const native = await getNativeBalance(address, networkId)
      const tokenEntries = await Promise.all(
        Object.keys(net.tokens).map(async sym => {
          const bal = await getTokenBalance(address, sym, networkId)
          return [sym, bal]
        })
      )
      setBalances({
        [net.symbol]: native,
        ...Object.fromEntries(tokenEntries),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [address, networkId])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 30000)
    return () => clearInterval(interval)
  }, [fetch])

  return { balances, loading, error, refetch: fetch }
}
