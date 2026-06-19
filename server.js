const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

// Core modules
const WebResearcher = require('./agents/web-researcher');
const FileManager = require('./agents/file-manager');
const Notifier = require('./agents/notifier');
const TaskScheduler = require('./agents/scheduler');
const MemoryManager = require('./agents/memory-manager');

// New agents
const SocialMediaAgent = require('./agents/social-media');
const EmailAgent = require('./agents/email');
const CryptoAgent = require('./agents/crypto');
const MediaAgent = require('./agents/media');
const ScraperAgent = require('./agents/scraper');
const TranslationAgent = require('./agents/translation');
const SecurityAgent = require('./agents/security');
const AionUiIntegration = require('./agents/aionui-integration');
const GLM52Agent = require('./agents/glm-52');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('dashboard'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==================== AGENT TEAM (14 AGENTS) ====================
const AGENTS = {
  commander: {
    name: "Commander",
    role: "orchestrator",
    model: "gemini-1.5-pro",
    icon: "👑",
    desc: "Strategic leader. Coordinates all operations and delegates tasks.",
    systemPrompt: `You are the Commander of NeuroSwarm AI. You analyze user requests, break them into sub-tasks, and delegate to specialized agents. You have absolute authority over the team. Respond with structured plans.`
  },
  researcher: {
    name: "Deep Research",
    role: "research",
    model: "gemini-1.5-pro",
    icon: "🔬",
    desc: "Fact-obsessed investigator. Gathers and verifies information.",
    systemPrompt: `You are Deep Research Agent. Gather information, verify facts, search knowledge, and provide comprehensive research reports. Never guess - investigate thoroughly.`
  },
  coder: {
    name: "Code Architect",
    role: "development",
    model: "gemini-1.5-pro",
    icon: "💻",
    desc: "Writes clean, production-ready code across multiple languages.",
    systemPrompt: `You are Code Architect Agent. Write, debug, review, and optimize code. Follow best practices, write documentation, handle edge cases. Support multiple languages.`
  },
  creative: {
    name: "Creative Mind",
    role: "creative",
    model: "gemini-1.5-flash",
    icon: "🎨",
    desc: "Generates ideas, content, designs, and marketing copy.",
    systemPrompt: `You are Creative Mind Agent. Generate ideas, write content, design concepts, create marketing copy, and produce creative works. Think divergently and inspire.`
  },
  analyst: {
    name: "Data Oracle",
    role: "analysis",
    model: "gemini-1.5-pro",
    icon: "📊",
    desc: "Analyzes data, finds patterns, creates visualizations.",
    systemPrompt: `You are Data Oracle Agent. Analyze data, find patterns, create visualizations, perform calculations, and provide insights. Think statistically and logically.`
  },
  executor: {
    name: "Task Runner",
    role: "execution",
    model: "gemini-1.5-flash",
    icon: "⚡",
    desc: "Executes plans, automates workflows, manages schedules.",
    systemPrompt: `You are Task Runner Agent. Execute plans, automate workflows, send notifications, manage schedules, and ensure deliverables are completed on time.`
  },
  critic: {
    name: "Quality Critic",
    role: "review",
    model: "gemini-1.5-pro",
    icon: "🔍",
    desc: "Reviews all outputs, finds errors, ensures quality.",
    systemPrompt: `You are Quality Critic Agent. Review all outputs from other agents, find errors, suggest improvements, and ensure the final deliverable meets the highest standards.`
  },
  social: {
    name: "Social Media Guru",
    role: "social",
    model: "gemini-1.5-flash",
    icon: "📱",
    desc: "Manages social media, creates posts, analyzes engagement.",
    systemPrompt: `You are Social Media Guru Agent. Create engaging social media content, manage posting schedules, analyze engagement metrics, and grow online presence across platforms.`
  },
  email: {
    name: "Email Master",
    role: "email",
    model: "gemini-1.5-flash",
    icon: "📧",
    desc: "Sends emails, manages templates, handles campaigns.",
    systemPrompt: `You are Email Master Agent. Craft compelling emails, manage templates, handle bulk campaigns, and ensure high deliverability and engagement rates.`
  },
  crypto: {
    name: "Crypto Trader",
    role: "trading",
    model: "gemini-1.5-pro",
    icon: "📈",
    desc: "Analyzes crypto markets, tracks prices, generates signals.",
    systemPrompt: `You are Crypto Trader Agent. Analyze cryptocurrency markets, track price movements, generate trading signals, and provide market insights using technical analysis.`
  },
  media: {
    name: "Media Creator",
    role: "media",
    model: "gemini-1.5-flash",
    icon: "🎬",
    desc: "Generates images, videos, thumbnails, and visual content.",
    systemPrompt: `You are Media Creator Agent. Generate images, videos, thumbnails, and visual content. Optimize for platforms and create eye-catching visuals.`
  },
  scraper: {
    name: "Web Scraper",
    role: "scraping",
    model: "gemini-1.5-pro",
    icon: "🕷️",
    desc: "Scrapes websites, extracts data, monitors changes.",
    systemPrompt: `You are Web Scraper Agent. Extract data from websites, monitor changes, scrape articles, products, and tables. Respect robots.txt and rate limits.`
  },
  translator: {
    name: "Linguist",
    role: "translation",
    model: "gemini-1.5-pro",
    icon: "🌍",
    desc: "Translates content, localizes for cultures, summarizes.",
    systemPrompt: `You are Linguist Agent. Translate content between languages, localize for different cultures, summarize text, and ensure accurate communication across borders.`
  },
  security: {
    name: "Guardian",
    role: "security",
    model: "gemini-1.5-pro",
    icon: "🛡️",
    desc: "Monitors threats, secures data, detects attacks.",
    systemPrompt: `You are Guardian Agent. Monitor for security threats, validate inputs, detect attacks, manage authentication, and ensure system safety.`
  },
  glm52: {
    name: "GLM-5.2 Engineer",
    role: "coding",
    model: "glm-5.2",
    icon: "🔧",
    desc: "Zhipu AI's GLM-5.2 — fixes bugs, refactors code, creates PRs.",
    systemPrompt: `You are GLM-5.2 Engineer Agent. You are an expert software engineer powered by Zhipu AI's GLM-5.2 model with 1M token context. You fix bugs, refactor code, analyze repositories, and create GitHub pull requests. You think deeply about code architecture and produce production-ready fixes.`
  }
};

// ==================== MODULE INSTANCES ====================
const memory = new MemoryManager(1000);
const fileManager = new FileManager('./workspace');
const notifier = new Notifier();
const scheduler = new TaskScheduler();
const webResearcher = new WebResearcher(process.env.SERPER_API_KEY);
const socialAgent = new SocialMediaAgent({
  twitter: { accessToken: process.env.TWITTER_ACCESS_TOKEN, accessSecret: process.env.TWITTER_ACCESS_SECRET },
  linkedin: { personId: process.env.LINKEDIN_PERSON_ID }
});
const emailAgent = new EmailAgent({
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT
});
const cryptoAgent = new CryptoAgent({
  apiKey: process.env.BINANCE_API_KEY,
  apiSecret: process.env.BINANCE_SECRET,
  paperTrading: true
});
const mediaAgent = new MediaAgent({
  stabilityKey: process.env.STABILITY_API_KEY,
  replicateKey: process.env.REPLICATE_API_KEY,
  openaiKey: process.env.OPENAI_API_KEY
});
const scraperAgent = new ScraperAgent({ rateLimit: 1000 });
const translationAgent = new TranslationAgent({
  apiKey: process.env.GOOGLE_TRANSLATE_API_KEY,
  provider: 'google',
  gemini: genAI  // Pass Gemini for AI fallback
});
const securityAgent = new SecurityAgent({ alertThreshold: 5 });

// ==================== AIONUI INTEGRATION ====================
const aionui = new AionUiIntegration({
  teamMode: true,
  leaderAgent: 'commander'
});
let aionuiStatus = { enabled: false, agents: [] };

// ==================== GLM-5.2 INTEGRATION ====================
const glm52 = new GLM52Agent({
  provider: process.env.GLM52_PROVIDER || 'zai',
  apiKey: process.env.GLM52_API_KEY || process.env.ZAI_API_KEY,
  githubToken: process.env.GITHUB_TOKEN,
  githubOwner: process.env.GITHUB_OWNER,
  githubRepo: process.env.GITHUB_REPO,
  reasoningMode: process.env.GLM52_REASONING || 'high'
});
let glm52Status = { connected: false };

// Initialize GLM-5.2 on startup
(async () => {
  const test = await glm52.testConnection();
  glm52Status = test;
  if (test.connected) {
    logEvent('system', 'glm52_connected', `GLM-5.2 via ${test.provider} (${test.model})`);
  } else {
    console.log('[GLM-5.2] Not configured. Set GLM52_API_KEY in .env to enable.');
  }
})();

// Initialize AionUi on startup
(async () => {
  const init = await aionui.initialize();
  aionuiStatus = init;
  if (init.enabled) {
    logEvent('system', 'aionui_connected', `Detected ${init.detectedAgents?.length || 0} AionUi agents`);
  }
})();

// ==================== STATE ====================
let agentLogs = [];
let activeTasks = [];
let isRunning = true;
let startTime = Date.now();
const sseClients = new Set();

function broadcastEvent(event, data) {
  const enriched = { ...data, type: event };
  const payload = `data: ${JSON.stringify(enriched)}\n\n`;
  sseClients.forEach(client => {
    try { 
      client.write(payload); 
      if (client.flush) client.flush();
    } catch (e) { 
      sseClients.delete(client); 
    }
  });
}

function logEvent(agent, action, details) {
  const entry = {
    timestamp: new Date().toISOString(),
    agent,
    action,
    details: String(details).substring(0, 500),
    id: Date.now() + Math.random()
  };
  agentLogs.unshift(entry);
  memory.add(`${agent}: ${action} - ${details}`, 0.6, 'log');
  if (agentLogs.length > 500) agentLogs.pop();
  broadcastEvent('log', entry);
  return entry;
}

function updateTask(task) {
  broadcastEvent('task', task);
}

// ==================== AI COMMUNICATION ====================
async function thinkWithAgent(agentKey, prompt, context = '') {
  const agent = AGENTS[agentKey];
  if (!agent) return `Error: Unknown agent ${agentKey}`;

  const model = genAI.getGenerativeModel({ model: agent.model });
  const relevantMemory = memory.search(context || prompt, 3);

  const fullPrompt = `${agent.systemPrompt}

=== TEAM CONTEXT ===
${context}

=== RELEVANT MEMORY ===
${relevantMemory.map(m => m.content).join('\n')}

=== YOUR TASK ===
${prompt}

Respond as ${agent.name}:`;

  try {
    const result = await model.generateContent(fullPrompt);
    const response = result.response.text();
    logEvent(agentKey, 'thinking', response.substring(0, 200));
    memory.add(`${agent.name}: ${response}`, 0.7, agentKey);
    return response;
  } catch (error) {
    logEvent(agentKey, 'error', error.message);
    return `Error: ${error.message}`;
  }
}

// ==================== ORCHESTRATION ====================
async function processRequest(userRequest, priority = 'normal') {
  logEvent('commander', 'received_request', userRequest);

  // Security scan
  const threatScan = securityAgent.scanForThreats(userRequest);
  if (!threatScan.safe) {
    securityAgent.logAlert('threat_detected', { request: userRequest, threats: threatScan.threats });
    return { error: 'Potential security threat detected in request', threats: threatScan.threats };
  }

  // Step 1: Commander plans
  const plan = await thinkWithAgent('commander', 
    `User request: "${userRequest}"\n\nCreate a step-by-step plan. Identify which agents to activate from: researcher, coder, creative, analyst, executor, critic, social, email, crypto, media, scraper, translator, security. Return structured plan.`,
    `Active tasks: ${activeTasks.filter(t => t.status !== 'completed').length}. Team: ${isRunning ? 'ACTIVE' : 'PAUSED'}`
  );

  const taskId = Date.now();
  const task = {
    id: taskId,
    request: userRequest,
    priority,
    status: 'planning',
    plan,
    results: {},
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };
  activeTasks.unshift(task);
  updateTask(task);

  // Execute asynchronously but return immediately with taskId
  executePlan(task, plan).catch(err => {
    logEvent('system', 'execution_error', err.message);
    task.status = 'failed';
    task.error = err.message;
    task.updated = new Date().toISOString();
    updateTask(task);
  });

  return { taskId, message: 'Task accepted. Agent team is working on it.', plan: plan.substring(0, 500) };
}

async function executePlan(task, planText) {
  const plan = planText;
  task.status = 'executing';
  task.updated = new Date().toISOString();
  updateTask(task);

  const agentMatches = planText.match(/(researcher|coder|creative|analyst|executor|critic|social|email|crypto|media|scraper|translator|security)/gi) || [];
  const uniqueAgents = [...new Set(agentMatches.map(a => a.toLowerCase()))];

  const results = {};

  for (const agentKey of uniqueAgents) {
    if (!AGENTS[agentKey]) continue;

    task.status = `running_${agentKey}`;
    task.updated = new Date().toISOString();
    updateTask(task);

    let agentResult = null;

    try {
      if (agentKey === 'researcher' && process.env.SERPER_API_KEY) {
        const researchData = await webResearcher.deepResearch(task.request, 3);
        agentResult = await thinkWithAgent(agentKey,
          `Execute research. Web data: ${JSON.stringify(researchData)}\n\nRequest: ${task.request}`,
          `Plan: ${planText}`
        );
      } else if (agentKey === 'crypto') {
        const symbolMatch = task.request.match(/\b(BTC|ETH|SOL|ADA|XRP|DOT|LINK|AVAX|MATIC|DOGE)\b/i);
        const symbol = symbolMatch ? symbolMatch[1] + 'USDT' : 'BTCUSDT';
        const analysis = await cryptoAgent.analyzeTrend(symbol);
        agentResult = await thinkWithAgent(agentKey,
          `Analyze crypto market. Data: ${JSON.stringify(analysis)}\n\nRequest: ${task.request}`,
          `Plan: ${planText}`
        );
      } else if (agentKey === 'scraper') {
        const urlMatch = task.request.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
          const scrapeResult = await scraperAgent.scrapeArticle(urlMatch[0]);
          agentResult = await thinkWithAgent(agentKey,
            `Scrape and analyze. Data: ${JSON.stringify(scrapeResult)}\n\nRequest: ${task.request}`,
            `Plan: ${planText}`
          );
        } else {
          agentResult = await thinkWithAgent(agentKey, task.request, planText);
        }
      } else if (agentKey === 'translator') {
        // Try direct translation if text is provided, else use AI
        const langMatch = task.request.match(/translate\s+(.+?)\s+to\s+(\w+)/i);
        if (langMatch) {
          const directResult = await translationAgent.translate(langMatch[1], langMatch[2]);
          agentResult = directResult.success ? directResult.translatedText : await thinkWithAgent(agentKey, task.request, planText);
        } else {
          agentResult = await thinkWithAgent(agentKey, task.request, planText);
        }
      } else if (agentKey === 'social') {
        const contentResult = await thinkWithAgent(agentKey, task.request, planText);
        agentResult = contentResult;
        // If credentials exist, also prepare the actual post
        if (process.env.TWITTER_ACCESS_TOKEN) {
          task.preparedPost = { platform: 'twitter', content: contentResult, status: 'ready' };
        }
      } else if (agentKey === 'email') {
        const contentResult = await thinkWithAgent(agentKey, task.request, planText);
        agentResult = contentResult;
        // If SMTP configured, mark as ready to send
        if (process.env.EMAIL_USER) {
          task.preparedEmail = { status: 'ready' };
        }
      } else {
        agentResult = await thinkWithAgent(agentKey, task.request, planText);
      }
    } catch (e) {
      agentResult = `Error in ${agentKey}: ${e.message}`;
      logEvent(agentKey, 'error', e.message);
    }

    results[agentKey] = agentResult;
    task.results = results;
    task.updated = new Date().toISOString();
    updateTask(task);
  }

  task.results = results;

  // Quality review
  task.status = 'reviewing';
  task.updated = new Date().toISOString();
  updateTask(task);

  const review = await thinkWithAgent('critic',
    `Review team outputs for: "${task.request}"\n\n${Object.entries(results).map(([k,v]) => `${k}: ${v}`).join('\n\n')}`,
    ''
  );
  task.review = review;

  // Final synthesis
  task.status = 'synthesizing';
  task.updated = new Date().toISOString();
  updateTask(task);

  const final = await thinkWithAgent('commander',
    `Synthesize into final response.\n\nRequest: ${task.request}\n\nResults: ${JSON.stringify(results)}\n\nReview: ${review}`,
    ''
  );
  task.finalOutput = final;
  task.status = 'completed';
  task.completed = new Date().toISOString();
  task.updated = new Date().toISOString();
  updateTask(task);

  // Save to file
  try {
    await fileManager.writeFile(`tasks/${task.id}.md`, 
      `# Task ${task.id}\n\n**Request:** ${task.request}\n\n**Status:** ${task.status}\n\n**Plan:**\n${task.plan}\n\n**Results:**\n${JSON.stringify(results, null, 2)}\n\n**Final Output:**\n${final}`
    );
  } catch (e) {}

  logEvent('commander', 'task_completed', `Task ${task.id} completed`);

  if (task.priority === 'high') {
    await notifier.alert(`Task ${task.id} completed: ${task.request}`);
  }
}

