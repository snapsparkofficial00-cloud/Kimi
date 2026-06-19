const axios = require('axios');

/**
 * Model Switcher for NeuroSwarm AI
 * 
 * Provides FREE and PAID tier options across multiple providers.
 * Users can switch models via API or dashboard.
 * 
 * FREE TIER (no credit card, just sign up):
 * - OpenRouter free models (rate limited)
 * - Google AI Studio (Gemini 1.5 Flash - free tier)
 * - Cloudflare Workers AI (free tier)
 * - Groq (free tier, very fast)
 * - Ollama (local, completely free)
 * 
 * PAID TIER (better quality, higher limits):
 * - OpenRouter paid models
 * - Anthropic Claude
 * - OpenAI GPT-4
 * - Zhipu GLM-5.2
 * 
 * AUTO mode: Uses free tier by default, upgrades to paid for complex tasks
 */

class ModelSwitcher {
  constructor(config = {}) {
    this.currentProvider = config.provider || process.env.AI_PROVIDER || 'openrouter-free';
    this.currentModel = config.model || process.env.AI_MODEL || null;

    // Provider configurations
    this.providers = {
      // ═══════ FREE TIER ═══════
      'openrouter-free': {
        name: 'OpenRouter (Free)',
        tier: 'free',
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKeyEnv: 'OPENROUTER_API_KEY',
        models: {
          default: 'google/gemini-2.0-flash-exp:free',
          commander: 'google/gemini-2.0-flash-exp:free',
          researcher: 'google/gemini-2.0-flash-exp:free',
          coder: 'qwen/qwen-2.5-coder-32b-instruct:free',
          creative: 'google/gemini-2.0-flash-exp:free',
          analyst: 'google/gemini-2.0-flash-exp:free',
          executor: 'google/gemini-2.0-flash-exp:free',
          critic: 'meta-llama/llama-3.3-70b-instruct:free',
          social: 'google/gemini-2.0-flash-exp:free',
          email: 'google/gemini-2.0-flash-exp:free',
          crypto: 'google/gemini-2.0-flash-exp:free',
          media: 'google/gemini-2.0-flash-exp:free',
          scraper: 'google/gemini-2.0-flash-exp:free',
          translator: 'google/gemini-2.0-flash-exp:free',
          security: 'meta-llama/llama-3.3-70b-instruct:free',
          glm52: 'qwen/qwen-2.5-coder-32b-instruct:free'
        },
        limits: { rpm: 20, rpd: 200 },
        requiresKey: true
      },

      'google-free': {
        name: 'Google AI Studio (Free)',
        tier: 'free',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        apiKeyEnv: 'GEMINI_API_KEY',
        models: {
          default: 'gemini-1.5-flash',
          commander: 'gemini-1.5-flash',
          researcher: 'gemini-1.5-flash',
          coder: 'gemini-1.5-flash',
          creative: 'gemini-1.5-flash',
          analyst: 'gemini-1.5-flash',
          executor: 'gemini-1.5-flash',
          critic: 'gemini-1.5-pro',
          social: 'gemini-1.5-flash',
          email: 'gemini-1.5-flash',
          crypto: 'gemini-1.5-flash',
          media: 'gemini-1.5-flash',
          scraper: 'gemini-1.5-flash',
          translator: 'gemini-1.5-flash',
          security: 'gemini-1.5-pro',
          glm52: 'gemini-1.5-pro'
        },
        limits: { rpm: 15, rpd: 1500 },
        requiresKey: true
      },

      'groq-free': {
        name: 'Groq (Free Tier)',
        tier: 'free',
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKeyEnv: 'GROQ_API_KEY',
        models: {
          default: 'llama-3.3-70b-versatile',
          commander: 'llama-3.3-70b-versatile',
          researcher: 'llama-3.3-70b-versatile',
          coder: 'qwen-2.5-coder-32b',
          creative: 'llama-3.3-70b-versatile',
          analyst: 'llama-3.3-70b-versatile',
          executor: 'llama-3.3-70b-versatile',
          critic: 'llama-3.3-70b-versatile',
          social: 'llama-3.3-70b-versatile',
          email: 'llama-3.3-70b-versatile',
          crypto: 'llama-3.3-70b-versatile',
          media: 'llama-3.3-70b-versatile',
          scraper: 'llama-3.3-70b-versatile',
          translator: 'llama-3.3-70b-versatile',
          security: 'llama-3.3-70b-versatile',
          glm52: 'qwen-2.5-coder-32b'
        },
        limits: { rpm: 30, rpd: 14400 },
        requiresKey: true
      },

      'ollama': {
        name: 'Ollama (Local, Free)',
        tier: 'free',
        baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
        apiKeyEnv: null, // No key needed
        models: {
          default: 'llama3.2',
          commander: 'llama3.2',
          researcher: 'llama3.2',
          coder: 'codellama',
          creative: 'llama3.2',
          analyst: 'llama3.2',
          executor: 'llama3.2',
          critic: 'llama3.2',
          social: 'llama3.2',
          email: 'llama3.2',
          crypto: 'llama3.2',
          media: 'llama3.2',
          scraper: 'llama3.2',
          translator: 'llama3.2',
          security: 'llama3.2',
          glm52: 'codellama'
        },
        limits: { rpm: 9999, rpd: 999999 },
        requiresKey: false
      },

      // ═══════ PAID TIER ═══════
      'openrouter-paid': {
        name: 'OpenRouter (Paid)',
        tier: 'paid',
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKeyEnv: 'OPENROUTER_API_KEY',
        models: {
          default: 'google/gemini-1.5-pro',
          commander: 'google/gemini-1.5-pro',
          researcher: 'google/gemini-1.5-pro',
          coder: 'zai-org/glm-5.2',
          creative: 'google/gemini-1.5-flash',
          analyst: 'google/gemini-1.5-pro',
          executor: 'google/gemini-1.5-flash',
          critic: 'anthropic/claude-3.7-sonnet',
          social: 'google/gemini-1.5-flash',
          email: 'google/gemini-1.5-flash',
          crypto: 'google/gemini-1.5-pro',
          media: 'google/gemini-1.5-flash',
          scraper: 'google/gemini-1.5-pro',
          translator: 'google/gemini-1.5-pro',
          security: 'anthropic/claude-3.7-sonnet',
          glm52: 'zai-org/glm-5.2'
        },
        limits: { rpm: 1000, rpd: 100000 },
        requiresKey: true
      },

      'anthropic': {
        name: 'Anthropic Claude',
        tier: 'paid',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKeyEnv: 'ANTHROPIC_API_KEY',
        models: {
          default: 'claude-3-7-sonnet-20250219',
          commander: 'claude-3-7-sonnet-20250219',
          researcher: 'claude-3-7-sonnet-20250219',
          coder: 'claude-3-7-sonnet-20250219',
          creative: 'claude-3-5-haiku-20241022',
          analyst: 'claude-3-7-sonnet-20250219',
          executor: 'claude-3-5-haiku-20241022',
          critic: 'claude-3-7-sonnet-20250219',
          social: 'claude-3-5-haiku-20241022',
          email: 'claude-3-5-haiku-20241022',
          crypto: 'claude-3-7-sonnet-20250219',
          media: 'claude-3-5-haiku-20241022',
          scraper: 'claude-3-7-sonnet-20250219',
          translator: 'claude-3-7-sonnet-20250219',
          security: 'claude-3-7-sonnet-20250219',
          glm52: 'claude-3-7-sonnet-20250219'
        },
        limits: { rpm: 50, rpd: 5000 },
        requiresKey: true
      },

      'openai': {
        name: 'OpenAI',
        tier: 'paid',
        baseUrl: 'https://api.openai.com/v1',
        apiKeyEnv: 'OPENAI_API_KEY',
        models: {
          default: 'gpt-4o',
          commander: 'gpt-4o',
          researcher: 'gpt-4o',
          coder: 'gpt-4o',
          creative: 'gpt-4o-mini',
          analyst: 'gpt-4o',
          executor: 'gpt-4o-mini',
          critic: 'gpt-4o',
          social: 'gpt-4o-mini',
          email: 'gpt-4o-mini',
          crypto: 'gpt-4o',
          media: 'gpt-4o-mini',
          scraper: 'gpt-4o',
          translator: 'gpt-4o',
          security: 'gpt-4o',
          glm52: 'gpt-4o'
        },
        limits: { rpm: 60, rpd: 10000 },
        requiresKey: true
      }
    };

    this.requestCounts = { minute: [], day: [] };
    this.lastSwitch = Date.now();
  }

