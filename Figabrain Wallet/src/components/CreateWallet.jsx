import { useState, useMemo } from 'react'
import { generateMnemonic, walletFromMnemonic } from '../utils/crypto'
import { useWallet } from '../context/WalletContext'

function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.477 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

function PasswordInput({ value, onChange, placeholder, label }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-11 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  )
}

function StrengthBar({ password }) {
  const score = useMemo(() => {
    if (!password) return 0
    let s = 0
    if (password.length >= 8) s++
    if (password.length >= 12) s++
    if (/[A-Z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (/[^A-Za-z0-9]/.test(password)) s++
    return s
  }, [password])

  const label = ['', 'Дуже слабкий', 'Слабкий', 'Середній', 'Сильний', 'Дуже сильний'][score]
  const color = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-green-400'][score]

  if (!password) return null
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? color : 'bg-gray-700'}`} />
        ))}
      </div>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function StepIndicator({ current }) {
  const steps = ['Пароль', 'Фраза', 'Перевірка']
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => {
        const idx = i + 1
        const done = idx < current
        const active = idx === current
        return (
          <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-colors ${
              done ? 'bg-violet-600 text-white' : active ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-500 border border-gray-700'
            }`}>
              {done ? '✓' : idx}
            </div>
            <span className={`text-xs ${active ? 'text-gray-200' : done ? 'text-gray-400' : 'text-gray-600'}`}>{s}</span>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-gray-800 ml-1" />}
          </div>
        )
      })}
    </div>
  )
}

// Pick 3 unique random word indices
function pickVerifyIndices(total = 12) {
  const indices = []
  while (indices.length < 3) {
    const i = Math.floor(Math.random() * total)
    if (!indices.includes(i)) indices.push(i)
  }
  return indices.sort((a, b) => a - b)
}

export default function CreateWallet({ onBack }) {
  const { storeWallet } = useWallet()

  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mnemonic, setMnemonic] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Verify step
  const [verifyIndices] = useState(() => pickVerifyIndices())
  const [verifyInputs, setVerifyInputs] = useState({ 0: '', 1: '', 2: '' })
  const [verifyError, setVerifyError] = useState('')

  const words = mnemonic ? mnemonic.split(' ') : []

  // ── Step 1: credentials ───────────────────────────────────────────────────
  async function handlePassword(e) {
    e.preventDefault()
    setError('')
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRx.test(email.trim())) return setError('Введіть коректну електронну пошту')
    if (password.length < 8) return setError('Пароль має бути мінімум 8 символів')
    if (password !== confirm) return setError('Паролі не збігаються')
    try {
      const phrase = generateMnemonic()
      setMnemonic(phrase)
      setStep(2)
    } catch (err) {
      setError('Помилка генерації фрази: ' + err.message)
    }
  }

  // ── Step 2: show phrase ───────────────────────────────────────────────────
  function handleCopy() {
    navigator.clipboard.writeText(mnemonic)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handlePhraseNext() {
    if (!confirmed) return setError('Підтвердіть, що ви зберегли фразу')
    setError('')
    setStep(3)
  }

  // ── Step 3: verify ────────────────────────────────────────────────────────
  function handleVerifyInput(slot, val) {
    setVerifyInputs(prev => ({ ...prev, [slot]: val.trim().toLowerCase() }))
    setVerifyError('')
  }

  async function handleVerify(e) {
    e.preventDefault()
    setVerifyError('')
    for (let slot = 0; slot < 3; slot++) {
      const correctWord = words[verifyIndices[slot]]
      if (verifyInputs[slot] !== correctWord) {
        setVerifyError(`Слово #${verifyIndices[slot] + 1} невірне. Перевірте ще раз.`)
        return
      }
    }
    setLoading(true)
    try {
      const walletData = await walletFromMnemonic(mnemonic)
      // Зберігаємо без мнемоніки — фраза більше не буде доступна
      storeWallet({ address: walletData.address, privateKey: walletData.privateKey, mnemonic: null, email: email.trim().toLowerCase() }, password)
    } catch (err) {
      setVerifyError('Помилка створення гаманця: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors">
        ← Назад
      </button>

      <StepIndicator current={step} />

      {/* ── Крок 1: Реєстрація ── */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Створити гаманець</h2>
          <p className="text-gray-400 text-sm mb-6">Вкажіть пошту та пароль для захисту гаманця.</p>

          <form onSubmit={handlePassword} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Електронна пошта</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>

            <div>
              <PasswordInput
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Мінімум 8 символів"
                label="Пароль"
              />
              <StrengthBar password={password} />
            </div>

            <PasswordInput
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Повторіть пароль"
              label="Повторіть пароль"
            />

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Далі →
            </button>
          </form>
        </div>
      )}

      {/* ── Крок 2: Відновлювальна фраза (1 раз) ── */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Відновлювальна фраза</h2>

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5">
            <p className="text-red-400 text-sm font-semibold">🔐 Ця фраза показується лише один раз!</p>
            <p className="text-red-300/70 text-xs mt-1.5">
              Запишіть усі 12 слів у правильному порядку та зберігайте в безпечному місці.
              Після закриття цього екрану фразу неможливо буде відновити.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {words.map((word, i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 flex items-center gap-1.5">
                <span className="text-gray-600 text-xs w-4 shrink-0">{i + 1}.</span>
                <span className="text-white font-mono text-sm">{word}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleCopy}
            className="w-full border border-gray-700 hover:border-violet-500/50 text-gray-300 hover:text-white py-2.5 rounded-xl text-sm transition-colors mb-4"
          >
            {copied ? '✓ Скопійовано' : 'Скопіювати фразу'}
          </button>

          <label className="flex items-start gap-3 cursor-pointer mb-4 group">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => { setConfirmed(e.target.checked); setError('') }}
              className="mt-0.5 w-4 h-4 accent-violet-500 cursor-pointer shrink-0"
            />
            <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
              Я записав(ла) всі 12 слів у правильному порядку і розумію, що без цієї фрази доступ до гаманця буде втрачено назавжди
            </span>
          </label>

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          <button
            onClick={handlePhraseNext}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium py-3 rounded-xl transition-colors"
            disabled={!confirmed}
          >
            Перевірити запис →
          </button>
        </div>
      )}

      {/* ── Крок 3: Верифікація ── */}
      {step === 3 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Перевірка фрази</h2>
          <p className="text-gray-400 text-sm mb-6">
            Введіть вказані слова, щоб підтвердити, що ви їх зберегли.
          </p>

          <form onSubmit={handleVerify} className="space-y-4">
            {verifyIndices.map((wordIdx, slot) => (
              <div key={wordIdx}>
                <label className="block text-sm text-gray-300 mb-1.5">
                  Слово <span className="text-violet-400 font-medium">#{wordIdx + 1}</span>
                </label>
                <input
                  type="text"
                  value={verifyInputs[slot]}
                  onChange={e => handleVerifyInput(slot, e.target.value)}
                  placeholder={`Слово номер ${wordIdx + 1}`}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono"
                />
              </div>
            ))}

            {verifyError && <p className="text-red-400 text-sm">{verifyError}</p>}

            <button
              type="submit"
              disabled={loading || Object.values(verifyInputs).some(v => !v)}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium py-3 rounded-xl transition-colors"
            >
              {loading ? 'Створення…' : 'Створити гаманець'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
