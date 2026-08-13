import { put } from '@vercel/blob';
import { Redis } from 'ioredis';

// CRITICAL: Disable Vercel's default body parser for raw image streams
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    // Pass the raw request stream directly to Vercel Blob
    const blob = await put(`badge-${Date.now()}.png`, req, {
      access: 'public',
    });

    // Optimistically increment stats without blocking the response
    try {
      if (process.env.REDIS_URL) {
        const redis = new Redis(process.env.REDIS_URL);
        await redis.incr('total_generations');
        redis.quit();
      }
    } catch (redisError) {
      console.error('Redis increment failed:', redisError);
    }

    return res.status(200).json({ url: blob.url });
  } catch (error) {
    console.error('Blob upload error:', error);
    return res.status(500).json({ error: 'Upload failed', details: error.message });
  }
}
