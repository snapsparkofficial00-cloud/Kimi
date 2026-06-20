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
const SelfImprover = require('./agents/self-improver');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('dashboard'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==================== AGENT TEAM (15 AGENTS) ====================
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
    desc: "Executes tasks, automates workflows, manages schedules.",
    systemPrompt: `You are Task Runner Agent. Execute tasks, automate workflows, manage schedules, and ensure timely completion. Be efficient and reliable.`
  },
  critic: {
    name: "Quality Critic",
    role: "review",
    model: "gemini-1.5-pro",
    icon: "🔍",
    desc: "Reviews code, content, and outputs for quality.",
    systemPrompt: `You are Quality Critic Agent. Review code, content, and outputs. Identify bugs, suggest improvements, ensure standards. Be thorough and constructive.`
  },
  social: {
    name: "Social Media Guru",
    role: "social",
    model: "gemini-1.5-flash",
    icon: "📱",
    desc: "Manages social media, creates posts, analyzes engagement.",
    systemPrompt: `You are Social Media Guru Agent. Create engaging posts, manage accounts, analyze metrics, and grow audiences. Be trendy and authentic.`
  },
  email: {
    name: "Email Master",
    role: "email",
    model: "gemini-1.5-flash",
    icon: "📧",
    desc: "Drafts emails, manages inbox, automates communication.",
    systemPrompt: `You are Email Master Agent. Draft professional emails, manage communication, automate responses. Be clear and courteous.`
  },
  crypto: {
    name: "Crypto Trader",
    role: "crypto",
    model: "gemini-1.5-pro",
    icon: "📈",
    desc: "Analyzes crypto markets, tracks portfolios, alerts on trends.",
    systemPrompt: `You are Crypto Trader Agent. Analyze markets, track portfolios, identify trends, provide trading insights. Be analytical and cautious.`
  },
  media: {
    name: "Media Creator",
    role: "media",
    model: "gemini-1.5-flash",
    icon: "🎬",
    desc: "Creates images, videos, audio content.",
    systemPrompt: `You are Media Creator Agent. Generate images, videos, audio. Be creative and produce high-quality media.`
  },
  scraper: {
    name: "Web Scraper",
    role: "scraper",
    model: "gemini-1.5-flash",
    icon: "🕷️",
    desc: "Scrapes websites, extracts data, monitors changes.",
    systemPrompt: `You are Web Scraper Agent. Extract data from websites, monitor changes, structure information. Be precise and respectful.`
  },
  translator: {
    name: "Linguist",
    role: "translation",
    model: "gemini-1.5-pro",
    icon: "🌍",
    desc: "Translates between languages, localizes content.",
    systemPrompt: `You are Linguist Agent. Translate accurately, localize content, preserve meaning and tone. Be culturally aware.`
  },
  security: {
    name: "Guardian",
    role: "security",
    model: "gemini-1.5-pro",
    icon: "🛡️",
    desc: "Monitors security, detects threats, enforces policies.",
    systemPrompt: `You are Guardian Agent. Monitor security, detect threats, enforce policies, protect data. Be vigilant and proactive.`
  },
  glm52: {
    name: "GLM-5.2 Engineer",
    role: "engineering",
    model: "glm-5.2",
    icon: "🔧",
    desc: "Advanced engineering agent with GLM-5.2 capabilities.",
    systemPrompt: `You are GLM-5.2 Engineer Agent. Advanced engineering tasks, complex problem solving, system design. Be innovative and thorough.`
  },
  selfImprover: {
    name: "Self Improver",
    role: "self-improvement",
    model: "internal",
    icon: "🤖",
    desc: "Scans code, fixes bugs, improves quality automatically.",
    systemPrompt: `You are Self Improver Agent. Scan codebase, detect bugs, apply fixes, improve code quality, commit changes.`
  }
};

// ==================== MODEL SWITCHER STATUS ====================
let modelSwitcherStatus = {
  connected: false,
  name: 'Not Connected',
  tier: 'free',
  currentModel: 'none',
  currentProvider: 'none'
};

