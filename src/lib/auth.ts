export const SESSION_COOKIE_NAME = 'medimall_session';

const getSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET must be configured before issuing session tokens.');
  }
  return secret;
};

// Web Crypto HMAC-SHA256 Implementation (100% Edge and Node compatible, zero external dependencies)
async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createSessionToken(): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    role: 'staff',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };

  const enc = new TextEncoder();
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await getCryptoKey();
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(dataToSign)
  );

  const signatureHex = bufferToHex(signatureBuffer);
  return `${dataToSign}.${signatureHex}`;
}

export async function verifySessionToken(token?: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const [encodedHeader, encodedPayload, signatureHex] = parts;
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const key = await getCryptoKey();
    const enc = new TextEncoder();
    const expectedSigBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      enc.encode(dataToSign)
    );
    const expectedHex = bufferToHex(expectedSigBuffer);

    if (expectedHex !== signatureHex) return false;

    const payload = JSON.parse(atob(encodedPayload));
    if (payload.role !== 'staff') return false;

    // Check expiration
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function verifyStaffPassword(inputPassword: string): boolean {
  const configuredPassword = process.env.STAFF_PASSWORD;
  if (!configuredPassword) return false;
  return inputPassword.trim() === configuredPassword.trim();
}
