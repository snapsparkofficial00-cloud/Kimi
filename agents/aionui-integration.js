const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

/**
 * AionUi Integration for NeuroSwarm AI
 * 
 * AionUi is a free, open-source Cowork desktop app that unifies multiple
 * AI agents (Claude Code, Codex, Qwen Code, OpenClaw, etc.) under one interface.
 * 
 * This integration allows NeuroSwarm to:
 * - Detect and communicate with AionUi's built-in Aion CLI (aionrs)
 * - Leverage AionUi's MCP (Model Context Protocol) unified management
 * - Use AionUi's Team Mode for coordinated multi-agent collaboration
 * - Access AionUi's OfficeCLI for PPT/DOCX/XLSX generation
 * - Send commands to AionUi agents via ACP (Agent Communication Protocol)
 * - Receive results from AionUi's parallel agent execution
 * 
 * Sources:
 * - GitHub: https://github.com/iofficeai/aionui
 * - Docs: https://github.com/iOfficeAI/AionUi/wiki
 */

class AionUiIntegration {
  constructor(config = {}) {
    this.aionuiPath = config.aionuiPath || this.findAionUiPath();
    this.aionrsPath = config.aionrsPath || this.findAionrsPath();
    this.mcpConfigPath = config.mcpConfigPath || path.join(process.env.HOME || process.env.USERPROFILE, '.aionui', 'mcp.json');
    this.workspacePath = config.workspacePath || './workspace/aionui';
    this.acpEndpoint = config.acpEndpoint || 'http://localhost:8765'; // AionUi ACP default port
    this.enabled = false;
    this.connectedAgents = new Map();
    this.teamMode = config.teamMode !== false;
    this.leaderAgent = config.leaderAgent || 'commander';
  }

  // Auto-detect AionUi installation paths
  findAionUiPath() {
    const possiblePaths = [
      process.env.AIONUI_PATH,
      '/Applications/AionUi.app/Contents/MacOS/AionUi',
      path.join(process.env.HOME || '', 'Applications', 'AionUi.app', 'Contents', 'MacOS', 'AionUi'),
      'C:\\Program Files\\AionUi\\AionUi.exe',
      'C:\\Users\\' + (process.env.USERNAME || '') + '\\AppData\\Local\\AionUi\\AionUi.exe',
      '/usr/bin/aionui',
      '/usr/local/bin/aionui',
      path.join(process.env.HOME || '', '.local', 'bin', 'aionui'),
    ];
    return possiblePaths.find(p => p && this.fileExists(p)) || null;
  }

  findAionrsPath() {
    const possiblePaths = [
      process.env.AIONRS_PATH,
      '/Applications/AionUi.app/Contents/Resources/aionrs',
      path.join(process.env.HOME || '', '.aionui', 'bin', 'aionrs'),
      'C:\\Program Files\\AionUi\\resources\\aionrs.exe',
      '/usr/local/bin/aionrs',
      path.join(process.env.HOME || '', '.local', 'bin', 'aionrs'),
    ];
    return possiblePaths.find(p => p && this.fileExists(p)) || null;
  }

