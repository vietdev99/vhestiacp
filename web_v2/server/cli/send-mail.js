#!/usr/bin/env node

import fs from 'fs';
import nodemailer from 'nodemailer';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Parse arguments
const args = process.argv.slice(2);
let subject = 'No Subject';
let fromEmail = '';
let fromName = '';
let toEmail = '';
let debug = false;

// Basic argument parsing matching mail-wrapper.php: -s subject [email]
for (let i = 0; i < args.length; i++) {
  if (args[i] === '-s') {
    subject = args[++i];
  } else if (args[i] === '-f') {
    fromEmail = args[++i];
  } else if (args[i] === '-n') {
    fromName = args[++i];
  } else if (args[i] === '-d') {
    debug = true;
  } else if (!args[i].startsWith('-')) {
    toEmail = args[i];
  }
}

if (!toEmail) {
  if (debug) console.error('Error: No recipient email specified');
  process.exit(1);
}

// Read stdin for body
let body = '';
process.stdin.setEncoding('utf8');

process.stdin.on('readable', () => {
  const chunk = process.stdin.read();
  if (chunk !== null) {
    body += chunk;
  }
});

process.stdin.on('end', async () => {
  await sendMail();
});

async function sendMail() {
  try {
    // Read Hestia Configuration
    const hestiaConfPath = process.env.HESTIA 
      ? `${process.env.HESTIA}/conf/hestia.conf`
      : '/usr/local/vhestia/conf/hestia.conf'; // Default fallback
    
    let config = {
        USE_SERVER_SMTP: 'no',
        SERVER_SMTP_HOST: 'localhost',
        SERVER_SMTP_PORT: 587,
        SERVER_SMTP_SECURITY: '',
        SERVER_SMTP_USER: '',
        SERVER_SMTP_PASSWD: '',
        FROM_EMAIL: 'noreply@' + (process.env.HOSTNAME || 'localhost'),
        FROM_NAME: 'VHestiaCP'
    };

    if (fs.existsSync(hestiaConfPath)) {
      const content = fs.readFileSync(hestiaConfPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        // Simple parse: KEY='VALUE'
        const match = line.match(/^([A-Z_]+)='([^']*)'/);
        if (match) {
          config[match[1]] = match[2];
        }
      }
    }

    // Override from args if provided
    if (fromEmail) config.FROM_EMAIL = fromEmail;
    if (fromName) config.FROM_NAME = fromName;

    // Build Transporter
    let transporter;
    
    if (config.USE_SERVER_SMTP === 'yes') {
        // Use External SMTP
        const smtpOptions = {
            host: config.SERVER_SMTP_HOST,
            port: parseInt(config.SERVER_SMTP_PORT || '587'),
            secure: config.SERVER_SMTP_SECURITY === 'ssl', // true for 465, false for other ports
            auth: {
                user: config.SERVER_SMTP_USER,
                pass: config.SERVER_SMTP_PASSWD
            },
            tls: {
                rejectUnauthorized: false
            }
        };
        transporter = nodemailer.createTransport(smtpOptions);
    } else {
        // Use Local Sendmail (Exim/Postfix)
        transporter = nodemailer.createTransport({
            sendmail: true,
            newline: 'unix',
            path: '/usr/sbin/sendmail'
        });
    }

    // Send Mail
    const mailOptions = {
        from: `"${config.FROM_NAME}" <${config.FROM_EMAIL}>`,
        to: toEmail,
        subject: subject,
        text: body,
        // html: body // Hestia usually sends text content, but we could detect HTML
    };

    const info = await transporter.sendMail(mailOptions);
    if (debug) console.log('Message sent: %s', info.messageId);
    process.exit(0);

  } catch (error) {
    console.error('Error sending email:', error.message);
    process.exit(1);
  }
}
