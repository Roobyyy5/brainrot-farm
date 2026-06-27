const WALLET_KEY = 'figabrain_wallet'
const SETTINGS_KEY = 'figabrain_settings'

export function saveEncryptedWallet(ciphertext) {
  localStorage.setItem(WALLET_KEY, ciphertext)
}

export function loadEncryptedWallet() {
  return localStorage.getItem(WALLET_KEY)
}

export function clearWallet() {
  localStorage.removeItem(WALLET_KEY)
}

export function hasWallet() {
  return !!localStorage.getItem(WALLET_KEY)
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}
