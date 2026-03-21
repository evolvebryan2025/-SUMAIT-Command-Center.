/**
 * Simple AES-256-GCM encryption for credentials vault.
 * Uses ENCRYPTION_KEY env var (32-byte hex string).
 * Falls back to base64 encoding if no key is set (dev mode).
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;

function getKey(): string | null {
  return process.env.ENCRYPTION_KEY ?? null;
}

async function importKey(hexKey: string): Promise<CryptoKey> {
  const keyBytes = new Uint8Array(
    hexKey.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
  );
  return crypto.subtle.importKey("raw", keyBytes, ALGORITHM, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encrypt(plaintext: string): Promise<string> {
  const hexKey = getKey();
  if (!hexKey) {
    // Dev fallback: base64 encode (NOT secure, just for local dev)
    return `b64:${Buffer.from(plaintext).toString("base64")}`;
  }

  const key = await importKey(hexKey);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );

  // Format: iv:ciphertext (both hex-encoded)
  const ivHex = Array.from(iv)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const ctHex = Array.from(new Uint8Array(ciphertext))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `aes:${ivHex}:${ctHex}`;
}

export async function decrypt(encrypted: string): Promise<string> {
  // Dev fallback
  if (encrypted.startsWith("b64:")) {
    return Buffer.from(encrypted.slice(4), "base64").toString("utf-8");
  }

  if (!encrypted.startsWith("aes:")) {
    throw new Error("Unknown encryption format");
  }

  const hexKey = getKey();
  if (!hexKey) {
    throw new Error("ENCRYPTION_KEY not set — cannot decrypt AES data");
  }

  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format");
  }

  const ivHex = parts[1];
  const ctHex = parts[2];

  const iv = new Uint8Array(
    ivHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
  );
  const ciphertext = new Uint8Array(
    ctHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
  );

  const key = await importKey(hexKey);

  const plainBytes = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plainBytes);
}

/** Mask a credential for display (show first 4 and last 4 chars) */
export function maskValue(value: string): string {
  if (value.length <= 10) return "••••••••";
  return `${value.slice(0, 4)}${"•".repeat(Math.min(value.length - 8, 20))}${value.slice(-4)}`;
}
