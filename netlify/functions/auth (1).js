const { getStore } = require('@netlify/blobs');
const { hashPw, makeToken, json } = require('./_utils');

const ADMIN_USER = 'admin';
const ADMIN_PASS = '1678';

function getStoreWithEnv() {
  const siteID = process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_TOKEN;

  if (!siteID || !token) {
    throw new Error(
      'Missing NETLIFY_SITE_ID or NETLIFY_TOKEN environment variables. ' +
      'Add them in Netlify → Site configuration → Environment variables.'
    );
  }

  return getStore({ name: 'chemnomen', siteID, token, consistency: 'strong' });
}

async function getUsers(store) {
  try {
    const raw = await store.get('users');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
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

  const u = username.trim().toLowerCase();

  // ── Admin shortcut (no DB needed) ───────────────────────────
  if (u === ADMIN_USER) {
    if (action === 'register')
      return json(400, { error: 'That username is reserved' });
    if (password === ADMIN_PASS)
      return json(200, {
        token: makeToken(ADMIN_USER, 'admin'),
        username: ADMIN_USER, role: 'admin',
        score: 0, correct: 0, total: 0,
      });
    return json(401, { error: 'Invalid credentials' });
  }

  // ── Validation ───────────────────────────────────────────────
  if (u.length < 3 || u.length > 20)
    return json(400, { error: 'Username must be 3–20 characters' });
  if (!/^[a-zA-Z0-9_]+$/.test(u))
    return json(400, { error: 'Username: only letters, numbers and _' });

  // ── Blob store ───────────────────────────────────────────────
  let store;
  try {
    store = getStoreWithEnv();
  } catch (e) {
    return json(500, { error: e.message });
  }

  const users = await getUsers(store);

  // ── Register ─────────────────────────────────────────────────
  if (action === 'register') {
    if (users[u]) return json(409, { error: 'Username already taken' });

    users[u] = {
      passwordHash: hashPw(password),
      score: 0, correct: 0, total: 0,
      categoryStats: {},
      createdAt: Date.now(),
    };

    try {
      await saveUsers(store, users);
    } catch (e) {
      return json(500, { error: 'Could not save user: ' + e.message });
    }

    return json(200, {
      token: makeToken(u, 'user'),
      username: u, role: 'user',
      score: 0, correct: 0, total: 0,
    });
  }

  // ── Login ─────────────────────────────────────────────────────
  if (action === 'login') {
    const user = users[u];
    if (!user || user.passwordHash !== hashPw(password))
      return json(401, { error: 'Invalid credentials' });

    return json(200, {
      token: makeToken(u, 'user'),
      username: u, role: 'user',
      score: user.score || 0,
      correct: user.correct || 0,
      total: user.total || 0,
    });
  }

  return json(400, { error: 'Unknown action. Use "login" or "register"' });
};
