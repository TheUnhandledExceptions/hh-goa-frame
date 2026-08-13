# Hacker House Goa 2026 - Standalone Generator Server

Welcome to the standalone, self-hostable Go-lang wrapper for the HH Goa 2026 Frame Generator. This package is designed to be ultra-lightweight with zero heavy external dependencies, so you can run it out-of-the-box on any edge node or container.

## Features
- **Instant Static Hosting**: A blazing fast native Go HTTP server that serves your frontend from `/public`.
- **Database Agnostic**: Pre-wired endpoints that ingest frontend data and log it to any standard DB.
- **Mocked DB Middleware**: A `/api/save-badge` POST endpoint that simulates the saving process, ready to be connected to your PostgreSQL, MongoDB, or Redis instance.

## How to Run

1. **Install Go**: Ensure you have Go 1.21+ installed on your machine.
2. **Start the Server**:
   ```bash
   go run main.go
   ```
   The server will start on port `8080` by default. You can access the generator at `http://localhost:8080`.

## Customization

### Adding Frames
To customize the generator with your own frames:
1. Drop your single or multiple `.svg` or `.png` frames into the `/public` directory.
2. Ensure your frontend application (e.g., `App.jsx` from the original source) points to the correct filenames.

### Database Configuration
To plug in your own production database, set the following environment variables before running the server:

- `DB_TYPE`: The type of database you are connecting to (e.g., `PostgreSQL`, `MongoDB`, `Redis`). Defaults to `PostgreSQL`.
- `DB_CONNECTION_STRING`: Your actual database connection URI.

**Example (Linux/macOS):**
```bash
export DB_TYPE="Redis"
export DB_CONNECTION_STRING="redis://user:password@localhost:6379"
go run main.go
```
