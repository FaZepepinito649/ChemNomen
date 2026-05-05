const { json } = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  let body;
  try { body = JSON.parse(event.body); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const { system, messages } = body;
  const key = process.env.GROQ_API_KEY;
  if (!key) return json(500, { error: 'GROQ_API_KEY not configured' });

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 800,
        messages: [
          { role: 'system', content: system },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || 'Sorry, I could not process that.';
    // Normalize to Anthropic format so the frontend stays unchanged
    return json(200, { content: [{ type: 'text', text }] });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
