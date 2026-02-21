/**
 * Email integration using Resend API
 * (More reliable on cloud platforms than SMTP)
 */

const { RESEND_API_KEY, EMAIL_DEFAULT_TO } = process.env;

/**
 * Send an email using Resend API
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
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'JarvisBot <onboarding@resend.dev>',
        to: [to],
        subject,
        [isHtml ? 'html' : 'text']: body,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return {
        success: false,
        error: data.message || 'Failed to send email',
      };
    }

    console.log('Email sent successfully:', data.id);
    return {
      success: true,
      messageId: data.id,
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
  return !!RESEND_API_KEY;
}

module.exports = {
  sendEmail,
  isEmailEnabled,
};
