# QuantEcon GitHub App

A GitHub App to host custom QuantEcon tooling and automations. This app provides modular services for code quality, style checking, and content validation.

## Features

### Automated Code Quality Checks

The app provides the following automated checks on pull requests:

1. **Style Checker** - Ensures lectures comply with the custom QuantEcon style guide
2. **Spell Checker** - Validates spelling in documentation and lecture files  
3. **Code Style Checker (Python)** - Reviews and formats Python code using Black standards
4. **Link Checker** - Validates that links in documentation are accessible

## Current Status

✅ **Basic GitHub App Structure**: Complete  
✅ **Modular Service Architecture**: Complete  
✅ **Core Service Logic**: Complete  
✅ **Express Server with Endpoints**: Complete  
✅ **Configuration Management**: Complete  
✅ **Documentation**: Complete

🔧 **Next Steps for Production**:
- Configure GitHub App authentication  
- Implement full webhook processing
- Add comprehensive error handling
- Set up production deployment
- Add integration tests

## Architecture

The app follows a modular architecture where each checker service can be independently developed and maintained:

```
src/
├── index.js                 # Main application entry point
├── services/               # Checker service modules
│   ├── base-service.js     # Base class for all services
│   ├── style-checker.js    # Lecture style guide compliance
│   ├── spell-checker.js    # Spelling validation
│   ├── code-style-checker-python.js  # Python/Black formatting
│   └── link-checker.js     # Link validation
├── utils/                  # Utility functions
└── routes/                 # API routes
```

## Setup

### Prerequisites

- Node.js 16.0.0 or higher
- A GitHub App with appropriate permissions

### Installation

1. Clone the repository:
```bash
git clone https://github.com/QuantEcon/github-app.git
cd github-app
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your GitHub App credentials:
```
GITHUB_APP_ID=your_app_id_here
GITHUB_PRIVATE_KEY=your_private_key_here
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
PORT=3000
```

### GitHub App Configuration

Your GitHub App needs the following permissions:
- **Repository permissions:**
  - Contents: Read
  - Pull requests: Read
  - Checks: Write
- **Subscribe to events:**
  - Pull request
  - Pull request review

### Running the App

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### Testing

Run the test suite:
```bash
npm test
```

Run linting:
```bash
npm run lint
```

## Service Details

### Style Checker

Validates lecture files against QuantEcon style guidelines:
- Proper heading structure
- Consistent code block formatting  
- LaTeX equation formatting
- Trailing whitespace removal

**Supported file types:** `.md`, `.ipynb`, `.rst`

### Spell Checker

Checks for common spelling errors in documentation:
- Ignores technical terms and code blocks
- Provides correction suggestions
- Configurable word lists

**Supported file types:** `.md`, `.rst`, `.txt`, `README` files

### Code Style Checker (Python)

Enforces Black code formatting standards:
- Line length limits (88 characters)
- Operator spacing
- Import organization
- String quote consistency

**Supported file types:** `.py`

### Link Checker

Validates external links in documentation:
- Checks link accessibility
- Identifies broken links
- Handles common link formats (Markdown, direct URLs)

**Supported file types:** `.md`, `.rst`, `.html`, `.txt`

## API Endpoints

- `GET /` - Health check and app status
- `GET /api/status` - Detailed service status
- `POST /api/webhook` - GitHub webhook receiver (for future implementation)

## Next Steps

To complete the production setup:

1. **Configure GitHub App Authentication**
   - Follow the [deployment guide](DEPLOYMENT.md)
   - Set up proper environment variables
   - Test webhook connectivity

2. **Implement Webhook Processing**
   - Uncomment service imports in `src/index.js`
   - Add proper webhook signature verification
   - Implement event processing logic

3. **Enhanced Error Handling**
   - Add retry mechanisms
   - Implement proper logging
   - Add error reporting

4. **Production Deployment**
   - Set up CI/CD pipeline
   - Configure monitoring and alerts
   - Add health checks

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Submit a pull request

## License

MIT License - see LICENSE file for details.
