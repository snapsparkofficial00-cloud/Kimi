
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SelfImprover {
  constructor(projectRoot = path.join(__dirname, '..')) {
    this.projectRoot = projectRoot;
    this.memoryFile = path.join(projectRoot, '.ai-memory.json');
    this.logFile = path.join(projectRoot, '.ai-improvements.log');
    this.loadMemory();
  }

  loadMemory() {
    try {
      this.memory = JSON.parse(fs.readFileSync(this.memoryFile, 'utf8'));
    } catch {
      this.memory = { 
        improvements: [], 
        bugsFixed: [], 
        lastScan: null,
        scanCount: 0 
      };
    }
  }

  saveMemory() {
    fs.writeFileSync(this.memoryFile, JSON.stringify(this.memory, null, 2));
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(this.logFile, logEntry);
    console.log(`🤖 SelfImprover: ${message}`);
  }

  getAllJsFiles() {
    const files = [];
    const walk = (dir) => {
      fs.readdirSync(dir).forEach(f => {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
          if (!f.startsWith('.') && f !== 'node_modules') walk(full);
        } else if (f.endsWith('.js')) {
          files.push(full);
        }
      });
    };
    walk(this.projectRoot);
    return files;
  }

  detectBugs() {
    const files = this.getAllJsFiles();
    const bugs = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(this.projectRoot, file);

      const undefinedVarMatches = content.match(/if\s*\(\s*(\w+)\s*\./g);
      if (undefinedVarMatches) {
        undefinedVarMatches.forEach(match => {
          const varName = match.match(/if\s*\(\s*(\w+)/)[1];
          const declared = new RegExp(`(const|let|var)\s+${varName}\s*=`).test(content) ||
                          new RegExp(`let\s+${varName}\s*;`).test(content);
          if (!declared && !['process', 'console', 'req', 'res', 'app', 'module', 'exports', 'require', 'JSON', 'Date', 'Math', 'Object', 'Array', 'String', 'Number'].includes(varName)) {
            bugs.push({
              file: relPath,
              line: this.findLineNumber(content, match),
              type: 'undefined_variable',
              severity: 'critical',
              description: `Variable '${varName}' is used but never defined`,
              fix: `Add 'let ${varName} = { connected: false };' before using it`
            });
          }
        });
      }

      const asyncFunctions = content.match(/async\s+function\s+\w+\s*\([^)]*\)\s*\{/g) || [];
      asyncFunctions.forEach(func => {
        const funcName = func.match(/async\s+function\s+(\w+)/)[1];
        const funcStart = content.indexOf(func);
        const funcEnd = this.findFunctionEnd(content, funcStart);
        const funcBody = content.slice(funcStart, funcEnd);

        if (!funcBody.includes('try') && !funcBody.includes('catch') && funcBody.includes('await')) {
          bugs.push({
            file: relPath,
            line: this.findLineNumber(content, func),
            type: 'missing_error_handling',
            severity: 'high',
            description: `Async function '${funcName}' has no try/catch`,
            fix: `Wrap await calls in try/catch blocks`
          });
        }
      });

      if (content.includes('console.log') && !file.includes('test') && !relPath.includes('dashboard')) {
        const logMatches = content.match(/console\.log\(/g) || [];
        bugs.push({
          file: relPath,
          line: this.findLineNumber(content, 'console.log'),
          type: 'production_logging',
          severity: 'low',
          description: `${logMatches.length} console.log statements in production code`,
          fix: 'Replace with a proper logger module'
        });
      }

      if (/api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i.test(content) && !file.includes('.env')) {
        bugs.push({
          file: relPath,
          line: this.findLineNumber(content, 'api_key'),
          type: 'hardcoded_secret',
          severity: 'critical',
          description: 'Possible hardcoded API key detected',
          fix: 'Move to environment variables (.env file)'
        });
      }

      const thenMatches = content.match(/\.then\(/g) || [];
      if (thenMatches.length > 2) {
        bugs.push({
          file: relPath,
          line: this.findLineNumber(content, '.then('),
          type: 'callback_hell',
          severity: 'medium',
          description: 'Nested promises detected - hard to maintain',
          fix: 'Convert to async/await pattern'
        });
      }
    }

    return bugs;
  }

  async commitChanges(message) {
    try {
      execSync('git add .', { cwd: this.projectRoot, stdio: 'ignore' });
      const status = execSync('git status --porcelain', { cwd: this.projectRoot, encoding: 'utf8' });

      if (status.trim()) {
        execSync(`git commit -m "🤖 AI Agent: ${message}"`, { 
          cwd: this.projectRoot, 
          stdio: 'ignore' 
        });
        execSync('git push origin main --force', { 
          cwd: this.projectRoot, 
          stdio: 'ignore' 
        });
        this.log(`📤 Committed and pushed: ${message}`);
        return true;
      } else {
        this.log('ℹ️ No changes to commit');
        return false;
      }
    } catch (e) {
      this.log(`❌ Git error: ${e.message}`);
      return false;
    }
  }

  async run(fullCycle = true) {
    this.log('🚀 Starting self-improvement cycle...');
    this.memory.scanCount++;
    this.memory.lastScan = new Date().toISOString();

    this.log('🔍 Scanning for bugs...');
    const bugs = this.detectBugs();
    this.log(`Found ${bugs.length} issues (${bugs.filter(b => b.severity === 'critical').length} critical)`);

    if (bugs.length > 0) {
      this.log('🔧 Auto-fixing bugs...');
      const fixed = await this.fixBugs(bugs);
      this.log(`Fixed ${fixed} bugs automatically`);
    }

    if (fullCycle) {
      this.log('✨ Improving code quality...');
      const improved = await this.improveCode();
      this.log(`Improved ${improved} files`);
    }

    if (fullCycle) {
      await this.commitChanges(`Auto-fix ${bugs.length} issues, improve ${this.memory.improvements.length} files`);
    }

    this.log('✅ Self-improvement cycle complete');
    return {
      bugsFound: bugs.length,
      bugsFixed: this.memory.bugsFixed.length,
      improvements: this.memory.improvements.length,
      lastScan: this.memory.lastScan
    };
  }

  getStatus() {
    return {
      scanCount: this.memory.scanCount,
      lastScan: this.memory.lastScan,
      bugsFixed: this.memory.bugsFixed.length,
      improvements: this.memory.improvements.length,
      isRunning: false
    };
  }
}

module.exports = SelfImprover;
 