  fileExists(filePath) {
    try {
      require('fs').accessSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async initialize() {
    // Check if AionUi is installed
    if (!this.aionuiPath && !this.aionrsPath) {
      console.log('[AionUi] Not detected. Install from https://github.com/iofficeai/aionui');
      console.log('[AionUi] NeuroSwarm will run in standalone mode.');
      return { enabled: false, message: 'AionUi not installed' };
    }

    this.enabled = true;
    console.log(`[AionUi] Detected at: ${this.aionuiPath || this.aionrsPath}`);

    // Ensure workspace exists
    await fs.mkdir(this.workspacePath, { recursive: true });

    // Detect available agents
    const agents = await this.detectAgents();

    // Sync MCP configuration
    await this.syncMcpConfig();

    return {
      enabled: true,
      aionuiPath: this.aionuiPath,
      aionrsPath: this.aionrsPath,
      detectedAgents: agents,
      teamMode: this.teamMode
    };
  }

  async detectAgents() {
    const agents = [];
    const cliTools = [
      { name: 'Claude Code', cmd: 'claude', type: 'cli' },
      { name: 'Codex', cmd: 'codex', type: 'cli' },
      { name: 'Qwen Code', cmd: 'qwen-code', type: 'cli' },
      { name: 'OpenClaw', cmd: 'openclaw', type: 'cli' },
      { name: 'Goose AI', cmd: 'goose', type: 'cli' },
      { name: 'Kimi CLI', cmd: 'kimi', type: 'cli' },
      { name: 'Gemini CLI', cmd: 'gemini', type: 'cli' },
      { name: 'Cursor Agent', cmd: 'cursor-agent', type: 'cli' },
      { name: 'Augment Code', cmd: 'augment', type: 'cli' },
      { name: 'CodeBuddy', cmd: 'codebuddy', type: 'cli' },
      { name: 'OpenCode', cmd: 'opencode', type: 'cli' },
      { name: 'Factory Droid', cmd: 'factory-droid', type: 'cli' },
      { name: 'Qoder', cmd: 'qoder', type: 'cli' },
      { name: 'Mistral Vibe', cmd: 'mistral-vibe', type: 'cli' },
      { name: 'Nanobot', cmd: 'nanobot', type: 'cli' },
      { name: 'Aion CLI (aionrs)', cmd: 'aionrs', type: 'builtin' },
    ];

    for (const tool of cliTools) {
      try {
        const result = await this.checkCommand(tool.cmd);
        if (result.found) {
          agents.push({
            name: tool.name,
            command: tool.cmd,
            type: tool.type,
            version: result.version,
            path: result.path
          });
          this.connectedAgents.set(tool.name, result);
        }
      } catch (e) {
        // Agent not found, skip
      }
    }

    console.log(`[AionUi] Detected ${agents.length} agents: ${agents.map(a => a.name).join(', ')}`);
    return agents;
  }

  checkCommand(cmd) {
    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32';
      const checkCmd = isWindows ? `where ${cmd}` : `which ${cmd}`;

      const child = spawn(isWindows ? 'cmd' : 'sh', [isWindows ? '/c' : '-c', checkCmd], {
        timeout: 5000,
        env: process.env
      });

      let stdout = '';
      child.stdout.on('data', (data) => { stdout += data.toString(); });

      child.on('close', (code) => {
        if (code === 0 && stdout.trim()) {
          resolve({ found: true, path: stdout.trim().split('\n')[0], version: null });
        } else {
          resolve({ found: false });
        }
      });

      child.on('error', () => resolve({ found: false }));
    });
  }

  async syncMcpConfig() {
    try {
      // Read existing MCP config or create default
      let mcpConfig = { mcpServers: {} };
      try {
        const existing = await fs.readFile(this.mcpConfigPath, 'utf8');
        mcpConfig = JSON.parse(existing);
      } catch {
        // File doesn't exist or is invalid, use default
      }

      // Add NeuroSwarm MCP server
      mcpConfig.mcpServers = mcpConfig.mcpServers || {};
      mcpConfig.mcpServers.neuroswarm = {
        command: 'node',
        args: [path.join(__dirname, 'mcp-server.js')],
        env: {
          NEUROSWARM_API_URL: 'http://localhost:3000'
        }
      };

      await fs.mkdir(path.dirname(this.mcpConfigPath), { recursive: true });
      await fs.writeFile(this.mcpConfigPath, JSON.stringify(mcpConfig, null, 2));

      console.log('[AionUi] MCP config synced. NeuroSwarm server registered.');
      return true;
    } catch (error) {
      console.error('[AionUi] Failed to sync MCP config:', error.message);
      return false;
    }
  }

