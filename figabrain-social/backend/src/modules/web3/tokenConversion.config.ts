/**
 * Brain Points -> FGB Token conversion rate. Purely simulated today: no real
 * on-chain transfer happens, the converted amount is only credited to the
 * off-chain Wallet.tokenBalance ledger via TokenEngine.creditOffChain. Once a
 * live FGB token launches, settlement can be added without touching callers.
 */
export const FGB_CONVERSION_RATE = 0.001; // 1000 Brain Points == 1 FGB
export const MIN_CONVERSION_POINTS = 100;
