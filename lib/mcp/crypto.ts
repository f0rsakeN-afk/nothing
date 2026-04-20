import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ENCRYPTION_KEY = process.env.MCP_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('MCP_ENCRYPTION_KEY environment variable is not set');
}

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const key = ENCRYPTION_KEY || 'development-key-32-bytes-long!!';
  // Ensure 32 bytes for AES-256
  return Buffer.from(key, 'utf8').subarray(0, 32);
}

export function encryptMcpCredentials(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Combine iv + authTag + encrypted data
  const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'base64')]);
  return combined.toString('base64');
}

export function decryptMcpCredentials(ciphertext: string): string {
  const key = getKey();
  const combined = Buffer.from(ciphertext, 'base64');

  const iv = combined.subarray(0, 16);
  const authTag = combined.subarray(16, 32);
  const encrypted = combined.subarray(32);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
