import { useState } from 'react'
import { useWallet } from '../context/WalletContext'
import { clearWallet, loadSettings } from '../utils/storage'

function maskEmail(email) {
  if (!email) return ''
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(2, local.length - 2))}@${domain}`
}

export default function UnlockWallet() {
  const { unlock } = useWallet()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')

  const settings = loadSettings()
  const maskedEmail = maskEmail(settings.email)

  function handleUnlock(e) {
    e.preventDefault()
    const ok = unlock(password)
    if (!ok) setError('Невірний пароль')
    else setError('')
  }

  function handleReset() {
    if (window.confirm('Це назавжди видалить дані гаманця з цього пристрою. Переконайтесь, що у вас є резервна копія відновлювальної фрази.')) {
      clearWallet()
      window.location.reload()
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-2xl font-bold mx-auto mb-4">F</div>
        <h2 className="text-2xl font-semibold text-white">З поверненням</h2>
        {maskedEmail && (
          <p className="text-gray-500 text-sm mt-1">{maskedEmail}</p>
        )}
        <p className="text-gray-400 text-sm mt-1">Введіть пароль для розблокування</p>
      </div>

      <form onSubmit={handleUnlock} className="space-y-4">
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Пароль"
            autoFocus
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-11 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            {show ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.477 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
          </button>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium py-3 rounded-xl transition-colors"
        >
          Розблокувати
        </button>
      </form>

      <button
        onClick={handleReset}
        className="mt-6 text-xs text-gray-600 hover:text-gray-400 transition-colors w-full text-center"
      >
        Забули пароль? Скинути гаманець
      </button>
    </div>
  )
}
