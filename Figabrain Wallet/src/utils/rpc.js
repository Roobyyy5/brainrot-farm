import { ethers } from 'ethers'

export const NETWORKS = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    symbol: 'ETH',
    rpc: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
    explorerApi: 'https://api.etherscan.io/api',
    color: '#627EEA',
    tokens: {
      USDT: {
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        decimals: 6,
        symbol: 'USDT',
      },
      USDC: {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        decimals: 6,
        symbol: 'USDC',
      },
    },
  },
  bsc: {
    id: 'bsc',
    name: 'BNB Chain',
    chainId: 56,
    symbol: 'BNB',
    rpc: 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com',
    explorerApi: 'https://api.bscscan.com/api',
    color: '#F3BA2F',
    tokens: {
      USDT: {
        address: '0x55d398326f99059fF775485246999027B3197955',
        decimals: 18,
        symbol: 'USDT',
      },
      USDC: {
        address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        decimals: 18,
        symbol: 'USDC',
      },
    },
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    chainId: 137,
    symbol: 'MATIC',
    rpc: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    explorerApi: 'https://api.polygonscan.com/api',
    color: '#8247E5',
    tokens: {
      USDT: {
        address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        decimals: 6,
        symbol: 'USDT',
      },
      USDC: {
        address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        decimals: 6,
        symbol: 'USDC',
      },
    },
  },
}

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
]

export function getProvider(networkId) {
  const net = NETWORKS[networkId]
  if (!net) throw new Error(`Unknown network: ${networkId}`)
  return new ethers.JsonRpcProvider(net.rpc)
}

export async function getNativeBalance(address, networkId) {
  const provider = getProvider(networkId)
  const balance = await provider.getBalance(address)
  return ethers.formatEther(balance)
}

export async function getTokenBalance(address, tokenSymbol, networkId) {
  const net = NETWORKS[networkId]
  const token = net.tokens[tokenSymbol]
  if (!token) return '0'
  const provider = getProvider(networkId)
  const contract = new ethers.Contract(token.address, ERC20_ABI, provider)
  const balance = await contract.balanceOf(address)
  return ethers.formatUnits(balance, token.decimals)
}

export async function estimateGas(fromAddress, toAddress, amount, tokenSymbol, networkId) {
  const net = NETWORKS[networkId]
  const provider = getProvider(networkId)
  const feeData = await provider.getFeeData()
  const gasPrice = feeData.gasPrice

  let gasLimit
  if (tokenSymbol === net.symbol) {
    gasLimit = 21000n
  } else {
    const token = net.tokens[tokenSymbol]
    const contract = new ethers.Contract(token.address, ERC20_ABI, provider)
    const amountWei = ethers.parseUnits(amount || '0', token.decimals)
    try {
      gasLimit = await contract.transfer.estimateGas(toAddress, amountWei, { from: fromAddress })
    } catch {
      gasLimit = 65000n
    }
  }

  const gasCost = gasPrice * gasLimit
  return {
    gasLimit: gasLimit.toString(),
    gasPrice: ethers.formatUnits(gasPrice, 'gwei'),
    gasCostEth: ethers.formatEther(gasCost),
    gasCostWei: gasCost.toString(),
  }
}

export async function sendNative(privateKey, toAddress, amount, networkId) {
  const provider = getProvider(networkId)
  const wallet = new ethers.Wallet(privateKey, provider)
  const feeData = await provider.getFeeData()
  const tx = await wallet.sendTransaction({
    to: toAddress,
    value: ethers.parseEther(amount),
    gasPrice: feeData.gasPrice,
  })
  return tx.hash
}

export async function sendToken(privateKey, toAddress, amount, tokenSymbol, networkId) {
  const net = NETWORKS[networkId]
  const token = net.tokens[tokenSymbol]
  const provider = getProvider(networkId)
  const wallet = new ethers.Wallet(privateKey, provider)
  const contract = new ethers.Contract(token.address, ERC20_ABI, wallet)
  const amountWei = ethers.parseUnits(amount, token.decimals)
  const tx = await contract.transfer(toAddress, amountWei)
  return tx.hash
}

export async function fetchTransactions(address, networkId, etherscanKey) {
  const net = NETWORKS[networkId]
  const apiKey = etherscanKey || 'YourApiKeyToken'
  const url = `${net.explorerApi}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=${apiKey}`
  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data.status === '1') return data.result
    return []
  } catch {
    return []
  }
}
