import { ethers } from 'ethers'
import CryptoJS from 'crypto-js'

export function generateMnemonic() {
  // 16 байт ентропії = 12 слів; ethers використовує browser crypto API
  return ethers.Mnemonic.entropyToPhrase(ethers.randomBytes(16))
}

export function validateMnemonic(mnemonic) {
  return ethers.Mnemonic.isValidMnemonic(mnemonic.trim().toLowerCase())
}

export async function walletFromMnemonic(mnemonic) {
  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic.trim())
  return {
    address: hdNode.address,
    privateKey: hdNode.privateKey,
    mnemonic: mnemonic.trim(),
  }
}

export async function walletFromPrivateKey(privateKey) {
  const wallet = new ethers.Wallet(privateKey.trim())
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: null,
  }
}

export function encryptWallet(walletData, password) {
  const json = JSON.stringify(walletData)
  return CryptoJS.AES.encrypt(json, password).toString()
}

export function decryptWallet(ciphertext, password) {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, password)
    const json = bytes.toString(CryptoJS.enc.Utf8)
    if (!json) return null
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function hashPassword(password) {
  return CryptoJS.SHA256(password).toString()
}

export function encryptData(data, password) {
  return CryptoJS.AES.encrypt(JSON.stringify(data), password).toString()
}

export function decryptData(ciphertext, password) {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, password)
    const str = bytes.toString(CryptoJS.enc.Utf8)
    if (!str) return null
    return JSON.parse(str)
  } catch {
    return null
  }
}
