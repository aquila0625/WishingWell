const crypto = require('node:crypto');

const ITERATIONS = 120000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
}

function isPasswordHash(value) {
  return /^pbkdf2\$\d+\$[a-f0-9]+\$[a-f0-9]+$/i.test(String(value || ''));
}

function verifyPassword(password, stored) {
  if (!isPasswordHash(stored)) return String(password) === String(stored);
  const [, iterations, salt, expected] = String(stored).split('$');
  const hash = crypto.pbkdf2Sync(String(password), salt, Number(iterations), expected.length / 2, DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expected, 'hex'));
}

module.exports = { hashPassword, isPasswordHash, verifyPassword };