// ==================== AUTONOMOUS MODE ====================
let autonomousInterval = null;

function startAutonomousMode() {
  if (autonomousInterval) clearInterval(autonomousInterval);

  autonomousInterval = setInterval(async () => {
    if (!isRunning) return;

    const selfPrompt = await thinkWithAgent('commander',
      `It's ${new Date().toISOString()}. Team is in autonomous 24/7 mode. Check memory for pending items, trends, or proactive opportunities. Initiate self-directed tasks if needed. Respond with action or "idle".`,
      `Memory: ${memory.shortTerm.length} items. Recent: ${memory.getContext(3).map(m => m.content.substring(0, 100)).join(' | ')}`
    );

    if (!selfPrompt.toLowerCase().includes('idle') && selfPrompt.length > 20) {
      await processRequest(`[AUTONOMOUS] ${selfPrompt}`, 'low');
    }
  }, 300000);

  logEvent('system', 'autonomous_mode', 'Started 24/7 autonomous loop');
}

// ==================== API ROUTES ====================

// SSE Endpoint for real-time updates
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.writeHead(200);

  sseClients.add(res);

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);
  if (res.flush) res.flush();

  req.on('close', () => {
    sseClients.delete(res);
  });
});

app.post('/api/command', async (req, res) => {
  const { command, priority = 'normal' } = req.body;
  if (!command) return res.status(400).json({ error: 'Command required' });

  const result = await processRequest(command, priority);
  res.json(result);
});

