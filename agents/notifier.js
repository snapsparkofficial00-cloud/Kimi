const axios = require('axios');

class Notifier {
  constructor() {
    this.channels = [];
  }

  addWebhook(url, headers = {}) {
    this.channels.push({ type: 'webhook', url, headers });
  }

  addEmail(config) {
    this.channels.push({ type: 'email', ...config });
  }

  async send(message, priority = 'normal') {
    const results = [];

    for (const channel of this.channels) {
      try {
        if (channel.type === 'webhook') {
          await axios.post(channel.url, { 
            message, 
            priority, 
            timestamp: new Date().toISOString() 
          }, { 
            headers: channel.headers,
            timeout: 10000 
          });
          results.push({ channel: 'webhook', status: 'sent' });
        } else if (channel.type === 'email') {
          const nodemailer = require('nodemailer');
          const transporter = nodemailer.createTransport({
            host: channel.smtpHost || 'smtp.gmail.com',
            port: channel.smtpPort || 587,
            secure: false,
            auth: { user: channel.user, pass: channel.pass }
          });
          await transporter.sendMail({
            from: channel.user,
            to: channel.to || channel.user,
            subject: `[NeuroSwarm] ${priority.toUpperCase()} Alert`,
            text: message
          });
          results.push({ channel: 'email', status: 'sent' });
        }
      } catch (error) {
        results.push({ channel: channel.type, status: 'failed', error: error.message });
      }
    }

    return results;
  }

  async alert(message) {
    console.log(`[ALERT] ${message}`);
    return this.send(message, 'high');
  }
}

module.exports = Notifier;
