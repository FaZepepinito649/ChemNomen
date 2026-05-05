const { getStore } = require('@netlify/blobs');
const { hashPw, makeToken, json } = require('./_utils');

// Admin credentials are fixed — never stored in the blob store
const ADMIN_USER = 'admin';
const ADMIN_PASS = '1678';

async function getUsers(store) {
  const raw = await store.get('users');
  return raw ? JSON.parse(raw) : {};
}

async function saveUsers(store, users) {
  await store.set('users', JSON.stringify(users));
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  let body;
  try { body = JSON.parse(event.body); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const { action, username, password } = body;

  if (!username || !password)
    return json(400, { error: 'Username and password are required' });

  // ── Admin shortcut ───────────────────────────────────────────
  if (username === ADMIN_USER) {
    if (action === 'register')
      return json(400, { error: 'That username is reserved' });
    if (password === ADMIN_PASS)
      return json(200, { token: makeToken(ADMIN_USER, 'admin'), username: ADMIN_USER, role: 'admin' });
    return json(401, { error: 'Invalid credentials' });
  }

  const store = getStore('chemnomen');
  const users = await getUsers(store);

  // ── Register ─────────────────────────────────────────────────
  if (action === 'register') {
    if (users[username]) return json(409, { error: 'Username already taken' });
    if (username.length < 3 || username.length > 20)
      return json(400, { error: 'Username must be 3–20 characters' });
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return json(400, { error: 'Username: letters, numbers and _ only' });

    users[username] = {
      passwordHash: hashPw(password),
      score: 0, correct: 0, total: 0,
      categoryStats: {},
      createdAt: Date.now(),
    };
    await saveUsers(store, users);
    return json(200, { token: makeToken(username, 'user'), username, role: 'user' });
  }

  // ── Login ─────────────────────────────────────────────────────
  if (action === 'login') {
    const user = users[username];
    if (!user || user.passwordHash !== hashPw(password))
      return json(401, { error: 'Invalid credentials' });
    return json(200, {
      token: makeToken(username, 'user'),
      username,
      role: 'user',
      score: user.score,
      correct: user.correct,
      total: user.total,
    });
  }

  return json(400, { error: 'Unknown action. Use "login" or "register"' });
};
