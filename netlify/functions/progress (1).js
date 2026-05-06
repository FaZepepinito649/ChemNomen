const { getStore } = require('@netlify/blobs');
const { verifyToken, json } = require('./_utils');

function getStoreWithEnv() {
  const siteID = process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_TOKEN;

  if (!siteID || !token) {
    throw new Error('Missing NETLIFY_SITE_ID or NETLIFY_TOKEN environment variables.');
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

  // ── GET — public leaderboard ───────────────────────────────
  if (event.httpMethod === 'GET') {
    let store;
    try { store = getStoreWithEnv(); } catch (e) { return json(500, { error: e.message }); }

    const users = await getUsers(store);
    const board = Object.entries(users)
      .map(([name, d]) => ({
        name,
        score:   d.score   || 0,
        correct: d.correct || 0,
        total:   d.total   || 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

    return json(200, { leaderboard: board });
  }

  // ── POST — update progress ─────────────────────────────────
  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body); }
    catch { return json(400, { error: 'Invalid JSON' }); }

    const { token, correct, points, category } = body;
    const session = verifyToken(token);
    if (!session) return json(401, { error: 'Invalid or expired session' });

    const username = session.u;
    if (username === 'admin') return json(200, { score: 0, correct: 0, total: 0 });

    let store;
    try { store = getStoreWithEnv(); } catch (e) { return json(500, { error: e.message }); }

    const users = await getUsers(store);
    if (!users[username]) return json(404, { error: 'User not found' });

    const u = users[username];
    u.total = (u.total || 0) + 1;
    if (correct) {
      u.correct = (u.correct || 0) + 1;
      u.score   = (u.score   || 0) + (points || 0);
    }
    if (!u.categoryStats) u.categoryStats = {};
    if (!u.categoryStats[category]) u.categoryStats[category] = { correct: 0, total: 0 };
    u.categoryStats[category].total++;
    if (correct) u.categoryStats[category].correct++;

    users[username] = u;

    try {
      await saveUsers(store, users);
    } catch (e) {
      return json(500, { error: 'Could not save progress: ' + e.message });
    }

    return json(200, {
      score:         u.score,
      correct:       u.correct,
      total:         u.total,
      categoryStats: u.categoryStats,
    });
  }

  return json(405, { error: 'Method Not Allowed' });
};
