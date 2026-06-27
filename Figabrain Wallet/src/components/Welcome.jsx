export default function Welcome({ onCreate, onImport }) {
  return (
    <div className="max-w-sm mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg shadow-violet-500/20">F</div>
      <h1 className="text-2xl font-semibold text-white mb-2">Figabrain Wallet</h1>
      <p className="text-gray-400 text-sm mb-10">A secure, self-custodial crypto wallet.<br />Your keys, your crypto.</p>

      <div className="space-y-3">
        <button
          onClick={onCreate}
          className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-violet-500/20"
        >
          Create New Wallet
        </button>
        <button
          onClick={onImport}
          className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-200 font-medium py-3.5 rounded-xl transition-colors"
        >
          Import Existing Wallet
        </button>
      </div>

      <p className="mt-8 text-xs text-gray-600">
        Your private keys never leave this device.
        <br />Encrypted with AES-256.
      </p>
    </div>
  )
}