if (process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY) {
  modelSwitcherStatus.connected = true;
  modelSwitcherStatus.name = 'Auto-Detected';
  modelSwitcherStatus.tier = 'free';
  if (process.env.GROQ_API_KEY) {
    modelSwitcherStatus.currentProvider = 'groq';
    modelSwitcherStatus.currentModel = 'llama-3.3-70b';
  } else if (process.env.GEMINI_API_KEY) {
    modelSwitcherStatus.currentProvider = 'google';
    modelSwitcherStatus.currentModel = 'gemini-1.5-pro';
  } else if (process.env.OPENROUTER_API_KEY) {
    modelSwitcherStatus.currentProvider = 'openrouter';
    modelSwitcherStatus.currentModel = 'auto';
  }
}

// ==================== SELF-IMPROVING AGENT ====================
const selfImprover = new SelfImprover();

if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    selfImprover.run().catch(err => console.error('Self-improvement error:', err));
  }, 6 * 60 * 60 * 1000);
}

// ==================== AGENT INSTANCES ====================
const webResearcher = new WebResearcher();
const fileManager = new FileManager();
const notifier = new Notifier();
const scheduler = new TaskScheduler();
const memory = new MemoryManager();
const socialMedia = new SocialMediaAgent();
const emailAgent = new EmailAgent();
const cryptoAgent = new CryptoAgent();
const mediaAgent = new MediaAgent();
const scraperAgent = new ScraperAgent();
const translationAgent = new TranslationAgent();
const securityAgent = new SecurityAgent();
const aionui = new AionUiIntegration();
const glm52 = new GLM52Agent();

// ==================== CORE API ====================
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    version: '2.1',
    agents: Object.keys(AGENTS).length,
    memory: memory.shortTerm.length,
    uptime: process.uptime()
  });
});

app.get('/api/agents', (req, res) => {
  res.json(AGENTS);
});

app.post('/api/chat', async (req, res) => {
  const { agent, message } = req.body;
  if (!AGENTS[agent]) return res.status(404).json({ error: 'Agent not found' });

  try {
    const model = genAI.getGenerativeModel({ model: AGENTS[agent].model });
    const result = await model.generateContent(`${AGENTS[agent].systemPrompt}\n\nUser: ${message}`);
    res.json({ response: result.response.text() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SELF-IMPROVE API ====================
app.get('/api/self-improve/status', (req, res) => {
  res.json(selfImprover.getStatus());
});

app.post('/api/self-improve/run', async (req, res) => {
  const { fullCycle = true } = req.body;
  try {
    const result = await selfImprover.run(fullCycle);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/self-improve/fix-bugs', async (req, res) => {
  try {
    const bugs = selfImprover.detectBugs();
    const fixed = await selfImprover.fixBugs(bugs);
    await selfImprover.commitChanges(`Auto-fix ${fixed} critical bugs`);
    res.json({ success: true, bugsFound: bugs.length, bugsFixed: fixed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== STARTUP ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🧠 ╔══════════════════════════════════════════════════╗');
  console.log('🧠 ║     NEUROSWARM AI - 15 AGENT TEAM v2.1         ║');
  console.log('🧠 ║           PRODUCTION READY - 24/7              ║');
  console.log('🧠 ╚══════════════════════════════════════════════════╝');
  console.log(`🤖 Dashboard: http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api/status`);
  console.log(`🚀 Agents: ${Object.keys(AGENTS).length} active`);
  console.log(`   ${Object.entries(AGENTS).map(([k,v]) => `${v.icon} ${v.name}`).join(' | ')}`);
  console.log(`💾 Memory: ${memory.shortTerm.length} items`);
  console.log(`🛡️  Security: Active monitoring`);
  console.log(`📈 Crypto: Paper trading mode`);
  if (modelSwitcherStatus.connected) {
    console.log(`🌐 ModelSwitcher: ${modelSwitcherStatus.name} (${modelSwitcherStatus.tier})`);
    console.log(`   Current Model: ${modelSwitcherStatus.currentModel}`);
    console.log(`   Provider: ${modelSwitcherStatus.currentProvider}`);
  } else {
    console.log(`🌐 ModelSwitcher: No API key configured`);
    console.log(`   FREE options:`);
    console.log(`     • OpenRouter: https://openrouter.ai/keys`);
    console.log(`     • Google AI: https://aistudio.google.com/app/apikey`);
    console.log(`     • Groq: https://console.groq.com/keys`);
    console.log(`     • Ollama: Install locally (ollama.com)`);
  }
});
