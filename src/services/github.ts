import axios from 'axios';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch?: string;
}

export interface GitHubFile {
  path: string;
  content: string;
  message: string;
}

export class GitHubService {
  private config: GitHubConfig | null = null;
  private baseUrl = 'https://api.github.com';

  setConfig(config: GitHubConfig): void {
    this.config = config;
  }

  private getHeaders(): Record<string, string> {
    if (!this.config?.token) {
      throw new Error('GitHub token not configured');
    }

    return {
      'Authorization': `token ${this.config.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'AI-ImageProc/0.1.0',
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/user`, {
        headers: this.getHeaders(),
      });
      return response.status === 200;
    } catch (error) {
      console.error('GitHub connection test failed:', error);
      return false;
    }
  }

  async getRepoInfo(): Promise<{ name: string; default_branch: string } | null> {
    try {
      if (!this.config) throw new Error('GitHub not configured');
      
      const response = await axios.get(
        `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}`,
        { headers: this.getHeaders() }
      );
      
      return {
        name: response.data.name,
        default_branch: response.data.default_branch,
      };
    } catch (error) {
      console.error('Failed to get repo info:', error);
      return null;
    }
  }

  async getFileSha(path: string): Promise<string | null> {
    try {
      if (!this.config) throw new Error('GitHub not configured');
      
      const response = await axios.get(
        `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`,
        {
          headers: this.getHeaders(),
          params: { ref: this.config.branch || 'main' },
        }
      );
      
      return response.data.sha;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // File doesn't exist yet
      }
      throw error;
    }
  }

  async pushFile(file: GitHubFile): Promise<boolean> {
    try {
      if (!this.config) throw new Error('GitHub not configured');
      
      const sha = await this.getFileSha(file.path);
      
      const response = await axios.put(
        `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${file.path}`,
        {
          message: file.message,
          content: file.content,
          ...(sha ? { sha } : {}),
          branch: this.config.branch || 'main',
        },
        { headers: this.getHeaders() }
      );
      
      return response.status === 201 || response.status === 200;
    } catch (error) {
      console.error('Failed to push file to GitHub:', error);
      return false;
    }
  }

  async pushProject(
    projectId: string,
    projectName: string,
    imageData: Buffer,
    metadata: any
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      if (!this.config) {
        return { success: false, error: 'GitHub not configured' };
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeProjectName = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      
      // Create file paths
      const imageFileName = `${safeProjectName}-${timestamp}.png`;
      const metadataFileName = `${safeProjectName}-${timestamp}.json`;
      const basePath = `projects/${safeProjectName}`;
      
      // Convert image to base64
      const imageBase64 = imageData.toString('base64');
      
      // Prepare metadata
      const metadataContent = JSON.stringify({
        projectId,
        projectName,
        timestamp,
        ...metadata,
      }, null, 2);
      
      // Push image
      const imagePushed = await this.pushFile({
        path: `${basePath}/${imageFileName}`,
        content: imageBase64,
        message: `Add project image: ${projectName}`,
      });
      
      if (!imagePushed) {
        return { success: false, error: 'Failed to push image' };
      }
      
      // Push metadata
      const metadataPushed = await this.pushFile({
        path: `${basePath}/${metadataFileName}`,
        content: Buffer.from(metadataContent).toString('base64'),
        message: `Add project metadata: ${projectName}`,
      });
      
      if (!metadataPushed) {
        return { success: false, error: 'Failed to push metadata' };
      }
      
      // Construct GitHub URL
      const url = `https://github.com/${this.config.owner}/${this.config.repo}/tree/${this.config.branch || 'main'}/${basePath}`;
      
      return { success: true, url };
    } catch (error: any) {
      console.error('GitHub export failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Unknown error' 
      };
    }
  }

  async createCommit(
    files: GitHubFile[],
    message: string
  ): Promise<{ success: boolean; sha?: string }> {
    try {
      if (!this.config) throw new Error('GitHub not configured');
      
      // Push files sequentially
      for (const file of files) {
        const success = await this.pushFile({
          ...file,
          message: `${message} - ${file.path}`,
        });
        
        if (!success) {
          return { success: false };
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to create commit:', error);
      return { success: false };
    }
  }
}

// Singleton instance
export const githubService = new GitHubService();
