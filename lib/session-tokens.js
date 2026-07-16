const crypto = require('node:crypto');

const DEFAULT_SESSION_SECRET = 'churchos-local-session-secret';

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payload, secret = DEFAULT_SESSION_SECRET) {
  return crypto
    .createHmac('sha256', String(secret || DEFAULT_SESSION_SECRET))
    .update(payload)
    .digest('base64url');
}

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createSessionToken(userId, secret = DEFAULT_SESSION_SECRET) {
  const payload = base64url(JSON.stringify({
    user_id: Number(userId),
    issued_at: Date.now()
  }));
  return `${payload}.${sign(payload, secret)}`;
}

function verifySessionToken(token, secret = DEFAULT_SESSION_SECRET) {
  const text = String(token || '').trim();
  const parts = text.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  if (!timingSafeEqual(parts[1], sign(parts[0], secret))) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const userId = Number(payload.user_id);
    if (!Number.isInteger(userId) || userId <= 0) return null;
    return { user_id: userId, issued_at: Number(payload.issued_at || 0) };
  } catch (error) {
    return null;
  }
}

module.exports = {
  DEFAULT_SESSION_SECRET,
  createSessionToken,
  verifySessionToken
};
