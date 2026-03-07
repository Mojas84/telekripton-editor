import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Serve static files from dist/public
const staticPath = path.resolve(__dirname, "..", "dist", "public");
app.use(express.static(staticPath));

// Handle client-side routing - serve index.html for all routes
app.get("*", (_req, res) => {
  // If we are on Vercel, the static files are served automatically, 
  // but for local dev or custom routes, we keep this.
  const indexPath = path.join(staticPath, "index.html");
  res.sendFile(indexPath);
});

const port = process.env.PORT || 3000;

if (!process.env.VERCEL) {
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

export default app;
