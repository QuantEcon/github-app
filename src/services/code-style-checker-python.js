const BaseService = require('./base-service');

/**
 * Code Style Checker for Python using Black formatter
 * Reviews and formats Python code according to Black standards
 */
class CodeStyleChecker extends BaseService {
  constructor(githubApp) {
    super(githubApp, 'Code Style Checker (Python)');
  }

  /**
   * Check pull request for Python code style compliance
   */
  async checkPullRequest(payload) {
    const { installation, repository, pull_request } = payload;
    
    try {
      this.log(`Starting Python code style check for PR #${pull_request.number} in ${repository.full_name}`);
      
      const octokit = await this.getOctokit(installation.id);
      const checkRun = await this.createCheckRun(
        octokit,
        repository.owner.login,
        repository.name,
        pull_request.head.sha,
        'Python Code Style (Black)'
      );

      // Get changed files
      const files = await this.getPullRequestFiles(
        octokit,
        repository.owner.login,
        repository.name,
        pull_request.number
      );

      // Filter for Python files
      const pythonFiles = files.filter(file => 
        file.filename.endsWith('.py') &&
        !file.filename.includes('__pycache__') &&
        file.status !== 'removed'
      );

      if (pythonFiles.length === 0) {
        await this.updateCheckRun(
          octokit,
          repository.owner.login,
          repository.name,
          checkRun.id,
          'neutral',
          'No Python files found in this pull request.'
        );
        return;
      }

      const annotations = [];
      let hasStyleIssues = false;

      // Check each Python file
      for (const file of pythonFiles) {
        this.log(`Checking Python style for file: ${file.filename}`);
        
        const content = await this.getFileContent(
          octokit,
          repository.owner.login,
          repository.name,
          file.filename,
          pull_request.head.sha
        );

        if (content) {
          const fileAnnotations = await this.checkPythonStyle(file.filename, content);
          annotations.push(...fileAnnotations);
          
          if (fileAnnotations.length > 0) {
            hasStyleIssues = true;
          }
        }
      }

      const conclusion = hasStyleIssues ? 'failure' : 'success';
      const summary = hasStyleIssues 
        ? `Found ${annotations.length} code style issues in ${pythonFiles.length} Python files. Consider running 'black' to auto-format.`
        : `All ${pythonFiles.length} Python files follow Black code style guidelines.`;

      await this.updateCheckRun(
        octokit,
        repository.owner.login,
        repository.name,
        checkRun.id,
        conclusion,
        summary,
        annotations
      );

      this.log(`Python code style check completed for PR #${pull_request.number}: ${conclusion}`);
      
    } catch (error) {
      this.log(`Error during Python code style check: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Check individual Python file for style compliance
   * This implements basic Black-style rules
   */
  async checkPythonStyle(filename, content) {
    const annotations = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      const trimmedLine = line.trim();

      // Skip empty lines and comments for most checks
      if (trimmedLine === '' || trimmedLine.startsWith('#')) {
        continue;
      }

      // Rule 1: Line length (Black default is 88 characters)
      if (line.length > 88) {
        annotations.push({
          path: filename,
          start_line: lineNumber,
          end_line: lineNumber,
          start_column: 89,
          end_column: line.length,
          annotation_level: 'warning',
          message: `Line too long (${line.length} > 88 characters). Consider using Black formatter.`,
          title: 'Line Length'
        });
      }

      // Rule 2: Trailing whitespace
      if (line.endsWith(' ') || line.endsWith('\t')) {
        annotations.push({
          path: filename,
          start_line: lineNumber,
          end_line: lineNumber,
          start_column: line.trimEnd().length + 1,
          end_column: line.length,
          annotation_level: 'notice',
          message: 'Trailing whitespace should be removed',
          title: 'Trailing Whitespace'
        });
      }

      // Rule 3: Multiple spaces around operators (Black uses single spaces)
      if (line.match(/\w\s{2,}[=+\-*/]\s*\w/) || line.match(/\w\s*[=+\-*/]\s{2,}\w/)) {
        annotations.push({
          path: filename,
          start_line: lineNumber,
          end_line: lineNumber,
          start_column: 1,
          end_column: line.length,
          annotation_level: 'notice',
          message: 'Use single spaces around operators',
          title: 'Operator Spacing'
        });
      }

      // Rule 4: Function definition spacing
      if (line.match(/^def\s+\w+\(\s*\w/) && !line.includes('(self') && !line.includes('()')) {
        if (!line.match(/^def\s+\w+\([^,\s)]+\)/) && line.includes(',') && !line.includes(', ')) {
          annotations.push({
            path: filename,
            start_line: lineNumber,
            end_line: lineNumber,
            start_column: 1,
            end_column: line.length,
            annotation_level: 'notice',
            message: 'Use spaces after commas in function parameters',
            title: 'Function Parameter Spacing'
          });
        }
      }

      // Rule 5: Import organization (basic check)
      if (line.startsWith('import ') || line.startsWith('from ')) {
        // Check for multiple imports on one line (except from imports)
        if (line.startsWith('import ') && line.includes(',')) {
          annotations.push({
            path: filename,
            start_line: lineNumber,
            end_line: lineNumber,
            start_column: 1,
            end_column: line.length,
            annotation_level: 'notice',
            message: 'Consider using separate import statements for each module',
            title: 'Import Style'
          });
        }
      }

      // Rule 6: Unnecessary parentheses in return statements
      if (trimmedLine.match(/^return\s*\([^,)]+\)$/)) {
        annotations.push({
          path: filename,
          start_line: lineNumber,
          end_line: lineNumber,
          start_column: 1,
          end_column: line.length,
          annotation_level: 'notice',
          message: 'Unnecessary parentheses in return statement',
          title: 'Return Statement Style'
        });
      }

      // Rule 7: String quote consistency (Black prefers double quotes)
      const singleQuoteMatches = line.match(/'/g);
      const doubleQuoteMatches = line.match(/"/g);
      
      if (singleQuoteMatches && singleQuoteMatches.length >= 2 && 
          (!doubleQuoteMatches || doubleQuoteMatches.length === 0)) {
        // Check if it's a simple string (not containing apostrophes)
        if (!line.includes('\'re') && !line.includes('\'t') && !line.includes('\'s') && !line.includes('\'ll')) {
          annotations.push({
            path: filename,
            start_line: lineNumber,
            end_line: lineNumber,
            start_column: 1,
            end_column: line.length,
            annotation_level: 'notice',
            message: 'Consider using double quotes for string literals (Black preference)',
            title: 'String Quote Style'
          });
        }
      }
    }

    return annotations;
  }
}

module.exports = CodeStyleChecker;