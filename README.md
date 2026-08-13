# HH Goa 2026 - Frame & ID Card Generator
**Team: TheUnhandledExceptions**

![Hacker House Goa 2026](https://hackathons.com/hh-goa-2026-badge.png) <!-- Placeholder image -->

## Overview
A blazing-fast, single-page application built to instantly generate branded event graphics and ID Cards for **Hacker House Goa 2026**. Designed with a premium, hacker-themed glassmorphism aesthetic mirroring the official brand poster, this tool allows builders to crop their photos, select their format, and instantly share their seat at the beach to X/Twitter.

## Tech Stack
- **Frontend Framework**: React + Vite
- **Styling Engine**: Tailwind CSS
- **Deployment & Serverless**: Vercel (Edge Functions & Node.js Serverless)
- **Data & Storage**: Vercel Blob (Image hosting), Vercel KV / Redis (Analytics & Kill Switch)

## Next-Level Features (The Flex)
We didn't just build a crop tool; we built a high-performance rendering engine on the edge.
- **Client-Side AI Face Centering**: Integrated `@mediapipe/tasks-vision` via WebAssembly to automatically detect faces and center the crop viewport instantly without a server roundtrip.
- **Pre-Cropper Image Compression**: Leveraged `browser-image-compression` via Web Workers to compress heavy 4K/HEIC mobile photos down to <1MB before they ever hit the canvas, preventing mobile Safari crashes.
- **Zero-DOM-Reflow Canvas Text Engine**: Instead of janky HTML-to-Canvas libraries, we used `@chenglou/pretext`—a pure math text-measuring engine—to perfectly word-wrap and layout the Builder ID text directly onto the HTML5 Canvas context.
- **Automated Anti-Cold Starts**: Integrated a Vercel Cron Job (`vercel.json`) that pings an Edge Runtime endpoint every 5 minutes to ensure social-share APIs remain persistently warm.
- **Nexus Command Center**: A fully secure, password-protected Admin Dashboard (`/admin`) sporting a cyberpunk aesthetic. Features live Redis usage tracking and an edge-synchronized **Kill Switch** to remotely disable the submission portal when the hackathon ends.
- **Standalone Go-Lang Core Export**: Packaged our core rendering pipeline inside a native, dependency-free Go web server (`/export/main.go`). Organizers can self-host this blazing-fast engine, dynamically swap frames in `/public`, and seamlessly connect their own database cluster using `DB_CONNECTION_STRING` and `DB_TYPE` environment variables. This entire architectural blueprint is exposed via our interactive **[ ? SYSTEM BRIEF / FIELD MANUAL ]** dashboard on the frontend, featuring a one-click `.ZIP` download of the system (`export.zip`).

## Local Setup Instructions

1. **Clone and Install**
   ```bash
   git clone https://github.com/your-username/hh-goa-frame.git
   cd hh-goa-frame
   npm install
   ```

2. **Environment Variables**
   Duplicate the `.env.example` file and rename it to `.env.local`. Fill in the secure tokens:
   ```bash
   cp .env.example .env.local
   ```
   *Note: You will need a Redis URL and a Vercel Blob token to run the analytics and sharing backend locally.*

3. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:5173` to see the generator, and `http://localhost:5173/admin` for the Nexus Command Center.
