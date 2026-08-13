export default function handler(req, res) {
  const { imgUrl } = req.query;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hacker House Goa 2026</title>
        
        <!-- Crucial Meta Tags for Twitter/X -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Just built my HH Goa 2026 badge! #FrameInGoa" />
        <meta name="twitter:image" content="${imgUrl}" />
        
        <meta property="og:title" content="Just built my HH Goa 2026 badge! #FrameInGoa" />
        <meta property="og:image" content="${imgUrl}" />
        <meta property="og:type" content="website" />
      </head>
      <body style="background: #12573b; color: white; text-align: center; font-family: monospace; padding: 2rem;">
        <h2>HH Goa 2026 Frame Generator</h2>
        <img src="${imgUrl}" alt="Generated Badge" style="max-width: 100%; border-radius: 12px; box-shadow: 0 0 20px rgba(249,22,129,0.3);" />
      </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
