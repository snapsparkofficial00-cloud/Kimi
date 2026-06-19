# 🧠 NeuroSwarm AI v2.1 - 15 Agent Autonomous Team

A **production-ready** multi-agent AI system with 15 specialized agents that runs 24/7 and executes tasks like a human team. Built with real API integrations, SSE real-time updates, and autonomous operation.

## 🤖 Agent Team (14 Agents)

| # | Agent | Role | Icon | Description |
|---|-------|------|------|-------------|
| 1 | **Commander** | Orchestrator | 👑 | Strategic leader, coordinates all operations |
| 2 | **Deep Research** | Research | 🔬 | Fact-obsessed investigator with real web search |
| 3 | **Code Architect** | Development | 💻 | Writes clean, production-ready code |
| 4 | **Creative Mind** | Creative | 🎨 | Generates ideas, content, designs |
| 5 | **Data Oracle** | Analysis | 📊 | Analyzes data, finds patterns |
| 6 | **Task Runner** | Execution | ⚡ | Automates workflows, manages schedules |
| 7 | **Quality Critic** | Review | 🔍 | Reviews outputs, ensures quality |
| 8 | **Social Media Guru** | Social | 📱 | Manages social media, creates posts |
| 9 | **Email Master** | Email | 📧 | Sends emails, manages campaigns |
| 10 | **Crypto Trader** | Trading | 📈 | Analyzes markets, generates signals |
| 11 | **Media Creator** | Media | 🎬 | Generates images, videos, thumbnails |
| 12 | **Web Scraper** | Scraping | 🕷️ | Extracts data, monitors websites |
| 13 | **Linguist** | Translation | 🌍 | Translates, localizes, summarizes |
| 14 | **Guardian** | Security | 🛡️ | Monitors threats, secures data |

## 🔧 GLM-5.2 Integration (Optional)

NeuroSwarm now integrates **GLM-5.2** — Zhipu AI's latest 1M-token context coding model (June 2026).

### What GLM-5.2 Adds

| Feature | Description |
|---------|-------------|
| **1M Token Context** | Analyze entire repositories in one pass |
| **Auto Bug Fix** | Detect bugs → generate fixes → create GitHub PRs |
| **Reasoning Modes** | High (fast) / Max (deep analysis) |
| **Multi-Provider** | Z.AI, OpenRouter, AI/ML API, Cloudflare Workers AI |
| **SWE-bench 77.8%** | Production-grade code repair |

### Quick Start

```bash
# 1. Get API key from https://open.bigmodel.cn
# 2. Add to .env
GLM52_API_KEY=your_key
GITHUB_TOKEN=your_github_pat
GITHUB_OWNER=your_username
GITHUB_REPO=your_repo

# 3. Restart server
node server.js
```

### API Endpoints (GLM-5.2)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/glm52/status` | GET | Connection status |
| `/api/glm52/test` | POST | Test connection |
| `/api/glm52/fix-file` | POST | Fix a file + create PR |
| `/api/glm52/fix-bug` | POST | Analyze error log + suggest fix |
| `/api/glm52/analyze-repo` | POST | Scan repo structure |
| `/api/glm52/chat` | POST | Direct GLM-5.2 chat |

### Example: Fix a File

```bash
curl -X POST http://localhost:3000/api/glm52/fix-file   -H "Content-Type: application/json"   -d '{
    "filePath": "src/utils/api.js",
    "issueDescription": "Memory leak in fetch retry logic"
  }'
```

### Example: Fix from Error Log

```bash
curl -X POST http://localhost:3000/api/glm52/fix-bug   -H "Content-Type: application/json"   -d '{
    "errorLog": "TypeError: Cannot read property 'map' of undefined at line 42 in src/components/List.js",
    "filePath": "src/components/List.js"
  }'
```

### Natural Language Commands

Just tell NeuroSwarm:
- `"Fix the memory leak in src/utils/api.js"`
- `"Debug the TypeError in List.js line 42"`
- `"Refactor the auth middleware to use async/await"`
- `"Analyze my repo for security vulnerabilities"`

The Commander will automatically route code tasks to GLM-5.2.

## 🔗 AionUi Integration (Optional)

