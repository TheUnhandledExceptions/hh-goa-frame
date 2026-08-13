import redis from '../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const activeRaw = await redis.get('hackathon_active');
    // Default to true if not set
    const isHackathonActive = activeRaw === null ? true : activeRaw === 'true';

    return res.status(200).json({
      isHackathonActive
    });
  } catch (error) {
    console.error('Redis Fetch Error:', error);
    // If Redis fails, gracefully default to true to not block users unnecessarily
    return res.status(200).json({ isHackathonActive: true });
  }
}
