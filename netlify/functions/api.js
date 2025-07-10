const express = require('express');
const serverless = require('serverless-http');
const { registerRoutes } = require('../../dist/server/index.js');

const app = express();
app.use(express.json());

// Register API routes
registerRoutes(app);

// Handle all other routes for SPA
app.use('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/public/index.html'));
});

module.exports.handler = serverless(app);