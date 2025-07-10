import express from 'express';
import serverless from 'serverless-http';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerRoutes } from '../../dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Register API routes
registerRoutes(app);

// Handle all other routes for SPA
app.use('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/public/index.html'));
});

export const handler = serverless(app);