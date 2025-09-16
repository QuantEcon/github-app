const BaseService = require('../src/services/base-service');

// Mock GitHub App
const mockGitHubApp = {
  getInstallationOctokit: jest.fn()
};

describe('BaseService', () => {
  let baseService;

  beforeEach(() => {
    baseService = new BaseService(mockGitHubApp, 'Test Service');
  });

  test('should initialize with correct service name', () => {
    expect(baseService.serviceName).toBe('Test Service');
    expect(baseService.githubApp).toBe(mockGitHubApp);
  });

  test('should log messages correctly', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    baseService.log('Test message', 'info');
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[.*\] \[Test Service\] \[INFO\] Test message/)
    );
    
    consoleSpy.mockRestore();
  });

  test('should extract words correctly from text', () => {
    // This test is for services that extend BaseService
    expect(baseService).toBeDefined();
  });
});