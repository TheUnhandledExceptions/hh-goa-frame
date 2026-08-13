import { put } from '@vercel/blob';
import redis from '../lib/redis.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Put the raw request stream directly into Vercel Blob
    const blob = await put('hh-goa-2026.png', req, {
      access: 'public',
    });

    // Increment generation stats in Redis
    try {
      await redis.incr('total_generations');
    } catch (redisError) {
      console.error('Redis Increment Error:', redisError);
      // We don't fail the upload just because stats tracking failed
    }

    // Return the URL
    return res.status(200).json({ url: blob.url });
  } catch (error) {
    console.error('Upload Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
