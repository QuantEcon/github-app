/**
 * Base class for all QuantEcon checker services
 */
class BaseService {
  constructor(githubApp, serviceName) {
    this.githubApp = githubApp;
    this.serviceName = serviceName;
  }

  /**
   * Get authenticated Octokit instance for the installation
   * Note: This is a placeholder for when GitHub App authentication is fully configured
   */
  async getOctokit(installationId) {
    // For now, return a mock object since we don't have full GitHub App setup
    // In production, this would return an authenticated Octokit instance
    console.log(`Getting Octokit for installation: ${installationId}`);
    return null;
  }

  /**
   * Create a check run for this service
   */
  async createCheckRun(octokit, owner, repo, head_sha, name) {
    const { data } = await octokit.rest.checks.create({
      owner,
      repo,
      name: `${this.serviceName}: ${name}`,
      head_sha,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    });
    return data;
  }

  /**
   * Update a check run with results
   */
  async updateCheckRun(octokit, owner, repo, check_run_id, conclusion, summary, annotations = []) {
    await octokit.rest.checks.update({
      owner,
      repo,
      check_run_id,
      status: 'completed',
      conclusion,
      completed_at: new Date().toISOString(),
      output: {
        title: `${this.serviceName} Results`,
        summary,
        annotations: annotations.slice(0, 50), // GitHub API limit
      },
    });
  }

  /**
   * Get files changed in a pull request
   */
  async getPullRequestFiles(octokit, owner, repo, pull_number) {
    const { data } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number,
    });
    return data;
  }

  /**
   * Get file content from the repository
   */
  async getFileContent(octokit, owner, repo, path, ref) {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });
      
      if (data.type === 'file') {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      return null;
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Log service activity
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.serviceName}] [${level.toUpperCase()}] ${message}`);
  }
}

module.exports = BaseService;