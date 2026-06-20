# NeuroSwarm AI v2.1 🤖

## 15-Agent Multi-Model AI System with Self-Improvement

NeuroSwarm AI is a production-ready multi-agent system featuring 15 specialized AI agents that work together to handle complex tasks. The system includes a **Self-Improving Agent** that automatically scans code, fixes bugs, and improves quality.

## 🚀 Features

- **15 Specialized Agents**: Commander, Researcher, Coder, Creative, Analyst, Executor, Critic, Social Media, Email, Crypto, Media, Scraper, Translator, Security, GLM-5.2 Engineer
- **Self-Improving Agent**: Automatically detects bugs, fixes code, and commits improvements
- **Multi-Model Support**: Works with Gemini, OpenRouter, Groq, and Ollama
- **Real-time Dashboard**: Monitor all agents and system status
- **24/7 Autonomous Operation**: Scheduled self-improvement cycles

## 📦 Installation

```bash
npm install
```

## 🔧 Configuration

1. Copy `.env.example` to `.env`
2. Add your API keys (at least one):
   - [Google AI Studio](https://aistudio.google.com/app/apikey) - Free
   - [OpenRouter](https://openrouter.ai/keys) - Free
   - [Groq](https://console.groq.com/keys) - Free (fastest)

## 🏃 Running

```bash
npm start
```

## 🤖 Self-Improvement API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/self-improve/status` | GET | Check improvement status |
| `/api/self-improve/run` | POST | Run full improvement cycle |
| `/api/self-improve/fix-bugs` | POST | Auto-fix detected bugs |

## 🌐 Deploy to Render

Click the button below to deploy:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## 📄 License

MIT License - snapsparkofficial00-cloud
