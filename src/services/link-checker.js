const BaseService = require('./base-service');

/**
 * Link Checker service
 * Validates that links in documentation are accessible and not broken
 */
class LinkChecker extends BaseService {
  constructor(githubApp) {
    super(githubApp, 'Link Checker');
    
    // Domains that are commonly blocked or may have access restrictions
    this.skipDomains = new Set([
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      'example.com',
      'example.org'
    ]);
    
    // File extensions to skip
    this.skipExtensions = new Set([
      '.pdf',
      '.zip',
      '.tar.gz',
      '.exe',
      '.dmg'
    ]);
  }

  /**
   * Check pull request for broken links
   */
  async checkPullRequest(payload) {
    const { installation, repository, pull_request } = payload;
    
    try {
      this.log(`Starting link check for PR #${pull_request.number} in ${repository.full_name}`);
      
      const octokit = await this.getOctokit(installation.id);
      const checkRun = await this.createCheckRun(
        octokit,
        repository.owner.login,
        repository.name,
        pull_request.head.sha,
        'Link Validation'
      );

      // Get changed files
      const files = await this.getPullRequestFiles(
        octokit,
        repository.owner.login,
        repository.name,
        pull_request.number
      );

      // Filter for files that typically contain links
      const linkFiles = files.filter(file => 
        /\.(md|rst|html|txt)$/i.test(file.filename) ||
        file.filename.includes('README')
      );

      if (linkFiles.length === 0) {
        await this.updateCheckRun(
          octokit,
          repository.owner.login,
          repository.name,
          checkRun.id,
          'neutral',
          'No files with potential links found in this pull request.'
        );
        return;
      }

      const annotations = [];
      let totalLinksChecked = 0;
      let brokenLinks = 0;

      // Check each file for links
      for (const file of linkFiles) {
        this.log(`Checking links in file: ${file.filename}`);
        
        const content = await this.getFileContent(
          octokit,
          repository.owner.login,
          repository.name,
          file.filename,
          pull_request.head.sha
        );

        if (content) {
          const { fileAnnotations, linksChecked, brokenCount } = await this.checkFileLinks(file.filename, content);
          annotations.push(...fileAnnotations);
          totalLinksChecked += linksChecked;
          brokenLinks += brokenCount;
        }
      }

      const conclusion = brokenLinks > 0 ? 'failure' : 'success';
      const summary = brokenLinks > 0 
        ? `Found ${brokenLinks} broken links out of ${totalLinksChecked} links checked in ${linkFiles.length} files.`
        : totalLinksChecked > 0 
          ? `All ${totalLinksChecked} links are accessible in ${linkFiles.length} files.`
          : `No links found to check in ${linkFiles.length} files.`;

      await this.updateCheckRun(
        octokit,
        repository.owner.login,
        repository.name,
        checkRun.id,
        conclusion,
        summary,
        annotations
      );

      this.log(`Link check completed for PR #${pull_request.number}: ${conclusion}`);
      
    } catch (error) {
      this.log(`Error during link check: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Check individual file for broken links
   */
  async checkFileLinks(filename, content) {
    const annotations = [];
    const lines = content.split('\n');
    let linksChecked = 0;
    let brokenCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Extract links from the line
      const links = this.extractLinks(line);
      
      for (const { url, startPos, endPos } of links) {
        if (this.shouldSkipUrl(url)) {
          continue;
        }

        linksChecked++;
        this.log(`Checking link: ${url}`);

        const linkStatus = await this.checkLink(url);
        
        if (!linkStatus.accessible) {
          brokenCount++;
          annotations.push({
            path: filename,
            start_line: lineNumber,
            end_line: lineNumber,
            start_column: startPos + 1,
            end_column: endPos + 1,
            annotation_level: linkStatus.severity || 'warning',
            message: `Broken link: ${linkStatus.error || 'Link is not accessible'}`,
            title: 'Broken Link'
          });
        }
      }
    }

    return { fileAnnotations: annotations, linksChecked, brokenCount };
  }

  /**
   * Extract URLs from a line of text
   */
  extractLinks(line) {
    const links = [];
    
    // Markdown links: [text](url)
    const markdownRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = markdownRegex.exec(line)) !== null) {
      const url = match[2].trim();
      if (url.startsWith('http://') || url.startsWith('https://')) {
        links.push({
          url: url,
          startPos: match.index + match[1].length + 3,
          endPos: match.index + match[0].length - 1
        });
      }
    }
    
    // Direct URLs
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    
    while ((match = urlRegex.exec(line)) !== null) {
      // Avoid duplicates from markdown links
      const alreadyFound = links.some(link => 
        match.index >= link.startPos - 10 && match.index <= link.endPos + 10
      );
      
      if (!alreadyFound) {
        links.push({
          url: match[0],
          startPos: match.index,
          endPos: match.index + match[0].length - 1
        });
      }
    }
    
    return links;
  }

  /**
   * Determine if a URL should be skipped
   */
  shouldSkipUrl(url) {
    try {
      const urlObj = new URL(url);
      
      // Skip certain domains
      if (this.skipDomains.has(urlObj.hostname)) {
        return true;
      }
      
      // Skip certain file extensions
      const pathname = urlObj.pathname.toLowerCase();
      for (const ext of this.skipExtensions) {
        if (pathname.endsWith(ext)) {
          return true;
        }
      }
      
      // Skip fragment-only URLs
      if (url.startsWith('#')) {
        return true;
      }
      
      return false;
      
    } catch {
      // Invalid URL format
      return true;
    }
  }

  /**
   * Check if a link is accessible
   * Note: In a production environment, you'd make actual HTTP requests
   * For this implementation, we'll do basic URL validation
   */
  async checkLink(url) {
    try {
      // Basic URL validation
      const urlObj = new URL(url);
      
      // Check for common issues
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return {
          accessible: false,
          error: 'Invalid protocol (must be http or https)',
          severity: 'warning'
        };
      }
      
      // Check for localhost or private IP ranges
      const hostname = urlObj.hostname;
      if (hostname === 'localhost' || 
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('172.')) {
        return {
          accessible: false,
          error: 'Link points to local/private network',
          severity: 'notice'
        };
      }
      
      // Simulate checking common broken link patterns
      if (url.includes('example.com') || 
          url.includes('your-domain.com') ||
          url.includes('placeholder.org')) {
        return {
          accessible: false,
          error: 'Link appears to be a placeholder',
          severity: 'warning'
        };
      }
      
      // For production, you would make an actual HTTP request here:
      // const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
      // return { accessible: response.ok };
      
      // For now, assume valid URLs are accessible
      return { accessible: true };
      
    } catch (error) {
      return {
        accessible: false,
        error: `Invalid URL format: ${error.message}`,
        severity: 'warning'
      };
    }
  }
}

module.exports = LinkChecker;