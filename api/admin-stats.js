import redis from '../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authHeader = req.headers.authorization;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const totalGenerations = await redis.get('total_generations') || 0;
    const isHackathonActive = await redis.get('hackathon_active') || 'true';

    return res.status(200).json({
      totalGenerations: parseInt(totalGenerations, 10),
      isHackathonActive: isHackathonActive === 'true'
    });
  } catch (error) {
    console.error('Redis Fetch Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