  // ==================== GET CURRENT CONFIG ====================

  getProvider() {
    return this.providers[this.currentProvider] || this.providers['openrouter-free'];
  }

  getModel(agentKey) {
    const provider = this.getProvider();
    return this.currentModel || provider.models[agentKey] || provider.models.default;
  }

  getApiKey() {
    const provider = this.getProvider();
    if (!provider.requiresKey) return null;
    return process.env[provider.apiKeyEnv];
  }

  // ==================== SWITCH PROVIDER ====================

  switchProvider(providerKey, model = null) {
    if (!this.providers[providerKey]) {
      return { success: false, error: `Unknown provider: ${providerKey}` };
    }

    const provider = this.providers[providerKey];
    const apiKey = provider.requiresKey ? process.env[provider.apiKeyEnv] : 'not-needed';

    if (provider.requiresKey && !apiKey) {
      return { 
        success: false, 
        error: `API key not found. Set ${provider.apiKeyEnv} in environment variables.`,
        provider: providerKey
      };
    }

    this.currentProvider = providerKey;
    this.currentModel = model;
    this.lastSwitch = Date.now();

    return {
      success: true,
      provider: providerKey,
      name: provider.name,
      tier: provider.tier,
      model: this.getModel('default'),
      message: `Switched to ${provider.name}`
    };
  }

