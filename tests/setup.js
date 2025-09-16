// Test setup file
// Add any global test setup here

// Mock environment variables for testing
process.env.GITHUB_APP_ID = 'test_app_id';
process.env.GITHUB_PRIVATE_KEY = 'test_private_key';
process.env.GITHUB_WEBHOOK_SECRET = 'test_webhook_secret';
process.env.PORT = '3001';