NeuroSwarm AI v2.1 integrates with [AionUi](https://github.com/iofficeai/aionui) — the free, open-source AI Cowork desktop app with 28K+ stars.

### What AionUi Adds

| Feature | NeuroSwarm Alone | + AionUi |
|---------|-----------------|---------|
| **Agents** | 14 built-in | 14 + 12+ CLI agents (Claude Code, Codex, Qwen Code, etc.) |
| **Office Generation** | None | PPTX, DOCX, XLSX with Morph animations |
| **Team Mode** | Sequential execution | Parallel multi-agent with Leader/Teammate delegation |
| **Remote Access** | Web dashboard only | WebUI + Telegram + Lark + DingTalk + WeChat |
| **MCP Management** | Per-agent config | Unified MCP — configure once, sync everywhere |
| **Scheduling** | Cron via API | Native 24/7 cron with GUI |
| **UI** | Web dashboard | Desktop app (Electron) + WebUI |

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    AionUi Desktop App                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐  │
│  │Claude   │ │ Codex   │ │Qwen Code│ │  NeuroSwarm     │  │
│  │  Code   │ │         │ │         │ │  (via ACP/MCP)  │  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────────┬────────┘  │
│       └─────────────┴───────────┴───────────────┘           │
│                         │                                     │
│              ┌──────────┴──────────┐                         │
│              │  Unified MCP Config   │ ← One config, all agents│
│              │  Team Mode Leader     │ ← Delegates subtasks    │
│              │  OfficeCLI Engine     │ ← PPTX/DOCX/XLSX        │
│              └───────────────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### Install AionUi

```bash
# macOS (Homebrew)
brew install aionui

# Or download from GitHub Releases
# https://github.com/iofficeai/aionui/releases
```

### Auto-Detection

NeuroSwarm automatically detects AionUi on startup:
- Scans common install paths (macOS `.app`, Windows `Program Files`, Linux `/usr/bin`)
- Detects all installed CLI agents (Claude Code, Codex, etc.)
- Syncs NeuroSwarm as an MCP server into AionUi's config
- Registers for Team Mode collaboration

### API Endpoints (AionUi)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/aionui/status` | GET | AionUi connection status |
| `/api/aionui/health` | GET | Health check + detected agents |
| `/api/aionui/detect` | POST | Re-scan for CLI agents |
| `/api/aionui/team-task` | POST | Execute task via AionUi Team Mode |
| `/api/aionui/office` | POST | Generate PPTX/DOCX/XLSX |

### Example: Use AionUi Team Mode

```bash
curl -X POST http://localhost:3000/api/aionui/team-task   -H "Content-Type: application/json"   -d '{
    "task": "Build a React dashboard with crypto charts",
    "agents": [
      {"name": "Claude Code", "command": "claude"},
      {"name": "Codex", "command": "codex"}
    ]
  }'
```

### Example: Generate Office Document

```bash
curl -X POST http://localhost:3000/api/aionui/office   -H "Content-Type: application/json"   -d '{
    "type": "pptx",
    "content": {"title": "AI Trends 2026", "slides": [...]},
    "options": {"style": "morph", "theme": "dark"}
  }'
```

## 🚀 Quick Deploy

### 1. Get API Keys
- **Gemini** (Required): [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Serper** (Optional): [Serper.dev](https://serper.dev) - for web research
- **Twitter** (Optional): [Twitter Developer](https://developer.twitter.com) - for social media
- **Binance** (Optional): [Binance API](https://binance.com) - for crypto trading
- **Stability AI** (Optional): [DreamStudio](https://dreamstudio.ai) - for image generation
- **Replicate** (Optional): [Replicate](https://replicate.com) - for video generation

### 2. Local Setup
```bash
git clone <your-repo>
cd neuroswarm-ai
npm install

# Create .env file
cp .env.example .env
# Edit .env with your API keys

node server.js
```

### 3. Access Dashboard
Open `http://localhost:3000`

### 4. Deploy to Render
Click the button below or use the included `render.yaml`:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## 📡 API Endpoints

### Core
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events` | SSE | Real-time events (logs, tasks) |
| `/api/command` | POST | Send command to team |
| `/api/status` | GET | System status |
| `/api/tasks` | GET | List tasks |
| `/api/task/:id` | GET | Get specific task |
| `/api/logs` | GET | Activity logs |
| `/api/memory` | GET | Team memory |
| `/api/toggle` | POST | Pause/resume team |

### Social Media
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/social/post` | POST | Create/schedule post |
| `/api/social/calendar` | GET | Content calendar |

### Email
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/email/send` | POST | Send email |
| `/api/email/template` | POST | Add template |

### Crypto
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/crypto/price/:symbol` | GET | Get real-time price |
| `/api/crypto/analyze/:symbol` | GET | Technical analysis (SMA, RSI, MACD) |
| `/api/crypto/alert` | POST | Set price alert |

### Media
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/media/generate` | POST | Generate image/video/thumbnail/logo |

### Scraping
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scraper/article` | POST | Scrape article |
| `/api/scraper/products` | POST | Scrape products |

### Translation
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/translate` | POST | Translate text (Google, DeepL, or Gemini fallback) |
| `/api/translate/languages` | GET | Supported languages |

### Security
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/security/scan` | POST | Scan for threats |
| `/api/security/alerts` | GET | Security alerts |
| `/api/security/stats` | GET | Security stats |

## 🔌 Real-Time Features

- **SSE (Server-Sent Events)**: Live log streaming, task progress updates
- **Agent Activation Visuals**: Cards glow when agents are actively working
- **Toast Notifications**: Instant feedback on commands
- **Auto-Reconnect**: Dashboard reconnects if connection drops

## 🔄 Autonomous Mode

The team runs a self-prompting loop every 5 minutes:
- Checks memory for pending tasks
- Identifies trends and opportunities
- Initiates proactive work
- Never sleeps

## 💡 Example Commands

- `"Build a React todo app with dark mode"`
- `"Research quantum computing and write a blog post"`
- `"Analyze BTC price and suggest trades"`
- `"Create 5 Twitter posts about AI trends"`
- `"Scrape product prices from Amazon"`
- `"Translate my website to Spanish"`
- `"Generate a logo for my startup"`
- `"Send weekly report email to team"`
- `"Monitor crypto prices and alert on 10% moves"`
- `"Create a marketing strategy for my SaaS"`

## 📄 License

MIT - Build something amazing!
