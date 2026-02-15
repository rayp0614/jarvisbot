/**
 * Email integration using Gmail SMTP
 */
const nodemailer = require('nodemailer');

const {
  GMAIL_USER,
  GMAIL_APP_PASSWORD,
  EMAIL_DEFAULT_TO,
} = process.env;

/**
 * Create Gmail transporter with explicit SMTP settings
 * (More reliable on cloud platforms like Railway)
 */
function getTransporter() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error('Gmail credentials not configured');
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
    connectionTimeout: 30000, // 30 seconds
    greetingTimeout: 30000,
    socketTimeout: 60000, // 60 seconds for large emails
    pool: false, // Disable pooling for serverless environments
  });
}

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email (defaults to EMAIL_DEFAULT_TO)
 * @param {string} options.subject - Email subject
 * @param {string} options.body - Email body (plain text or HTML)
 * @param {boolean} options.isHtml - Whether body is HTML (default: false)
 * @returns {Object} Send result
 */
async function sendEmail({
  to = EMAIL_DEFAULT_TO,
  subject,
  body,
  isHtml = false,
}) {
  const transporter = getTransporter();

  const mailOptions = {
    from: `JarvisBot <${GMAIL_USER}>`,
    to,
    subject,
    [isHtml ? 'html' : 'text']: body,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
      to,
      subject,
    };
  } catch (error) {
    console.error('Failed to send email:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if email is enabled
 */
function isEmailEnabled() {
  return !!(GMAIL_USER && GMAIL_APP_PASSWORD);
}

module.exports = {
  sendEmail,
  isEmailEnabled,
};
