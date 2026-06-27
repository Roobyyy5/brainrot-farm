# Figabrain Wallet

A secure, self-custodial crypto wallet built with React + Vite.

## Features

- Create or import wallets via BIP-39 seed phrase or private key
- AES-256 encrypted storage — private keys never leave your device
- ETH, BNB, and MATIC native balances + USDT/USDC token balances
- Send ETH and ERC-20 tokens with gas estimation
- Transaction history via Etherscan API
- Multi-network: Ethereum, BNB Chain, Polygon
- Auto-lock after 5 minutes of inactivity
- Dark theme, mobile responsive

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and optionally fill in:

| Variable | Description |
|----------|-------------|
| `VITE_INFURA_KEY` | Infura project ID for RPC (optional — public RPCs are used by default) |
| `VITE_ETHERSCAN_KEY` | Etherscan API key for transaction history (optional) |

Get a free Etherscan key at [etherscan.io/apis](https://etherscan.io/apis).

## Security

- All sensitive data is encrypted with AES-256 via crypto-js before being stored in localStorage
- Your private key and seed phrase never leave the device
- Password is required to unlock, send transactions, or view the private key
- Session auto-locks after 5 minutes of inactivity

## Tech Stack

- **React + Vite** — frontend
- **Tailwind CSS** — styling
- **ethers.js v6** — wallet generation and transaction signing
- **bip39** — mnemonic generation and validation
- **crypto-js** — AES encryption
- **qrcode.react** — QR code for receive address
