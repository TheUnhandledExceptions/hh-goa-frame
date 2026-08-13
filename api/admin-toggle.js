import redis from '../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authHeader = req.headers.authorization;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { active } = body;
    
    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'Bad Request: active must be a boolean' });
    }

    await redis.set('hackathon_active', active ? 'true' : 'false');

    return res.status(200).json({ success: true, hackathon_active: active });
  } catch (error) {
    console.error('Redis Toggle Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
