export default function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send('Missing ID');
  }

  // In a real implementation, you would query your database or blob storage URL
  // to get the actual image URL based on the ID.
  // For this mock, we will use a placeholder image or a static URL.
  // Note: Twitter requires absolute URLs for og:image.
  const host = req.headers.host || 'localhost:5173';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;
  
  // Example mock image URL (replace with actual blob URL later)
  const imageUrl = `https://placehold.co/1080x1080/4F46E5/FFFFFF.png?text=HH+Goa+2026+Badge+${id}`;
  const title = "My HH Goa 2026 Badge";
  const description = "I just created my custom badge for HH Goa 2026. Get yours now!";

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      
      <!-- Open Graph / Twitter Meta Tags -->
      <meta property="og:title" content="${title}" />
      <meta property="og:description" content="${description}" />
      <meta property="og:image" content="${imageUrl}" />
      <meta property="og:url" content="${baseUrl}/r/${id}" />
      <meta property="og:type" content="website" />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${title}" />
      <meta name="twitter:description" content="${description}" />
      <meta name="twitter:image" content="${imageUrl}" />

      <!-- Redirect standard browsers immediately to the homepage -->
      <meta http-equiv="refresh" content="0;url=/">
      
      <title>${title}</title>
    </head>
    <body>
      <p>Redirecting to <a href="/">homepage</a>...</p>
      <script>
        window.location.replace('/');
      </script>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
}
