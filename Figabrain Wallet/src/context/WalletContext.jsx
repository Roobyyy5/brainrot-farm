import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { decryptWallet, encryptWallet } from '../utils/crypto'
import { loadEncryptedWallet, saveEncryptedWallet, loadSettings, saveSettings } from '../utils/storage'

const WalletContext = createContext(null)

const LOCK_TIMEOUT = 5 * 60 * 1000 // 5 minutes

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null) // { address, privateKey, mnemonic }
  const [password, setPassword] = useState(null)
  const [isLocked, setIsLocked] = useState(false)
  const [network, setNetwork] = useState('ethereum')
  const lockTimer = useRef(null)

  const resetTimer = useCallback(() => {
    if (lockTimer.current) clearTimeout(lockTimer.current)
    if (wallet) {
      lockTimer.current = setTimeout(() => {
        setWallet(null)
        setPassword(null)
        setIsLocked(true)
      }, LOCK_TIMEOUT)
    }
  }, [wallet])

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (lockTimer.current) clearTimeout(lockTimer.current)
    }
  }, [resetTimer])

  useEffect(() => {
    const settings = loadSettings()
    if (settings.network) setNetwork(settings.network)
  }, [])

  function unlock(pwd) {
    const cipher = loadEncryptedWallet()
    if (!cipher) return false
    const data = decryptWallet(cipher, pwd)
    if (!data) return false
    setWallet(data)
    setPassword(pwd)
    setIsLocked(false)
    return true
  }

  function storeWallet(walletData, pwd) {
    const cipher = encryptWallet(walletData, pwd)
    saveEncryptedWallet(cipher)
    // Зберігаємо email у settings (не чутливі дані) для екрану розблокування
    if (walletData.email) {
      const settings = loadSettings()
      saveSettings({ ...settings, email: walletData.email })
    }
    setWallet(walletData)
    setPassword(pwd)
    setIsLocked(false)
  }

  function lock() {
    setWallet(null)
    setPassword(null)
    setIsLocked(true)
    if (lockTimer.current) clearTimeout(lockTimer.current)
  }

  function switchNetwork(netId) {
    setNetwork(netId)
    const settings = loadSettings()
    saveSettings({ ...settings, network: netId })
  }

  return (
    <WalletContext.Provider value={{
      wallet,
      password,
      isLocked,
      network,
      unlock,
      storeWallet,
      lock,
      switchNetwork,
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}
