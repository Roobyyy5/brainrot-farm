import nacl from "tweetnacl";
import bs58 from "bs58";
import { encryptSecret, decryptSecret, type EncryptedPayload } from "./encryption.js";

export interface GeneratedWallet {
  address: string;
  publicKey: string;
  encrypted: EncryptedPayload;
}

/**
 * Generates an ed25519 keypair. ed25519 is the signing scheme used by both
 * Solana and TON, so this keypair format can be wired to a real
 * SolanaProvider/TonProvider later without re-issuing wallets.
 */
export function generateWallet(): GeneratedWallet {
  const keyPair = nacl.sign.keyPair();
  const address = bs58.encode(keyPair.publicKey);
  const publicKey = bs58.encode(keyPair.publicKey);
  const encrypted = encryptSecret(bs58.encode(keyPair.secretKey));

  return { address, publicKey, encrypted };
}

export function decryptWalletPrivateKey(payload: EncryptedPayload): string {
  return decryptSecret(payload);
}
