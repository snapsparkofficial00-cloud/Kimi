const crypto = require('crypto');
const fs = require('fs').promises;

class SecurityAgent {
  constructor(config = {}) {
    this.alertThreshold = config.alertThreshold || 5;
    this.blockDuration = config.blockDuration || 3600000; // 1 hour
    this.logFile = config.logFile || './logs/security.log';
    this.attempts = new Map();
    this.blocked = new Set();
    this.alerts = [];
  }

  hashPassword(password, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex');
    }
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return { hash, salt };
  }

  verifyPassword(password, hash, salt) {
    const computed = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return computed === hash;
  }

  generateToken(payload, secret, expiresIn = '24h') {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + this.parseDuration(expiresIn) })).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
  }

  verifyToken(token, secret) {
    try {
      const [header, body, signature] = token.split('.');
      const expectedSig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');

      if (signature !== expectedSig) return { valid: false, error: 'Invalid signature' };

      const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
      if (payload.exp && payload.exp < Date.now()) return { valid: false, error: 'Token expired' };

      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  parseDuration(duration) {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 86400000;
    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * multipliers[unit];
  }

  checkRateLimit(identifier, maxAttempts = 5, windowMs = 60000) {
    const now = Date.now();

    if (this.blocked.has(identifier)) {
      return { allowed: false, reason: 'blocked' };
    }

    const attempts = this.attempts.get(identifier) || [];
    const recentAttempts = attempts.filter(t => now - t < windowMs);

    if (recentAttempts.length >= maxAttempts) {
      this.blocked.add(identifier);
      setTimeout(() => this.blocked.delete(identifier), this.blockDuration);
      this.logAlert('rate_limit_exceeded', { identifier, attempts: recentAttempts.length });
      return { allowed: false, reason: 'rate_limited', retryAfter: this.blockDuration };
    }

    recentAttempts.push(now);
    this.attempts.set(identifier, recentAttempts);
    return { allowed: true, remaining: maxAttempts - recentAttempts.length };
  }

  sanitizeInput(input, options = {}) {
    let sanitized = String(input);

    if (options.stripHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    if (options.escapeSpecial) {
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }

    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    return sanitized;
  }

  validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  scanForThreats(data) {
    const threats = [];
    const stringData = JSON.stringify(data);

    // SQL Injection patterns
    const sqlPatterns = [/union\s+select/i, /insert\s+into/i, /delete\s+from/i, /drop\s+table/i];
    for (const pattern of sqlPatterns) {
      if (pattern.test(stringData)) threats.push({ type: 'sql_injection', pattern: pattern.source });
    }

    // XSS patterns
    const xssPatterns = [/<script>/i, /javascript:/i, /on\w+\s*=/i];
    for (const pattern of xssPatterns) {
      if (pattern.test(stringData)) threats.push({ type: 'xss', pattern: pattern.source });
    }

    // Command injection
    const cmdPatterns = [/;\s*rm\s+-rf/i, /\|\s*bash/i, /\$\(.*\)/i];
    for (const pattern of cmdPatterns) {
      if (pattern.test(stringData)) threats.push({ type: 'command_injection', pattern: pattern.source });
    }

    return {
      safe: threats.length === 0,
      threats,
      riskLevel: threats.length === 0 ? 'low' : threats.length > 2 ? 'high' : 'medium'
    };
  }

  async auditLog(action, details) {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      details,
      ip: details.ip,
      userAgent: details.userAgent
    };

    this.alerts.push(entry);

    try {
      await fs.mkdir('./logs', { recursive: true });
      await fs.appendFile(this.logFile, JSON.stringify(entry) + '\n');
    } catch (error) {
      console.error('Failed to write audit log:', error.message);
    }

    return entry;
  }

  logAlert(type, details) {
    const alert = {
      id: Date.now(),
      type,
      details,
      timestamp: new Date().toISOString(),
      severity: this.calculateSeverity(type, details)
    };

    this.alerts.push(alert);

    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    return alert;
  }

  calculateSeverity(type, details) {
    const severityMap = {
      'rate_limit_exceeded': 'medium',
      'sql_injection': 'critical',
      'xss': 'critical',
      'command_injection': 'critical',
      'unauthorized_access': 'high',
      'brute_force': 'high'
    };
    return severityMap[type] || 'low';
  }

  getAlerts(severity = null, limit = 50) {
    let filtered = this.alerts;
    if (severity) filtered = filtered.filter(a => a.severity === severity);
    return filtered.slice(-limit).reverse();
  }

  getStats() {
    return {
      totalAlerts: this.alerts.length,
      bySeverity: this.alerts.reduce((acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      }, {}),
      blockedIPs: this.blocked.size,
      activeRateLimits: this.attempts.size
    };
  }

  encrypt(text, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedData, key) {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

module.exports = SecurityAgent;
