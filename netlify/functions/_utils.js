// Shared utilities for Netlify Functions
const crypto = require('crypto');

const SALT = 'chemnomen-salt-2024';
const getSecret = () => process.env.SESSION_SECRET || 'dev-secret-please-change-in-netlify';

const hashPw = (pw) =>
  crypto.createHash('sha256').update(pw + SALT).digest('hex');

function makeToken(username, role) {
  const payload = Buffer.from(
    JSON.stringify({ u: username, r: role, exp: Date.now() + 7 * 864e5 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token) return null;
  try {
    const [payload, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
    if (sig !== expected) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (Date.now() > data.exp) return null;
    return data; // { u: username, r: role, exp: timestamp }
  } catch {
    return null;
  }
}

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

module.exports = { hashPw, makeToken, verifyToken, json };
