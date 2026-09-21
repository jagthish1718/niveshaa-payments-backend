import type { VercelRequest, VercelResponse } from '@vercel/node';

// AI Coach chat, proxied server-side so the Gemini API key never ships
// inside the app bundle (where anyone could pull it back out).
const MODEL = 'gemini-3.5-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AI coach is not configured on the server yet' });
  }

  const { history, systemInstruction } = (req.body ?? {}) as {
    history?: ChatTurn[];
    systemInstruction?: string;
  };
  if (!Array.isArray(history) || history.length === 0 || typeof systemInstruction !== 'string') {
    return res.status(400).json({ error: 'Missing history or systemInstruction' });
  }

  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    generationConfig: { temperature: 0.6, maxOutputTokens: 220 },
  };

  try {
    const geminiRes = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => '');
      console.error('Gemini error', geminiRes.status, errText);
      return res.status(502).json({ error: 'AI coach is having trouble right now. Try again in a bit.' });
    }

    const json = await geminiRes.json();
    const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
    if (!text.trim()) {
      return res
        .status(502)
        .json({ error: 'The AI coach could not come up with an answer. Try rephrasing your question.' });
    }
    return res.status(200).json({ text: text.trim() });
  } catch (err) {
    console.error('ai-coach failed', err);
    return res.status(502).json({ error: 'Network error reaching the AI coach.' });
  }
}
