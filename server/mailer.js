const nodemailer = require('nodemailer');

const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
};

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
    return null;
  }
  transporter = nodemailer.createTransport(smtpConfig);
  return transporter;
}

async function sendEmailNotification({ subject, html }) {
  const t = getTransporter();
  if (!t) {
    console.log('[MAILER] SMTP not configured, skipping email notification');
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'vheora.co@gmail.com';
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@vheora.co';

  try {
    await t.sendMail({
      from: `"VHEORA" <${fromEmail}>`,
      to: adminEmail,
      subject,
      html
    });
    console.log(`[MAILER] Email sent: ${subject}`);
  } catch (err) {
    console.error('[MAILER] Failed to send email:', err.message);
  }
}

module.exports = { sendEmailNotification };
