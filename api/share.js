export default function handler(req, res) {
  const { imgUrl } = req.query;

  if (!imgUrl) {
    return res.status(400).send('Missing imgUrl query parameter');
  }

  const title = "I'm building at HH Goa 2026!";

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      
      <meta property="og:title" content="${title}" />
      <meta property="og:image" content="${imgUrl}" />
      <meta name="twitter:card" content="summary_large_image" />
      
      <title>${title}</title>
      <style>
        body {
          background-color: #030712;
          color: white;
          font-family: system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 20px;
        }
        img {
          max-width: 100%;
          height: auto;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(168, 85, 247, 0.15);
        }
        .container {
          max-width: 500px;
          text-align: center;
          width: 100%;
        }
        h1 { margin-bottom: 2rem; font-size: 1.5rem; }
        a.button {
          display: inline-block;
          margin-top: 2rem;
          padding: 1rem 2rem;
          background: linear-gradient(to right, #9333ea, #2563eb);
          color: white;
          text-decoration: none;
          border-radius: 12px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${title}</h1>
        <img src="${imgUrl}" alt="HH Goa 2026 Badge" />
        <br />
        <a href="/" class="button">Create your own badge</a>
      </div>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
}
