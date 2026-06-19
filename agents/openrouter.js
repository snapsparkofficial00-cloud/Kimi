const axios = require('axios');

/**
 * OpenRouter Unified AI Agent for NeuroSwarm
 * 
 * One API key → 200+ models including:
 * - Google: gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-pro
 * - Zhipu: zai-org/glm-5.2
 * - Anthropic: claude-3.7-sonnet, claude-3.5-haiku
 * - OpenAI: gpt-4o, gpt-4o-mini, o3-mini
 * - Meta: llama-3.3-70b, llama-3.1-405b
 * - DeepSeek: deepseek-chat, deepseek-reasoner
 * - Mistral: mistral-large, pixtral-large
 * - Qwen: qwen-2.5-72b, qwen-2.5-coder-32b
 * 
 * Pricing: Pay per token. Free tier available.
 * Get key: https://openrouter.ai/keys
 * 
 * This agent routes each NeuroSwarm agent to the best model
 * based on the task type, all through one OpenRouter key.
 */

class OpenRouterAgent {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.OPENROUTER_API_KEY;
    this.baseUrl = 'https://openrouter.ai/api/v1';
    this.appName = config.appName || 'NeuroSwarm AI';
    this.appUrl = config.appUrl || 'https://neuroswarm.ai';

    // Model routing map — which OpenRouter model for each NeuroSwarm agent
    this.modelMap = {
      // Default fallback
      default: 'google/gemini-1.5-pro',

      // NeuroSwarm agent → OpenRouter model mapping
      commander:    'google/gemini-1.5-pro',      // Strategic planning
      researcher:   'google/gemini-1.5-pro',      // Deep research
      coder:        'zai-org/glm-5.2',            // Code fixing (GLM-5.2)
      creative:     'google/gemini-1.5-flash',      // Fast creative generation
      analyst:      'google/gemini-1.5-pro',        // Data analysis
      executor:     'google/gemini-1.5-flash',      // Task execution
      critic:       'anthropic/claude-3.7-sonnet',  // Quality review
      social:       'google/gemini-1.5-flash',      // Social posts
      email:        'google/gemini-1.5-flash',      // Email writing
      crypto:       'google/gemini-1.5-pro',        // Market analysis
      media:        'google/gemini-1.5-flash',      // Media prompts
      scraper:      'google/gemini-1.5-pro',        // Data extraction
      translator:   'google/gemini-1.5-pro',        // Translation
      security:     'anthropic/claude-3.7-sonnet',  // Security analysis
      glm52:        'zai-org/glm-5.2',            // Code engineering
    };

