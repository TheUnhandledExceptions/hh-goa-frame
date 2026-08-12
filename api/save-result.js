import { put } from '@vercel/blob';

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

    // Return the URL
    return res.status(200).json({ url: blob.url });
  } catch (error) {
    console.error('Upload Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
