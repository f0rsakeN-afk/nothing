import 'server-only';

import { decryptOAuthValue } from './server-config';
import { refreshAccessToken } from './oauth';
import prisma from '@/lib/prisma';

type McpAuthType = 'none' | 'bearer' | 'header' | 'oauth';

export async function getMcpAuthHeaders(
  server: {
    id: string;
    authType: McpAuthType;
    encryptedCredentials: string | null;
    oauthAccessTokenEncrypted: string | null;
    oauthRefreshTokenEncrypted: string | null;
    oauthAccessTokenExpiresAt: Date | null;
    oauthIssuerUrl: string | null;
    oauthTokenUrl: string | null;
    oauthClientId: string | null;
    oauthClientSecretEncrypted: string | null;
  },
  userId: string
) {
  if (server.authType === 'none') return {};

  if (server.authType === 'oauth') {
    const token = await resolveMcpOAuthAccessToken(server, userId);
    return { Authorization: `Bearer ${token}` };
  }

  const payload = getMcpCredentialPayload(server);
  if (server.authType === 'bearer') {
    if (!payload.bearerToken) throw new Error('Invalid bearer credential payload');
    return { Authorization: `Bearer ${payload.bearerToken}` };
  }

  if (!payload.headerName || !payload.headerValue) throw new Error('Invalid header credential payload');
  return { [payload.headerName]: payload.headerValue };
}

function getMcpCredentialPayload(server: {
  authType: string;
  encryptedCredentials: string | null;
}) {
  if (server.authType === 'none') return {};
  if (!server.encryptedCredentials) throw new Error('Missing encrypted credentials');

  const decrypted = decryptCredential(server.encryptedCredentials);
  return JSON.parse(decrypted) as { bearerToken?: string; headerName?: string; headerValue?: string };
}

function decryptCredential(ciphertext: string): string {
  const crypto = require('node:crypto');
  const ALGORITHM = 'aes-256-gcm';
  const ENCRYPTION_KEY = process.env.MCP_CREDENTIALS_ENCRYPTION_KEY || 'development-key-32-bytes-long!!';
  const key = Buffer.from(ENCRYPTION_KEY, 'utf8').subarray(0, 32);

  const combined = Buffer.from(ciphertext, 'base64');
  const iv = combined.subarray(0, 16);
  const authTag = combined.subarray(16, 32);
  const encrypted = combined.subarray(32);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

async function resolveMcpOAuthAccessToken(
  server: {
    id: string;
    authType: McpAuthType;
    oauthTokenUrl: string | null;
    oauthClientId: string | null;
    oauthClientSecretEncrypted: string | null;
    oauthAccessTokenEncrypted: string | null;
    oauthRefreshTokenEncrypted: string | null;
    oauthAccessTokenExpiresAt: Date | null;
  },
  userId: string
) {
  if (server.authType !== 'oauth') {
    throw new Error('resolveMcpOAuthAccessToken called on non-OAuth server');
  }

  const now = new Date();

  // Check if current token is still valid
  if (
    server.oauthAccessTokenEncrypted &&
    server.oauthAccessTokenExpiresAt &&
    server.oauthAccessTokenExpiresAt > now
  ) {
    return decryptOAuthValue(server.oauthAccessTokenEncrypted);
  }

  // Token expired or about to expire, try to refresh
  if (server.oauthRefreshTokenEncrypted && server.oauthTokenUrl && server.oauthClientId) {
    const clientSecret = decryptOAuthValue(server.oauthClientSecretEncrypted);
    const refreshToken = decryptOAuthValue(server.oauthRefreshTokenEncrypted);

    if (refreshToken && clientSecret) {
      try {
        const newTokens = await refreshAccessToken({
          tokenUrl: server.oauthTokenUrl,
          clientId: server.oauthClientId,
          clientSecret,
          refreshToken,
        });

        // Store new tokens in database
        await prisma.mcpUserServer.update({
          where: { id: server.id, userId },
          data: {
            oauthAccessTokenEncrypted: encryptValue(newTokens.accessToken),
            oauthRefreshTokenEncrypted: encryptValue(newTokens.refreshToken),
            oauthAccessTokenExpiresAt: newTokens.expiresAt,
          },
        });

        return newTokens.accessToken;
      } catch (error) {
        console.error('Failed to refresh OAuth token:', error);
        // Fall through to return existing token or throw
      }
    }
  }

  // If we get here, try to return existing token (may be expired)
  if (server.oauthAccessTokenEncrypted) {
    return decryptOAuthValue(server.oauthAccessTokenEncrypted);
  }

  throw new Error('No OAuth access token available');
}

function encryptValue(value: string): string {
  const crypto = require('node:crypto');
  const ALGORITHM = 'aes-256-gcm';
  const ENCRYPTION_KEY = process.env.MCP_CREDENTIALS_ENCRYPTION_KEY || 'development-key-32-bytes-long!!';
  const key = Buffer.from(ENCRYPTION_KEY, 'utf8').subarray(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(value, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'base64')]);
  return combined.toString('base64');
}