  // Execute a task using AionUi's Team Mode
  async executeTeamTask(task, agents) {
    if (!this.enabled || !this.teamMode) {
      return { success: false, error: 'AionUi Team Mode not available' };
    }

    const teamConfig = {
      leader: this.leaderAgent,
      teammates: agents.map(a => ({
        name: a.name,
        command: a.command,
        model: a.model || 'gemini-1.5-pro'
      })),
      task: task.request,
      workspace: this.workspacePath
    };

    try {
      // Write team task to shared workspace
      const taskFile = path.join(this.workspacePath, `team-task-${task.id}.json`);
      await fs.writeFile(taskFile, JSON.stringify(teamConfig, null, 2));

      // Execute via aionrs if available
      if (this.aionrsPath) {
        return await this.runAionrsTeamTask(taskFile);
      }

      // Fallback: execute agents sequentially via spawn
      return await this.runSequentialTeamTask(teamConfig);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async runAionrsTeamTask(taskFile) {
    return new Promise((resolve, reject) => {
      const child = spawn(this.aionrsPath, ['team', 'run', taskFile], {
        cwd: this.workspacePath,
        env: { ...process.env, AIONUI_WORKSPACE: this.workspacePath }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output: stdout, taskFile });
        } else {
          resolve({ success: false, error: stderr || 'Team task failed', output: stdout });
        }
      });

      child.on('error', (err) => reject(err));
    });
  }

  async runSequentialTeamTask(config) {
    const results = [];
    for (const agent of config.teammates) {
      try {
        const result = await this.runAgentCommand(agent.command, config.task);
        results.push({ agent: agent.name, result });
      } catch (error) {
        results.push({ agent: agent.name, error: error.message });
      }
    }
    return { success: true, results, mode: 'sequential' };
  }

  runAgentCommand(command, task) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, ['--task', task], {
        cwd: this.workspacePath,
        timeout: 120000,
        env: process.env
      });

      let stdout = '';
      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.on('close', (code) => {
        resolve({ exitCode: code, output: stdout });
      });
      child.on('error', reject);
    });
  }

  // Use AionUi's OfficeCLI for document generation
  async generateOfficeDocument(type, content, options = {}) {
    if (!this.enabled) {
      return { success: false, error: 'AionUi not available. Install from https://github.com/iofficeai/aionui' };
    }

    const officeCli = path.join(path.dirname(this.aionuiPath || ''), 'officecli');
    if (!this.fileExists(officeCli)) {
      return { success: false, error: 'OfficeCLI not found in AionUi installation' };
    }

    const outputFile = path.join(this.workspacePath, `${options.filename || 'output'}.${type}`);

    try {
      const result = await new Promise((resolve, reject) => {
        const child = spawn(officeCli, [
          type,
          '--input', '-',
          '--output', outputFile,
          '--style', options.style || 'professional',
          '--theme', options.theme || 'default'
        ], {
          cwd: this.workspacePath
        });

        child.stdin.write(JSON.stringify(content));
        child.stdin.end();

        let stdout = '';
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.on('close', (code) => {
          if (code === 0) resolve({ success: true, file: outputFile });
          else resolve({ success: false, error: stdout });
        });
        child.on('error', reject);
      });

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get AionUi status and connected agents
  getStatus() {
    return {
      enabled: this.enabled,
      aionuiPath: this.aionuiPath,
      aionrsPath: this.aionrsPath,
      teamMode: this.teamMode,
      connectedAgents: Array.from(this.connectedAgents.keys()),
      workspacePath: this.workspacePath,
      mcpConfigPath: this.mcpConfigPath
    };
  }

  // Health check
  async healthCheck() {
    if (!this.enabled) return { healthy: false, reason: 'Not initialized' };

    try {
      const agents = await this.detectAgents();
      return {
        healthy: true,
        agentsDetected: agents.length,
        agents: agents.map(a => a.name)
      };
    } catch (error) {
      return { healthy: false, reason: error.message };
    }
  }
}

module.exports = AionUiIntegration;
