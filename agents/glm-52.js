const axios = require('axios');

/**
 * GLM-5.2 Agent for NeuroSwarm AI
 * 
 * GLM-5.2 is Zhipu AI's latest coding & agentic model (June 2026):
 * - 1 million token context window
 * - Built-in reasoning modes (High / Max)
 * - Native tool calling & function execution
 * - 77.8% SWE-bench Verified score
 * - MIT open-source license
 * 
 * API Providers:
 * - Z.AI (Zhipu official): https://api.z.ai/v1
 * - OpenRouter: https://openrouter.ai/api/v1
 * - Cloudflare Workers AI: @cf/zai-org/glm-5.2
 * - AI/ML API: https://api.aimlapi.com/v1
 * 
 * Pricing: ~$1.40/M input, $4.40/M output tokens
 */

class GLM52Agent {
  constructor(config = {}) {
    // Support multiple providers
    this.provider = config.provider || 'zai'; // zai, openrouter, aimlapi, cloudflare
    this.apiKey = config.apiKey || process.env.GLM52_API_KEY || process.env.ZAI_API_KEY;
    this.baseUrl = this.getBaseUrl();
    this.model = this.getModelId();

    // Reasoning mode: 'high' (default) or 'max' (complex tasks)
    this.reasoningMode = config.reasoningMode || 'high';

    // GitHub integration
    this.githubToken = config.githubToken || process.env.GITHUB_TOKEN;
    this.githubOwner = config.githubOwner || process.env.GITHUB_OWNER;
    this.githubRepo = config.githubRepo || process.env.GITHUB_REPO;

    // Workspace for file operations
    this.workspacePath = config.workspacePath || './workspace/glm52';

    // Task tracking
    this.activeTasks = new Map();
    this.taskHistory = [];
  }

  getBaseUrl() {
    const urls = {
      zai: 'https://api.z.ai/v1',
      openrouter: 'https://openrouter.ai/api/v1',
      aimlapi: 'https://api.aimlapi.com/v1',
      cloudflare: `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/@cf/zai-org/glm-5.2`
    };
    return this.baseUrl || urls[this.provider] || urls.zai;
  }

  getModelId() {
    const models = {
      zai: 'glm-5.2',
      openrouter: 'zai-org/glm-5.2',
      aimlapi: 'glm-5.2',
      cloudflare: '@cf/zai-org/glm-5.2'
    };
    return this.model || models[this.provider] || 'glm-5.2';
  }

  // ==================== CORE GLM-5.2 API ====================

  async chat(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('GLM-5.2 API key not configured. Set GLM52_API_KEY or ZAI_API_KEY in .env');
    }

    const payload = {
      model: this.model,
      messages: messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 4096,
      stream: options.stream || false,
      ...(options.tools && { tools: options.tools }),
      ...(options.toolChoice && { tool_choice: options.toolChoice })
    };

    // Add reasoning mode for complex tasks
    if (this.reasoningMode === 'max' || options.complexTask) {
      payload.extra_body = { chat_template_kwargs: { enable_thinking: true, thinking_mode: 'max' } };
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    // OpenRouter specific headers
    if (this.provider === 'openrouter') {
      headers['HTTP-Referer'] = options.referer || 'https://neuroswarm.ai';
      headers['X-Title'] = 'NeuroSwarm AI';
    }

    try {
      const response = await axios.post(`${this.baseUrl}/chat/completions`, payload, {
        headers,
        timeout: options.timeout || 120000,
        responseType: options.stream ? 'stream' : 'json'
      });

      if (options.stream) {
        return response.data; // Return stream for handling
      }

      return {
        success: true,
        content: response.data.choices[0].message.content,
        reasoning: response.data.choices[0].message.reasoning_content || null,
        usage: response.data.usage,
        model: response.data.model
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.response?.data?.message || error.message,
        status: error.response?.status
      };
    }
  }

  // ==================== GITHUB INTEGRATION ====================