    // Override map from env if provided
    if (process.env.OR_MODEL_COMMANDER) this.modelMap.commander = process.env.OR_MODEL_COMMANDER;
    if (process.env.OR_MODEL_CODER) this.modelMap.coder = process.env.OR_MODEL_CODER;
    if (process.env.OR_MODEL_GLM52) this.modelMap.glm52 = process.env.OR_MODEL_GLM52;
    if (process.env.OR_MODEL_CRITIC) this.modelMap.critic = process.env.OR_MODEL_CRITIC;
    if (process.env.OR_MODEL_SECURITY) this.modelMap.security = process.env.OR_MODEL_SECURITY;
  }

  // ==================== CORE CHAT API ====================

  async chat(agentKey, messages, options = {}) {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'OPENROUTER_API_KEY not configured. Get one at https://openrouter.ai/keys',
        status: 401
      };
    }

    const model = this.modelMap[agentKey] || this.modelMap.default;

    const payload = {
      model: model,
      messages: messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 4096,
      stream: options.stream || false,
      ...(options.tools && { tools: options.tools }),
      ...(options.toolChoice && { tool_choice: options.toolChoice }),
      ...(options.reasoning && { reasoning: options.reasoning })
    };

    // Add provider routing preferences for GLM-5.2
    if (model.includes('glm-5.2')) {
      payload.provider = { order: ['Z.AI', 'DeepInfra', 'Fireworks'] };
    }

    try {
      const response = await axios.post(`${this.baseUrl}/chat/completions`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': this.appUrl,
          'X-Title': this.appName
        },
        timeout: options.timeout || 120000,
        responseType: options.stream ? 'stream' : 'json'
      });

      if (options.stream) {
        return { success: true, stream: response.data };
      }

      const choice = response.data.choices[0];
      return {
        success: true,
        content: choice.message.content,
        reasoning: choice.message.reasoning || null,
        usage: response.data.usage,
        model: response.data.model,
        provider: response.data.provider || 'openrouter',
        agentKey,
        routedModel: model
      };
    } catch (error) {
      const errMsg = error.response?.data?.error?.message 
        || error.response?.data?.message 
        || error.message;

      return {
        success: false,
        error: errMsg,
        status: error.response?.status,
        agentKey,
        routedModel: model
      };
    }
  }

  // ==================== QUICK METHODS ====================

  async complete(agentKey, systemPrompt, userPrompt, options = {}) {
    return this.chat(agentKey, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], options);
  }

  // ==================== STATUS & BILLING ====================

  async getStatus() {
    if (!this.apiKey) {
      return {
        connected: false,
        message: 'OPENROUTER_API_KEY not set. Get one at https://openrouter.ai/keys',
        modelMap: this.modelMap
      };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/auth/key`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: 10000
      });

      return {
        connected: true,
        label: response.data.data?.label || 'OpenRouter Key',
        usage: response.data.data?.usage || 0,
        limit: response.data.data?.limit || null,
        isPro: response.data.data?.is_pro || false,
        modelMap: this.modelMap,
        message: 'Connected to OpenRouter'
      };
    } catch (error) {
      return {
        connected: false,
        error: error.response?.data?.error?.message || error.message,
        modelMap: this.modelMap
      };
    }
  }

  async getAvailableModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: 15000
      });
      return {
        success: true,
        models: response.data.data.map(m => ({
          id: m.id,
          name: m.name,
          pricing: m.pricing,
          context_length: m.context_length
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== GITHUB INTEGRATION (via GLM-5.2) ====================

  async fixFile(filePath, issueDescription, githubConfig) {
    if (!githubConfig?.token) {
      return { success: false, error: 'GITHUB_TOKEN not configured' };
    }

    const { token, owner, repo } = githubConfig;

    try {
      // 1. Fetch file from GitHub
      const fileRes = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
        { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } }
      );
      const content = Buffer.from(fileRes.data.content, 'base64').toString('utf8');
      const sha = fileRes.data.sha;

      // 2. Analyze with GLM-5.2 via OpenRouter
      const analysis = await this.chat('glm52', [
        { role: 'system', content: `You are an expert code reviewer. Analyze code for bugs, security issues, and performance problems. Respond in JSON with issues array.` },
        { role: 'user', content: `File: ${filePath}\n\n${issueDescription ? 'Issue: ' + issueDescription + '\n\n' : ''}Code:\n\`\`\`\n${content}\n\`\`\`` }
      ], { temperature: 0.3, maxTokens: 4096 });

      if (!analysis.success) return analysis;

      // 3. Generate fix
      const fix = await this.chat('glm52', [
        { role: 'system', content: `Fix ALL issues in the code. Return ONLY the complete fixed code in a code block, then an explanation.` },
        { role: 'user', content: `Issues found:\n${analysis.content}\n\nOriginal code:\n\`\`\`\n${content}\n\`\`\`` }
      ], { temperature: 0.2, maxTokens: 8192 });

      if (!fix.success) return fix;

      const codeMatch = fix.content.match(/```[\w]*\n([\s\S]*?)```/);
      const fixedCode = codeMatch ? codeMatch[1].trim() : fix.content;

      // 4. Create PR
      const branchName = `neuroswarm-fix-${Date.now()}`;
      const repoInfo = await axios.get(`https://api.github.com/repos/${owner}/${repo}`,
        { headers: { 'Authorization': `token ${token}` } });
      const defaultBranch = repoInfo.data.default_branch;

      const baseRef = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`,
        { headers: { 'Authorization': `token ${token}` } });

      await axios.post(
        `https://api.github.com/repos/${owner}/${repo}/git/refs`,
        { ref: `refs/heads/${branchName}`, sha: baseRef.data.object.sha },
        { headers: { 'Authorization': `token ${token}` } });

      await axios.put(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
        {
          message: `fix(${filePath}): auto-fix via NeuroSwarm + OpenRouter`,
          content: Buffer.from(fixedCode).toString('base64'),
          sha: sha,
          branch: branchName
        },
        { headers: { 'Authorization': `token ${token}` } });

      const pr = await axios.post(
        `https://api.github.com/repos/${owner}/${repo}/pulls`,
        {
          title: `🔧 Auto-fix: ${filePath}`,
          body: `## NeuroSwarm AI Automated Fix\n\n**File:** \`${filePath}\`\n\n**Analysis:**\n${analysis.content}\n\n---\n*Powered by OpenRouter + GLM-5.2*`,
          head: branchName,
          base: defaultBranch
        },
        { headers: { 'Authorization': `token ${token}` } });

      return {
        success: true,
        filePath,
        analysis: analysis.content,
        fixedCode,
        pullRequestUrl: pr.data.html_url,
        pullRequestNumber: pr.data.number,
        branch: branchName
      };

    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  // ==================== UTILITIES ====================

  getModelForAgent(agentKey) {
    return this.modelMap[agentKey] || this.modelMap.default;
  }

  setModelForAgent(agentKey, modelId) {
    this.modelMap[agentKey] = modelId;
  }
}

module.exports = OpenRouterAgent;
