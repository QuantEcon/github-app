const BaseService = require('./base-service');

/**
 * Spell Checker service
 * Ensures correct spelling in documentation and lecture files
 */
class SpellChecker extends BaseService {
  constructor(githubApp) {
    super(githubApp, 'Spell Checker');
    
    // Common technical terms and proper nouns that should be ignored
    this.technicalTerms = new Set([
      'quantecon', 'python', 'julia', 'numpy', 'scipy', 'matplotlib',
      'jupyter', 'github', 'git', 'api', 'json', 'xml', 'html', 'css',
      'javascript', 'typescript', 'nodejs', 'npm', 'yaml', 'dockerfile',
      'kubernetes', 'autoregressive', 'markov', 'bayesian', 'econometrics',
      'macroeconomics', 'microeconomics', 'stochastic', 'heteroskedasticity',
      'autocorrelation', 'heterogeneity', 'endogeneity', 'equilibrium'
    ]);
    
    // Common misspellings and their corrections
    this.commonMisspellings = new Map([
      ['recieve', 'receive'],
      ['occured', 'occurred'],
      ['seperate', 'separate'],
      ['definate', 'definite'],
      ['necesary', 'necessary'],
      ['accomodate', 'accommodate'],
      ['beleive', 'believe'],
      ['existance', 'existence'],
      ['independant', 'independent'],
      ['recomend', 'recommend']
    ]);
  }

  /**
   * Check pull request for spelling errors
   */
  async checkPullRequest(payload) {
    const { installation, repository, pull_request } = payload;
    
    try {
      this.log(`Starting spell check for PR #${pull_request.number} in ${repository.full_name}`);
      
      const octokit = await this.getOctokit(installation.id);
      const checkRun = await this.createCheckRun(
        octokit,
        repository.owner.login,
        repository.name,
        pull_request.head.sha,
        'Spelling Check'
      );

      // Get changed files
      const files = await this.getPullRequestFiles(
        octokit,
        repository.owner.login,
        repository.name,
        pull_request.number
      );

      // Filter for text files that should be spell-checked
      const textFiles = files.filter(file => 
        /\.(md|rst|txt)$/i.test(file.filename) ||
        (file.filename.includes('README') && !file.filename.includes('.py'))
      );

      if (textFiles.length === 0) {
        await this.updateCheckRun(
          octokit,
          repository.owner.login,
          repository.name,
          checkRun.id,
          'neutral',
          'No text files found to spell check in this pull request.'
        );
        return;
      }

      const annotations = [];
      let totalErrors = 0;

      // Check each text file
      for (const file of textFiles) {
        this.log(`Spell checking file: ${file.filename}`);
        
        const content = await this.getFileContent(
          octokit,
          repository.owner.login,
          repository.name,
          file.filename,
          pull_request.head.sha
        );

        if (content) {
          const fileAnnotations = await this.checkFileSpelling(file.filename, content);
          annotations.push(...fileAnnotations);
          totalErrors += fileAnnotations.length;
        }
      }

      const conclusion = totalErrors > 0 ? 'failure' : 'success';
      const summary = totalErrors > 0 
        ? `Found ${totalErrors} potential spelling errors in ${textFiles.length} text files.`
        : `No spelling errors found in ${textFiles.length} text files.`;

      await this.updateCheckRun(
        octokit,
        repository.owner.login,
        repository.name,
        checkRun.id,
        conclusion,
        summary,
        annotations
      );

      this.log(`Spell check completed for PR #${pull_request.number}: ${conclusion}`);
      
    } catch (error) {
      this.log(`Error during spell check: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Check individual file for spelling errors
   */
  async checkFileSpelling(filename, content) {
    const annotations = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Skip code blocks and technical sections
      if (this.shouldSkipLine(line)) {
        continue;
      }

      // Extract words from the line
      const words = this.extractWords(line);
      
      for (const { word, startPos } of words) {
        const lowerWord = word.toLowerCase();
        
        // Check against common misspellings
        if (this.commonMisspellings.has(lowerWord)) {
          const correction = this.commonMisspellings.get(lowerWord);
          annotations.push({
            path: filename,
            start_line: lineNumber,
            end_line: lineNumber,
            start_column: startPos + 1,
            end_column: startPos + word.length + 1,
            annotation_level: 'warning',
            message: `Possible misspelling: "${word}" → "${correction}"`,
            title: 'Spelling Error'
          });
        }
        
        // Additional basic spell checking logic could be added here
        // For production use, you might want to integrate with a proper spell-checking library
      }
    }

    return annotations;
  }

  /**
   * Determine if a line should be skipped during spell checking
   */
  shouldSkipLine(line) {
    const trimmedLine = line.trim();
    
    // Skip code blocks
    if (trimmedLine.startsWith('```') || 
        trimmedLine.startsWith('    ') || // Indented code
        trimmedLine.startsWith('\t')) {
      return true;
    }
    
    // Skip URLs
    if (trimmedLine.includes('http://') || trimmedLine.includes('https://')) {
      return true;
    }
    
    // Skip inline code
    if (trimmedLine.includes('`') && trimmedLine.match(/`[^`]+`/)) {
      return true;
    }
    
    return false;
  }

  /**
   * Extract words from a line for spell checking
   */
  extractWords(line) {
    const words = [];
    const wordRegex = /\b[a-zA-Z][a-zA-Z']*\b/g;
    let match;
    
    while ((match = wordRegex.exec(line)) !== null) {
      const word = match[0];
      const startPos = match.index;
      
      // Skip technical terms and short words
      if (word.length > 2 && !this.technicalTerms.has(word.toLowerCase())) {
        words.push({ word, startPos });
      }
    }
    
    return words;
  }
}

module.exports = SpellChecker;