app.get('/api/status', (req, res) => {
  res.json({
    isRunning,
    activeTasks: activeTasks.filter(t => t.status !== 'completed' && t.status !== 'failed').length,
    completedTasks: activeTasks.filter(t => t.status === 'completed').length,
    failedTasks: activeTasks.filter(t => t.status === 'failed').length,
    memorySize: memory.shortTerm.length + memory.longTerm.length,
    agents: Object.keys(AGENTS).map(key => ({
      key,
      name: AGENTS[key].name,
      role: AGENTS[key].role,
      icon: AGENTS[key].icon,
      active: true
    })),
    uptime: process.uptime(),
    mode: isRunning ? 'AUTONOMOUS' : 'PAUSED',
    startTime: new Date(startTime).toISOString()
  });
});

app.get('/api/tasks', (req, res) => {
  res.json(activeTasks.slice(0, 50));
});

app.get('/api/task/:id', (req, res) => {
  const task = activeTasks.find(t => t.id == req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

app.get('/api/logs', (req, res) => {
  res.json(agentLogs.slice(0, 100));
});

app.get('/api/memory', (req, res) => {
  res.json(memory.export());
});

app.post('/api/toggle', (req, res) => {
  isRunning = !isRunning;
  logEvent('system', 'toggle', isRunning ? 'Team activated' : 'Team paused');
  res.json({ isRunning, message: isRunning ? 'Team activated' : 'Team paused' });
});

app.post('/api/schedule', (req, res) => {
  const { cronExpression, taskName, command } = req.body;
  const id = scheduler.schedule(cronExpression, taskName, async () => {
    await processRequest(command, 'normal');
  });
  res.json({ id, message: `Scheduled: ${taskName}` });
});

app.get('/api/schedule', (req, res) => {
  res.json(scheduler.list());
});

app.delete('/api/schedule/:id', (req, res) => {
  const success = scheduler.cancel(parseInt(req.params.id));
  res.json({ success });
});

app.post('/api/memory/search', (req, res) => {
  const { query, limit = 10 } = req.body;
  res.json(memory.search(query, limit));
});

// Social Media Routes
app.post('/api/social/post', async (req, res) => {
  const { platform, content, schedule } = req.body;
  try {
    if (schedule) {
      const post = socialAgent.schedulePost({ platform, content }, new Date(schedule));
      res.json({ success: true, scheduled: post });
    } else {
      // If credentials available, actually post; otherwise draft
      let posted = false;
      if (platform === 'twitter' && process.env.TWITTER_ACCESS_TOKEN) {
        const result = await socialAgent.postToTwitter(content, process.env.TWITTER_API_KEY, process.env.TWITTER_API_SECRET);
        posted = result.success;
      }
      res.json({ success: true, posted, draft: { platform, content, status: posted ? 'posted' : 'ready_to_post' } });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/social/calendar', (req, res) => {
  res.json(socialAgent.getContentCalendar());
});

// Email Routes
app.post('/api/email/send', async (req, res) => {
  const { to, subject, body, html } = req.body;
  try {
    if (!process.env.EMAIL_USER) {
      return res.status(503).json({ error: 'Email not configured. Set EMAIL_USER and EMAIL_PASS in .env' });
    }
    const result = await emailAgent.sendEmail({ to, subject, body, html });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/email/template', (req, res) => {
  const { name, subject, body } = req.body;
  emailAgent.addTemplate(name, subject, body);
  res.json({ success: true, message: `Template '${name}' added` });
});

// Crypto Routes
app.get('/api/crypto/price/:symbol', async (req, res) => {
  try {
    const price = await cryptoAgent.getPrice(req.params.symbol.toUpperCase());
    if (price === null) return res.status(404).json({ error: 'Price not available' });
    res.json({ symbol: req.params.symbol, price });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/crypto/analyze/:symbol', async (req, res) => {
  try {
    const analysis = await cryptoAgent.analyzeTrend(req.params.symbol.toUpperCase());
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/crypto/alert', (req, res) => {
  const { symbol, condition } = req.body;
  const alert = cryptoAgent.setAlert(symbol, condition, (price, alert) => {
    notifier.alert(`Crypto Alert: ${symbol} triggered at ${price}`);
  });
  res.json({ success: true, alert });
});

// Media Routes
app.post('/api/media/generate', async (req, res) => {
  const { prompt, type = 'image', options = {} } = req.body;
  try {
    let result;
    if (type === 'image') {
      if (!process.env.STABILITY_API_KEY) {
        return res.status(503).json({ error: 'Stability API key not configured' });
      }
      result = await mediaAgent.generateImage(prompt, options);
    } else if (type === 'video') {
      if (!process.env.REPLICATE_API_KEY) {
        return res.status(503).json({ error: 'Replicate API key not configured' });
      }
      result = await mediaAgent.generateVideo(prompt, options);
    } else if (type === 'thumbnail') {
      result = await mediaAgent.generateThumbnail(prompt, options);
    } else if (type === 'logo') {
      result = await mediaAgent.generateLogo(prompt, options.description || '', options);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Scraper Routes
app.post('/api/scraper/article', async (req, res) => {
  const { url } = req.body;
  try {
    const result = await scraperAgent.scrapeArticle(url);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scraper/products', async (req, res) => {
  const { url, selector } = req.body;
  try {
    const result = await scraperAgent.scrapeProducts(url, selector);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Translation Routes
app.post('/api/translate', async (req, res) => {
  const { text, targetLang, sourceLang = 'auto' } = req.body;
  try {
    const result = await translationAgent.translate(text, targetLang, sourceLang);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/translate/languages', (req, res) => {
  res.json(translationAgent.getSupportedLanguages());
});

// Security Routes
app.post('/api/security/scan', (req, res) => {
  const { data } = req.body;
  const result = securityAgent.scanForThreats(data);
  res.json(result);
});

app.get('/api/security/alerts', (req, res) => {
  const { severity, limit = 50 } = req.query;
  res.json(securityAgent.getAlerts(severity, parseInt(limit)));
});

app.get('/api/security/stats', (req, res) => {
  res.json(securityAgent.getStats());
});

// File management routes
app.post('/api/files/write', async (req, res) => {
  const { path: filePath, content } = req.body;
  try {
    const fullPath = await fileManager.writeFile(filePath, content);
    res.json({ success: true, path: fullPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/files/read', async (req, res) => {
  const { path: filePath } = req.query;
  try {
    const content = await fileManager.readFile(filePath);
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/files/list', async (req, res) => {
  const { path: dirPath = '' } = req.query;
  try {
    const files = await fileManager.listFiles(dirPath);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GLM-5.2 Routes
app.get('/api/glm52/status', (req, res) => {
  res.json(glm52.getStatus());
});

app.post('/api/glm52/test', async (req, res) => {
  const result = await glm52.testConnection();
  glm52Status = result;
  res.json(result);
});

app.post('/api/glm52/fix-file', async (req, res) => {
  const { filePath, issueDescription } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath required' });

  const result = await glm52.fixFile(filePath, issueDescription);
  res.json(result);
});

app.post('/api/glm52/fix-bug', async (req, res) => {
  const { errorLog, filePath } = req.body;
  if (!errorLog) return res.status(400).json({ error: 'errorLog required' });

  const result = await glm52.fixBugFromError(errorLog, filePath);
  res.json(result);
});

app.post('/api/glm52/analyze-repo', async (req, res) => {
  const { repoUrl } = req.body;
  const result = await glm52.analyzeRepository(repoUrl);
  res.json(result);
});

app.post('/api/glm52/chat', async (req, res) => {
  const { messages, options = {} } = req.body;
  if (!messages) return res.status(400).json({ error: 'messages required' });

  const result = await glm52.chat(messages, options);
  res.json(result);
});

// AionUi Routes
app.get('/api/aionui/status', (req, res) => {
  res.json(aionui.getStatus());
});

app.get('/api/aionui/health', async (req, res) => {
  const health = await aionui.healthCheck();
  res.json(health);
});

app.post('/api/aionui/detect', async (req, res) => {
  const agents = await aionui.detectAgents();
  res.json({ agents, count: agents.length });
});

app.post('/api/aionui/team-task', async (req, res) => {
  const { task, agents } = req.body;
  if (!task) return res.status(400).json({ error: 'Task required' });

  const result = await aionui.executeTeamTask(
    { id: Date.now(), request: task },
    agents || []
  );
  res.json(result);
});

app.post('/api/aionui/office', async (req, res) => {
  const { type, content, options } = req.body;
  if (!type || !content) return res.status(400).json({ error: 'Type and content required' });

  const result = await aionui.generateOfficeDocument(type, content, options);
  res.json(result);
});

// ==================== STARTUP ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🧠 ╔══════════════════════════════════════════════════╗');
  console.log('🧠 ║     NEUROSWARM AI - 14 AGENT TEAM v2.1         ║');
  console.log('🧠 ║           PRODUCTION READY - 24/7              ║');
  console.log('🧠 ╚══════════════════════════════════════════════════╝');
  console.log(`🤖 Dashboard: http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api/status`);
  console.log(`🚀 Agents: ${Object.keys(AGENTS).length} active`);
  console.log(`   ${Object.entries(AGENTS).map(([k,v]) => `${v.icon} ${v.name}`).join(' | ')}`);
  console.log(`💾 Memory: ${memory.shortTerm.length} items`);
  console.log(`🛡️  Security: Active monitoring`);
  console.log(`📈 Crypto: Paper trading mode`);
  if (aionuiStatus.enabled) {
    console.log(`🔗 AionUi: Connected (${aionuiStatus.detectedAgents?.length || 0} external agents)`);
  } else {
    console.log(`🔗 AionUi: Not detected (optional - install from github.com/iofficeai/aionui)`);
  }
  if (glm52Status.connected) {
    console.log(`🔧 GLM-5.2: Connected via ${glm52Status.provider} (${glm52Status.model})`);
  } else {
    console.log(`🔧 GLM-5.2: Not configured (optional - set GLM52_API_KEY)`);
  }
  startAutonomousMode();
});