  // ==================== CHAT API (Unified) ====================

  async chat(agentKey, messages, options = {}) {
    const provider = this.getProvider();
    const apiKey = this.getApiKey();
    const model = this.getModel(agentKey);

    if (provider.requiresKey && !apiKey) {
      return {
        success: false,
        error: `API key missing. Set ${provider.apiKeyEnv}.`,
        status: 401
      };
    }

    // Rate limit check
    const rateLimit = this.checkRateLimit(provider.limits);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Retry after ${rateLimit.retryAfter}s`,
        status: 429
      };
    }

    try {
      let result;

      switch (this.currentProvider) {
        case 'google-free':
          result = await this.chatGoogle(model, messages, apiKey, options);
          break;
        case 'groq-free':
          result = await this.chatOpenAICompatible(provider.baseUrl, model, messages, apiKey, options);
          break;
        case 'ollama':
          result = await this.chatOllama(model, messages, options);
          break;
        case 'anthropic':
          result = await this.chatAnthropic(model, messages, apiKey, options);
          break;
        default:
          // OpenRouter (free + paid)
          result = await this.chatOpenRouter(model, messages, apiKey, options);
      }

      this.recordRequest();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        status: error.response?.status
      };
    }
  }

  // ==================== PROVIDER-SPECIFIC APIs ====================

  async chatOpenRouter(model, messages, apiKey, options) {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 4096,
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://neuroswarm.ai',
        'X-Title': 'NeuroSwarm AI'
      },
      timeout: options.timeout || 120000
    });

    return {
      success: true,
      content: response.data.choices[0].message.content,
      model: response.data.model,
      usage: response.data.usage,
      provider: this.currentProvider
    };
  }

  async chatGoogle(model, messages, apiKey, options) {
    // Convert messages to Gemini format
    const contents = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens || 4096
        }
      },
      { timeout: options.timeout || 120000 }
    );

    return {
      success: true,
      content: response.data.candidates[0].content.parts[0].text,
      model,
      usage: {
        prompt_tokens: response.data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: response.data.usageMetadata?.candidatesTokenCount || 0
      },
      provider: this.currentProvider
    };
  }

  async chatOpenAICompatible(baseUrl, model, messages, apiKey, options) {
    const response = await axios.post(`${baseUrl}/chat/completions`, {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 4096
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: options.timeout || 120000
    });

    return {
      success: true,
      content: response.data.choices[0].message.content,
      model: response.data.model,
      usage: response.data.usage,
      provider: this.currentProvider
    };
  }

  async chatOllama(model, messages, options) {
    const response = await axios.post(`${this.getProvider().baseUrl}/api/chat`, {
      model,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens || 4096
      }
    }, { timeout: options.timeout || 120000 });

    return {
      success: true,
      content: response.data.message.content,
      model,
      provider: this.currentProvider
    };
  }

  async chatAnthropic(model, messages, apiKey, options) {
    // Convert to Anthropic format
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const chatMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role,
      content: m.content
    }));

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
      system: systemMsg,
      messages: chatMessages
    }, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      timeout: options.timeout || 120000
    });

    return {
      success: true,
      content: response.data.content[0].text,
      model,
      usage: response.data.usage,
      provider: this.currentProvider
    };
  }

  // ==================== RATE LIMITING ====================

  checkRateLimit(limits) {
    const now = Date.now();
    const minuteAgo = now - 60000;
    const dayAgo = now - 86400000;

    this.requestCounts.minute = this.requestCounts.minute.filter(t => t > minuteAgo);
    this.requestCounts.day = this.requestCounts.day.filter(t => t > dayAgo);

    if (this.requestCounts.minute.length >= limits.rpm) {
      const oldest = this.requestCounts.minute[0];
      return { allowed: false, retryAfter: Math.ceil((oldest + 60000 - now) / 1000) };
    }

    if (this.requestCounts.day.length >= limits.rpd) {
      const oldest = this.requestCounts.day[0];
      return { allowed: false, retryAfter: Math.ceil((oldest + 86400000 - now) / 1000) };
    }

    return { allowed: true, remaining: limits.rpm - this.requestCounts.minute.length };
  }

  recordRequest() {
    const now = Date.now();
    this.requestCounts.minute.push(now);
    this.requestCounts.day.push(now);
  }

  // ==================== STATUS & INFO ====================

  getStatus() {
    const provider = this.getProvider();
    const apiKey = this.getApiKey();

    return {
      currentProvider: this.currentProvider,
      currentModel: this.getModel('default'),
      name: provider.name,
      tier: provider.tier,
      connected: provider.requiresKey ? !!apiKey : true,
      apiKeyConfigured: !!apiKey,
      apiKeyEnv: provider.apiKeyEnv,
      limits: provider.limits,
      requestCounts: {
        minute: this.requestCounts.minute.length,
        day: this.requestCounts.day.length
      }
    };
  }

  getAllProviders() {
    return Object.entries(this.providers).map(([key, p]) => ({
      key,
      name: p.name,
      tier: p.tier,
      requiresKey: p.requiresKey,
      apiKeyEnv: p.apiKeyEnv,
      limits: p.limits,
      models: p.models,
      available: p.requiresKey ? !!process.env[p.apiKeyEnv] : true
    }));
  }

  getFreeProviders() {
    return this.getAllProviders().filter(p => p.tier === 'free');
  }

  getPaidProviders() {
    return this.getAllProviders().filter(p => p.tier === 'paid');
  }

  // Auto-switch to free fallback if rate limited
  async autoFallback(agentKey, messages, options) {
    const result = await this.chat(agentKey, messages, options);

    if (result.status === 429) {
      // Try next available free provider
      const freeProviders = this.getFreeProviders().filter(p => p.key !== this.currentProvider && p.available);

      for (const fallback of freeProviders) {
        console.log(`[ModelSwitcher] Rate limited, trying ${fallback.name}...`);
        const prevProvider = this.currentProvider;
        this.switchProvider(fallback.key);
        const fallbackResult = await this.chat(agentKey, messages, options);
        if (fallbackResult.success) {
          fallbackResult.fallbackFrom = prevProvider;
          return fallbackResult;
        }
        // Switch back and try next
      }
    }

    return result;
  }
}

module.exports = ModelSwitcher;
