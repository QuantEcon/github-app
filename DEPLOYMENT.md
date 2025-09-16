# Deployment Guide

This guide explains how to deploy the QuantEcon GitHub App.

## Prerequisites

1. Node.js 16.0.0 or higher
2. A GitHub account with permission to create GitHub Apps
3. A hosting service (e.g., Heroku, Railway, DigitalOcean, AWS)

## Step 1: Create a GitHub App

1. Go to GitHub Settings > Developer settings > GitHub Apps
2. Click "New GitHub App"
3. Fill in the required information:
   - **GitHub App name**: QuantEcon Automation
   - **Homepage URL**: Your app's homepage
   - **Webhook URL**: `https://your-domain.com/api/webhook`
   - **Webhook secret**: Generate a random secret string

### Required Permissions

Set these repository permissions:
- **Contents**: Read
- **Pull requests**: Read  
- **Checks**: Write

### Subscribe to Events

Subscribe to these events:
- Pull request
- Pull request review

## Step 2: Generate Private Key

1. After creating the app, scroll down to "Private keys"
2. Click "Generate a private key"
3. Download the `.pem` file

## Step 3: Install the App

1. Go to your GitHub App settings
2. Click "Install App" in the left sidebar
3. Install it on the repositories you want to monitor

## Step 4: Configure Environment Variables

Set these environment variables in your hosting service:

```bash
GITHUB_APP_ID=your_app_id_here
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
your_private_key_content_here
-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
PORT=3000
NODE_ENV=production
```

**Important**: The private key should include the full PEM content including the header and footer lines.

## Step 5: Deploy the Application

### Option A: Railway (Recommended)

1. Connect your GitHub repository to Railway
2. Set the environment variables in Railway dashboard
3. Deploy automatically on push

### Option B: Heroku

1. Create a new Heroku app
2. Connect to your GitHub repository
3. Set config vars in Heroku dashboard
4. Enable automatic deploys

### Option C: Manual Deployment

1. Clone the repository on your server
2. Set environment variables
3. Install dependencies: `npm install`
4. Start the application: `npm start`

## Step 6: Test the Deployment

1. Check the health endpoint: `GET https://your-domain.com/`
2. Create a test pull request in a monitored repository
3. Verify that check runs appear on the pull request

## Monitoring

The app provides these endpoints for monitoring:

- `GET /` - Health check
- `GET /api/status` - Service status
- `POST /api/webhook` - GitHub webhook receiver

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check that the webhook URL is accessible
   - Verify the webhook secret matches
   - Check the app installation permissions

2. **Authentication errors**
   - Verify the App ID is correct
   - Check that the private key is properly formatted
   - Ensure the app is installed on the target repositories

3. **Check runs not appearing**
   - Verify the app has "Checks: Write" permission
   - Check the application logs for errors

### Logs

Monitor application logs to debug issues:
```bash
# For Railway/Heroku
railway logs # or heroku logs --tail

# For manual deployment
npm start # Check console output
```