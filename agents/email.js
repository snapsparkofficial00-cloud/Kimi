const nodemailer = require('nodemailer');

class EmailAgent {
  constructor(config = {}) {
    this.transporter = nodemailer.createTransport({
      host: config.smtpHost || 'smtp.gmail.com',
      port: config.smtpPort || 587,
      secure: config.secure || false,
      auth: {
        user: config.user,
        pass: config.pass
      }
    });
    this.sentEmails = [];
    this.templates = new Map();
  }

  async sendEmail({ to, subject, body, html = null, attachments = [] }) {
    try {
      const info = await this.transporter.sendMail({
        from: this.transporter.options.auth.user,
        to,
        subject,
        text: body,
        html: html || body,
        attachments
      });

      this.sentEmails.push({
        id: info.messageId,
        to,
        subject,
        sentAt: new Date(),
        status: 'sent'
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendBulk(emails) {
    const results = [];
    for (const email of emails) {
      const result = await this.sendEmail(email);
      results.push(result);
      await this.delay(1000); // Rate limiting
    }
    return results;
  }

  addTemplate(name, subject, body) {
    this.templates.set(name, { subject, body });
  }

  async sendTemplate(to, templateName, variables = {}) {
    const template = this.templates.get(templateName);
    if (!template) return { success: false, error: 'Template not found' };

    let subject = template.subject;
    let body = template.body;

    for (const [key, value] of Object.entries(variables)) {
      subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), value);
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return this.sendEmail({ to, subject, body });
  }

  async readEmails(imapConfig, limit = 10) {
    // Requires imap package for reading emails
    const Imap = require('imap');
    const { simpleParser } = require('mailparser');

    return new Promise((resolve, reject) => {
      const imap = new Imap(imapConfig);
      const emails = [];

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) return reject(err);

          const f = imap.seq.fetch(`${Math.max(1, box.messages.total - limit + 1)}:*`, {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT']
          });

          f.on('message', (msg) => {
            msg.on('body', (stream) => {
              simpleParser(stream, (err, parsed) => {
                if (!err) emails.push(parsed);
              });
            });
          });

          f.once('error', reject);
          f.once('end', () => {
            imap.end();
            resolve(emails);
          });
        });
      });

      imap.once('error', reject);
      imap.connect();
    });
  }

  getSentHistory() {
    return this.sentEmails;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = EmailAgent;
