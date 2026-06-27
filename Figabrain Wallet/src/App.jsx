import { useState } from 'react'
import { WalletProvider, useWallet } from './context/WalletContext'
import { hasWallet } from './utils/storage'
import Header from './components/Header'
import Welcome from './components/Welcome'
import CreateWallet from './components/CreateWallet'
import ImportWallet from './components/ImportWallet'
import UnlockWallet from './components/UnlockWallet'
import Dashboard from './components/Dashboard'

function AppInner() {
  const { wallet, isLocked } = useWallet()
  const [screen, setScreen] = useState('home') // home | create | import
  const walletExists = hasWallet()

  if (wallet) {
    return (
      <>
        <Header />
        <main className="flex-1"><Dashboard /></main>
      </>
    )
  }

  if (walletExists) {
    return (
      <>
        <Header />
        <main className="flex-1"><UnlockWallet /></main>
      </>
    )
  }

  if (screen === 'create') {
    return (
      <>
        <Header />
        <main className="flex-1"><CreateWallet onBack={() => setScreen('home')} /></main>
      </>
    )
  }

  if (screen === 'import') {
    return (
      <>
        <Header />
        <main className="flex-1"><ImportWallet onBack={() => setScreen('home')} /></main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <Welcome onCreate={() => setScreen('create')} onImport={() => setScreen('import')} />
      </main>
    </>
  )
}

export default function App() {
  return (
    <WalletProvider>
      <div className="min-h-screen flex flex-col">
        <AppInner />
      </div>
    </WalletProvider>
  )
}
