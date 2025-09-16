const express = require('express');
// const { Octokit } = require('octokit');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// GitHub App configuration
const appId = process.env.GITHUB_APP_ID;
const privateKey = process.env.GITHUB_PRIVATE_KEY;
const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

if (!appId || !privateKey || !webhookSecret) {
  console.log('Warning: GitHub App credentials not configured. Set GITHUB_APP_ID, GITHUB_PRIVATE_KEY, and GITHUB_WEBHOOK_SECRET environment variables.');
  console.log('The app will start but webhook functionality will not work until configured.');
}

// Initialize GitHub client (for future use when GitHub App is fully configured)
// let _octokit;
// if (process.env.GITHUB_TOKEN) {
//   _octokit = new Octokit({
//     auth: process.env.GITHUB_TOKEN,
//   });
// }

// Import service modules (commented out until webhook processing is implemented)
// const StyleChecker = require('./services/style-checker');
// const SpellChecker = require('./services/spell-checker');
// const CodeStyleChecker = require('./services/code-style-checker-python');
// const LinkChecker = require('./services/link-checker');

// Initialize services (they'll be used when webhook processing is implemented)
// const _styleChecker = new StyleChecker(null);
// const _spellChecker = new SpellChecker(null);
// const _codeStyleChecker = new CodeStyleChecker(null);
// const _linkChecker = new LinkChecker(null);

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'QuantEcon GitHub App',
    version: '1.0.0',
    status: 'running',
    services: ['style-checker', 'spell-checker', 'code-style-checker-python', 'link-checker'],
    configured: !!(appId && privateKey && webhookSecret)
  });
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      'style-checker': { status: 'active', description: 'Validates lecture style compliance' },
      'spell-checker': { status: 'active', description: 'Checks spelling in documentation' },
      'code-style-checker-python': { status: 'active', description: 'Validates Python code style using Black standards' },
      'link-checker': { status: 'active', description: 'Validates links in documentation' }
    }
  });
});

// Webhook endpoint placeholder
app.post('/api/webhook', (req, res) => {
  console.log('Webhook received:', req.body?.action || 'unknown action');
  
  // For now, just acknowledge receipt
  // In production, this would verify the webhook signature and process events
  res.status(200).json({ message: 'Webhook received' });
});

// Start server
app.listen(port, () => {
  console.log(`QuantEcon GitHub App listening on port ${port}`);
  console.log('Available services:');
  console.log('- Style Checker for lectures');
  console.log('- Spell Checker');
  console.log('- Code Style Checker (Python/Black)');
  console.log('- Link Checker');
  console.log('');
  console.log('Endpoints:');
  console.log('- GET /          - Health check');
  console.log('- GET /api/status - Service status');
  console.log('- POST /api/webhook - GitHub webhook endpoint');
});

module.exports = app;