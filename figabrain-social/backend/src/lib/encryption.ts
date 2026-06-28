import crypto from "node:crypto";
import { env } from "./env.js";

const ALGORITHM = "aes-256-gcm";
// AES-256 requires exactly 32 bytes = 64 hex chars
if (!/^[0-9a-fA-F]{64}$/.test(env.WALLET_ENCRYPTION_KEY)) {
  throw new Error("WALLET_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)");
}
const KEY = Buffer.from(env.WALLET_ENCRYPTION_KEY, "hex");

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export function encryptSecret(plaintext: string): EncryptedPayload {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptSecret(payload: EncryptedPayload): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