  async fixFile(filePath, issueDescription = null) {
    if (!this.githubToken) {
      return { success: false, error: 'GitHub token not configured. Set GITHUB_TOKEN in .env' };
    }

    try {
      // 1. Fetch file content from GitHub
      const fileContent = await this.fetchGithubFile(filePath);
      if (!fileContent.success) return fileContent;

      // 2. Analyze with GLM-5.2
      const analysis = await this.analyzeCode(fileContent.content, filePath, issueDescription);
      if (!analysis.success) return analysis;

      // 3. Generate fix
      const fix = await this.generateFix(fileContent.content, analysis.issues, filePath);
      if (!fix.success) return fix;

      // 4. Apply fix (create branch + PR)
      const prResult = await this.createFixPR(filePath, fix.fixedCode, analysis.issues);

      return {
        success: true,
        filePath,
        issues: analysis.issues,
        fix: fix.explanation,
        pullRequest: prResult,
        originalContent: fileContent.content,
        fixedContent: fix.fixedCode
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async fetchGithubFile(filePath) {
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${this.githubOwner}/${this.githubRepo}/contents/${filePath}`,
        {
          headers: { 
            'Authorization': `token ${this.githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          timeout: 15000
        }
      );

      const content = Buffer.from(response.data.content, 'base64').toString('utf8');
      return {
        success: true,
        content,
        sha: response.data.sha,
        url: response.data.html_url
      };
    } catch (error) {
      return { success: false, error: `Failed to fetch file: ${error.message}` };
    }
  }

  async analyzeCode(code, filePath, issueDescription = null) {
    const ext = filePath.split('.').pop();
    const langMap = {
      js: 'JavaScript', ts: 'TypeScript', py: 'Python', java: 'Java',
      go: 'Go', rs: 'Rust', cpp: 'C++', c: 'C', cs: 'C#',
      rb: 'Ruby', php: 'PHP', swift: 'Swift', kt: 'Kotlin'
    };
    const language = langMap[ext] || ext;

    const messages = [
      {
        role: 'system',
        content: `You are an expert code reviewer and debugger. Analyze the provided ${language} code for:
1. Bugs and logical errors
2. Security vulnerabilities (SQL injection, XSS, buffer overflow, etc.)
3. Performance issues
4. Code smells and anti-patterns
5. Type errors (if applicable)
6. Memory leaks
7. Race conditions
8. Error handling gaps

Respond in JSON format with:
{
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "line": number,
      "type": "bug|security|performance|style",
      "description": "Detailed explanation",
      "fix": "Suggested fix code snippet"
    }
  ],
  "summary": "Overall assessment"
}`
      },
      {
        role: 'user',
        content: issueDescription 
          ? `File: ${filePath}\n\nKnown issue: ${issueDescription}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\``
          : `File: ${filePath}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\``
      }
    ];

    const result = await this.chat(messages, { temperature: 0.3, maxTokens: 4096 });

    if (!result.success) return result;

    try {
      // Extract JSON from response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { issues: [], summary: result.content };
      return { success: true, issues: parsed.issues || [], summary: parsed.summary };
    } catch (e) {
      return { success: true, issues: [], summary: result.content, parseError: true };
    }
  }

  async generateFix(originalCode, issues, filePath) {
    const ext = filePath.split('.').pop();
    const langMap = { js: 'JavaScript', ts: 'TypeScript', py: 'Python', java: 'Java', go: 'Go', rs: 'Rust' };
    const language = langMap[ext] || ext;

    const messages = [
      {
        role: 'system',
        content: `You are an expert ${language} developer. Fix ALL the issues in the provided code.
Return ONLY the complete fixed code in a code block, followed by a brief explanation of changes.

Format:
\`\`\`${language}
[fixed code]
\`\`\`

Explanation: [brief summary]`
      },
      {
        role: 'user',
        content: `File: ${filePath}\n\nIssues to fix:\n${JSON.stringify(issues, null, 2)}\n\nOriginal code:\n\`\`\`${language}\n${originalCode}\n\`\`\``
      }
    ];

    const result = await this.chat(messages, { temperature: 0.2, maxTokens: 8192, complexTask: true });

    if (!result.success) return result;

    // Extract code block
    const codeMatch = result.content.match(/```[\w]*\n([\s\S]*?)```/);
    const fixedCode = codeMatch ? codeMatch[1].trim() : result.content;

    const explanationMatch = result.content.match(/Explanation:([\s\S]*)/);
    const explanation = explanationMatch ? explanationMatch[1].trim() : 'Code fixed automatically';

    return { success: true, fixedCode, explanation };
  }

  async createFixPR(filePath, fixedCode, issues) {
    const branchName = `glm52-fix-${Date.now()}`;
    const commitMsg = `fix(${filePath}): auto-fix ${issues.length} issue(s) via GLM-5.2\n\n- ${issues.map(i => i.description).join('\n- ')}`;

    try {
      // 1. Get default branch SHA
      const repoInfo = await axios.get(
        `https://api.github.com/repos/${this.githubOwner}/${this.githubRepo}`,
        { headers: { 'Authorization': `token ${this.githubToken}` } }
      );
      const defaultBranch = repoInfo.data.default_branch;

      // 2. Get base tree
      const baseRef = await axios.get(
        `https://api.github.com/repos/${this.githubOwner}/${this.githubRepo}/git/refs/heads/${defaultBranch}`,
        { headers: { 'Authorization': `token ${this.githubToken}` } }
      );
      const baseSha = baseRef.data.object.sha;

      // 3. Create branch
      await axios.post(
        `https://api.github.com/repos/${this.githubOwner}/${this.githubRepo}/git/refs`,
        { ref: `refs/heads/${branchName}`, sha: baseSha },
        { headers: { 'Authorization': `token ${this.githubToken}` } }
      );

      // 4. Get current file SHA
      const currentFile = await axios.get(
        `https://api.github.com/repos/${this.githubOwner}/${this.githubRepo}/contents/${filePath}?ref=${branchName}`,
        { headers: { 'Authorization': `token ${this.githubToken}` } }
      );

      // 5. Update file
      await axios.put(
        `https://api.github.com/repos/${this.githubOwner}/${this.githubRepo}/contents/${filePath}`,
        {
          message: commitMsg,
          content: Buffer.from(fixedCode).toString('base64'),
          sha: currentFile.data.sha,
          branch: branchName
        },
        { headers: { 'Authorization': `token ${this.githubToken}` } }
      );

      // 6. Create PR
      const pr = await axios.post(
        `https://api.github.com/repos/${this.githubOwner}/${this.githubRepo}/pulls`,
        {
          title: `🔧 Auto-fix: ${filePath}`,
          body: `## GLM-5.2 Automated Fix\n\n**File:** \`${filePath}\`\n\n**Issues Found:** ${issues.length}\n\n${issues.map(i => `- **${i.severity.toUpperCase()}** (Line ${i.line}): ${i.description}`).join('\n')}\n\n---\n*Generated by NeuroSwarm AI + GLM-5.2*`,
          head: branchName,
          base: defaultBranch
        },
        { headers: { 'Authorization': `token ${this.githubToken}` } }
      );

      return {
        success: true,
        branch: branchName,
        pullRequestUrl: pr.data.html_url,
        pullRequestNumber: pr.data.number
      };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  // ==================== BUG FIXING WORKFLOWS ====================

  async fixBugFromError(errorLog, filePath = null) {
    const messages = [
      {
        role: 'system',
        content: `You are an expert debugger. Given an error log, identify the root cause and provide a fix.
If a file path is provided, analyze that file. Otherwise, suggest which files to check.

Respond in JSON:
{
  "rootCause": "explanation",
  "affectedFiles": ["file1", "file2"],
  "fix": "code or instructions",
  "prevention": "how to avoid this in future"
}`
      },
      {
        role: 'user',
        content: filePath 
          ? `Error:\n\`\`\`\n${errorLog}\n\`\`\`\n\nFile: ${filePath}`
          : `Error:\n\`\`\`\n${errorLog}\n\`\`\``
      }
    ];

    const result = await this.chat(messages, { temperature: 0.3, maxTokens: 4096 });

    if (!result.success) return result;

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { rootCause: result.content };
      return { success: true, ...parsed };
    } catch (e) {
      return { success: true, rootCause: result.content, raw: result.content };
    }
  }

  async scanRepositoryForBugs(paths = ['.']) {
    // This would integrate with the scraper/file-manager to scan local files
    // For now, returns a structured workflow
    return {
      success: true,
      workflow: [
        'Scan repository for all source files',
        'Analyze each file with GLM-5.2 for bugs/security issues',
        'Generate fixes for critical/high severity issues',
        'Create PRs for each fix group',
        'Report summary'
      ],
      message: 'Use /api/glm52/scan endpoint with file paths to execute'
    };
  }

  // ==================== REPOSITORY ANALYSIS ====================

  async analyzeRepository(repoUrl = null) {
    const targetRepo = repoUrl || `${this.githubOwner}/${this.githubRepo}`;

    try {
      // Fetch repo structure
      const response = await axios.get(
        `https://api.github.com/repos/${targetRepo}/git/trees/main?recursive=1`,
        {
          headers: this.githubToken ? { 'Authorization': `token ${this.githubToken}` } : {},
          timeout: 15000
        }
      );

      const files = response.data.tree
        .filter(item => item.type === 'blob')
        .map(item => item.path);

      const codeFiles = files.filter(f => /\.(js|ts|py|java|go|rs|cpp|c|cs|rb|php|swift|kt)$/.test(f));

      return {
        success: true,
        totalFiles: files.length,
        codeFiles: codeFiles.length,
        files: codeFiles.slice(0, 50),
        message: `Found ${codeFiles.length} code files. Use /api/glm52/fix-file to fix individual files.`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== UTILITIES ====================

  async testConnection() {
    const result = await this.chat([
      { role: 'user', content: 'Say "GLM-5.2 connected to NeuroSwarm" and nothing else.' }
    ], { maxTokens: 50 });

    return {
      connected: result.success,
      model: this.model,
      provider: this.provider,
      reasoningMode: this.reasoningMode,
      response: result.success ? result.content : null,
      error: result.success ? null : result.error
    };
  }

  getStatus() {
    return {
      provider: this.provider,
      model: this.model,
      baseUrl: this.baseUrl,
      apiKeyConfigured: !!this.apiKey,
      githubConfigured: !!this.githubToken,
      githubRepo: this.githubRepo ? `${this.githubOwner}/${this.githubRepo}` : null,
      reasoningMode: this.reasoningMode,
      activeTasks: this.activeTasks.size
    };
  }
}

module.exports = GLM52Agent;
