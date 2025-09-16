const BaseService = require('./base-service');

/**
 * Style Checker for QuantEcon lectures
 * Ensures lectures comply with the custom QE style guide
 */
class StyleChecker extends BaseService {
  constructor(githubApp) {
    super(githubApp, 'Style Checker');
  }

  /**
   * Check pull request for style compliance
   */
  async checkPullRequest(payload) {
    const { installation, repository, pull_request } = payload;
    
    try {
      this.log(`Starting style check for PR #${pull_request.number} in ${repository.full_name}`);
      
      const octokit = await this.getOctokit(installation.id);
      const checkRun = await this.createCheckRun(
        octokit,
        repository.owner.login,
        repository.name,
        pull_request.head.sha,
        'Lecture Style Guide Compliance'
      );

      // Get changed files
      const files = await this.getPullRequestFiles(
        octokit,
        repository.owner.login,
        repository.name,
        pull_request.number
      );

      // Filter for lecture files (common extensions: .md, .ipynb, .rst)
      const lectureFiles = files.filter(file => 
        /\.(md|ipynb|rst)$/i.test(file.filename) &&
        !file.filename.includes('README')
      );

      if (lectureFiles.length === 0) {
        await this.updateCheckRun(
          octokit,
          repository.owner.login,
          repository.name,
          checkRun.id,
          'neutral',
          'No lecture files found in this pull request.'
        );
        return;
      }

      const annotations = [];
      let hasIssues = false;

      // Check each lecture file
      for (const file of lectureFiles) {
        this.log(`Checking style for file: ${file.filename}`);
        
        const content = await this.getFileContent(
          octokit,
          repository.owner.login,
          repository.name,
          file.filename,
          pull_request.head.sha
        );

        if (content) {
          const fileAnnotations = await this.checkFileStyle(file.filename, content);
          annotations.push(...fileAnnotations);
          
          if (fileAnnotations.length > 0) {
            hasIssues = true;
          }
        }
      }

      const conclusion = hasIssues ? 'failure' : 'success';
      const summary = hasIssues 
        ? `Found ${annotations.length} style issues in ${lectureFiles.length} lecture files.`
        : `All ${lectureFiles.length} lecture files comply with the QuantEcon style guide.`;

      await this.updateCheckRun(
        octokit,
        repository.owner.login,
        repository.name,
        checkRun.id,
        conclusion,
        summary,
        annotations
      );

      this.log(`Style check completed for PR #${pull_request.number}: ${conclusion}`);
      
    } catch (error) {
      this.log(`Error during style check: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Check individual file for style compliance
   */
  async checkFileStyle(filename, content) {
    const annotations = [];
    const lines = content.split('\n');

    // Style rules for QuantEcon lectures
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Rule 1: Check for proper heading structure (should start with # for markdown)
      if (filename.endsWith('.md') && line.match(/^#{2,6}\s+/) && i === 0) {
        annotations.push({
          path: filename,
          start_line: lineNumber,
          end_line: lineNumber,
          start_column: 1,
          end_column: line.length,
          annotation_level: 'warning',
          message: 'Lecture should start with a single # heading for the title',
          title: 'Heading Structure'
        });
      }

      // Rule 2: Check for trailing whitespace
      if (line.endsWith(' ') || line.endsWith('\t')) {
        annotations.push({
          path: filename,
          start_line: lineNumber,
          end_line: lineNumber,
          start_column: line.trimEnd().length + 1,
          end_column: line.length,
          annotation_level: 'notice',
          message: 'Line has trailing whitespace',
          title: 'Trailing Whitespace'
        });
      }

      // Rule 3: Check for consistent code block formatting
      if (line.trim().startsWith('```') && !line.includes('python') && !line.includes('julia') && line.trim() !== '```') {
        annotations.push({
          path: filename,
          start_line: lineNumber,
          end_line: lineNumber,
          start_column: 1,
          end_column: line.length,
          annotation_level: 'warning',
          message: 'Code blocks should specify language (python, julia, etc.)',
          title: 'Code Block Language'
        });
      }

      // Rule 4: Check for proper equation formatting (LaTeX)
      if (line.includes('$') && !line.match(/\$[^$]+\$/) && !line.includes('$$')) {
        const dollarCount = (line.match(/\$/g) || []).length;
        if (dollarCount % 2 !== 0) {
          annotations.push({
            path: filename,
            start_line: lineNumber,
            end_line: lineNumber,
            start_column: 1,
            end_column: line.length,
            annotation_level: 'warning',
            message: 'Unmatched dollar signs in equation formatting',
            title: 'Equation Formatting'
          });
        }
      }
    }

    return annotations;
  }
}

module.exports = StyleChecker;