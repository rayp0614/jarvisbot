const express = require('express');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { createJob } = require('./tools/create-job');
const { loadCrons } = require('./cron');
const { loadTriggers } = require('./triggers');
const { setWebhook, sendMessage, formatJobNotification, downloadFile, reactToMessage, startTypingIndicator } = require('./tools/telegram');
const { isWhisperEnabled, transcribeAudio } = require('./tools/openai');
const { chat } = require('./claude');
const { toolDefinitions, toolExecutors } = require('./claude/tools');
const { getHistory, updateHistory } = require('./claude/conversation');
const { githubApi, getJobStatus } = require('./tools/github');
const { getApiKey } = require('./claude');
const { render_md } = require('./utils/render-md');
const { sendEmail, isEmailEnabled } = require('./tools/email');

// Dashboard API routes
const { setupAuthRoutes, authMiddleware } = require('./api/auth');
const { setupDashboardRoutes } = require('./api/dashboard');
const { setupCronsRoutes } = require('./api/crons');
const { setupTriggersRoutes } = require('./api/triggers');
const { setupJobsRoutes } = require('./api/jobs');
const { setupSalesRoutes } = require('./api/sales');
const { setupLeadFinderRoutes } = require('./api/lead-finder');

// Database (lazy load to handle missing better-sqlite3 gracefully)
let db = null;
try {
  db = require('./db');
} catch (err) {
  console.warn('SQLite not available - dashboard features disabled. Run: npm install better-sqlite3');
}

const app = express();

app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for React
}));
app.use(express.json());

const { API_KEY, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_BOT_TOKEN, GH_WEBHOOK_SECRET, GH_OWNER, GH_REPO, TELEGRAM_CHAT_ID, TELEGRAM_VERIFICATION } = process.env;

// Bot token from env, can be overridden by /telegram/register
let telegramBotToken = TELEGRAM_BOT_TOKEN || null;

// Serve React dashboard FIRST (before auth middleware)
const webDistPath = path.join(__dirname, 'web', 'dist');
if (fs.existsSync(webDistPath)) {
  app.use(express.static(webDistPath));
}

// Routes that have their own authentication
const PUBLIC_ROUTES = ['/telegram/webhook', '/github/webhook', '/api/auth/login'];

// Global x-api-key auth (skip for routes with their own auth, /api/*, and frontend routes)
app.use((req, res, next) => {
  if (PUBLIC_ROUTES.includes(req.path)) {
    return next();
  }
  // Dashboard API routes use JWT auth, not x-api-key
  if (req.path.startsWith('/api/')) {
    return next();
  }
  // Skip auth for frontend SPA routes (served by React)
  const isBackendRoute = req.path.startsWith('/telegram/') ||
                         req.path.startsWith('/github/') ||
                         req.path.startsWith('/jobs/') ||
                         req.path === '/webhook' ||
                         req.path === '/ping';
  if (!isBackendRoute) {
    return next(); // Let SPA fallback handle it
  }
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Setup dashboard API routes (if database is available)
if (db) {
  setupAuthRoutes(app);
  setupDashboardRoutes(app, authMiddleware, db);
  setupCronsRoutes(app, authMiddleware, db);
  setupTriggersRoutes(app, authMiddleware, db);
  setupJobsRoutes(app, authMiddleware, db);
  setupSalesRoutes(app, authMiddleware);
  setupLeadFinderRoutes(app, authMiddleware);
}

app.use(loadTriggers());

// GET /ping - health check endpoint
app.get('/ping', (req, res) => {
  res.json({ message: 'Pong!' });
});

// GET /jobs/status - get running job status
app.get('/jobs/status', async (req, res) => {
  try {
    const result = await getJobStatus(req.query.job_id);
    res.json(result);
  } catch (err) {
    console.error('Failed to get job status:', err);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// POST /webhook - create a new job
app.post('/webhook', async (req, res) => {
  const { job } = req.body;
  if (!job) return res.status(400).json({ error: 'Missing job field' });

  try {
    const result = await createJob(job);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// POST /telegram/register - register a Telegram webhook
app.post('/telegram/register', async (req, res) => {
  const { bot_token, webhook_url } = req.body;
  if (!bot_token || !webhook_url) {
    return res.status(400).json({ error: 'Missing bot_token or webhook_url' });
  }

  try {
    const result = await setWebhook(bot_token, webhook_url, TELEGRAM_WEBHOOK_SECRET);
    telegramBotToken = bot_token;
    res.json({ success: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

// POST /telegram/webhook - receive Telegram updates
app.post('/telegram/webhook', async (req, res) => {
  // Validate secret token if configured
  // Always return 200 to prevent Telegram retry loops on mismatch
  if (TELEGRAM_WEBHOOK_SECRET) {
    const headerSecret = req.headers['x-telegram-bot-api-secret-token'];
    if (headerSecret !== TELEGRAM_WEBHOOK_SECRET) {
      return res.status(200).json({ ok: true });
    }
  }

  const update = req.body;
  const message = update.message || update.edited_message;

  if (message && message.chat && telegramBotToken) {
    const chatId = String(message.chat.id);

    let messageText = null;

    if (message.text) {
      messageText = message.text;
    }

    // Check for verification code - this works even before TELEGRAM_CHAT_ID is set
    if (TELEGRAM_VERIFICATION && messageText === TELEGRAM_VERIFICATION) {
      await sendMessage(telegramBotToken, chatId, `Your chat ID:\n<code>${chatId}</code>`);
      return res.status(200).json({ ok: true });
    }

    // Security: if no TELEGRAM_CHAT_ID configured, ignore all messages (except verification above)
    if (!TELEGRAM_CHAT_ID) {
      return res.status(200).json({ ok: true });
    }

    // Security: only accept messages from configured chat
    if (chatId !== TELEGRAM_CHAT_ID) {
      return res.status(200).json({ ok: true });
    }

    // Acknowledge receipt with a thumbs up (await so it completes before typing indicator starts)
    await reactToMessage(telegramBotToken, chatId, message.message_id).catch(() => {});

    if (message.voice) {
      // Handle voice messages
      if (!isWhisperEnabled()) {
        await sendMessage(telegramBotToken, chatId, 'Voice messages are not supported. Please set OPENAI_API_KEY to enable transcription.');
        return res.status(200).json({ ok: true });
      }

      try {
        const { buffer, filename } = await downloadFile(telegramBotToken, message.voice.file_id);
        messageText = await transcribeAudio(buffer, filename);
      } catch (err) {
        console.error('Failed to transcribe voice:', err);
        await sendMessage(telegramBotToken, chatId, 'Sorry, I could not transcribe your voice message.');
        return res.status(200).json({ ok: true });
      }
    }

    // Acknowledge receipt immediately so Telegram doesn't wait/retry
    res.status(200).json({ ok: true });

    if (messageText) {
      const stopTyping = startTypingIndicator(telegramBotToken, chatId);
      try {
        // Get conversation history and process with Claude
        const history = getHistory(chatId);
        const { response, history: newHistory } = await chat(
          messageText,
          history,
          toolDefinitions,
          toolExecutors
        );
        updateHistory(chatId, newHistory);

        // Send response (auto-splits if needed)
        await sendMessage(telegramBotToken, chatId, response);
      } catch (err) {
        console.error('Failed to process message with Claude:', err);
        await sendMessage(telegramBotToken, chatId, 'Sorry, I encountered an error processing your message.').catch(() => {});
      } finally {
        stopTyping();
      }
    }
  } else {
    // No message to process — still acknowledge
    res.status(200).json({ ok: true });
  }
});

/**
 * Extract job ID from branch name (e.g., "job/abc123" -> "abc123")
 */
function extractJobId(branchName) {
  if (!branchName || !branchName.startsWith('job/')) return null;
  return branchName.slice(4);
}

/**
 * Fetch a file from a GitHub branch and email it if it's a lead analysis
 * @param {string} jobId - The job ID
 * @param {string[]} changedFiles - List of changed files
 */
async function emailLeadAnalysisIfPresent(jobId, changedFiles) {
  if (!isEmailEnabled()) {
    console.log('Email not configured, skipping lead analysis email');
    return;
  }

  // Check if this job created lead analysis files
  const analysisFile = changedFiles?.find(f => f.includes('LEAD_ANALYSIS.md') || f.includes('EMAIL_TO_SEND.md'));
  if (!analysisFile) {
    return; // Not a lead analysis job
  }

  try {
    // Fetch the email content from GitHub
    const { GH_OWNER, GH_REPO } = process.env;
    const emailPath = `logs/${jobId}/EMAIL_TO_SEND.md`;

    const response = await githubApi(`/repos/${GH_OWNER}/${GH_REPO}/contents/${emailPath}`, {
      method: 'GET',
    });

    if (!response.content) {
      console.log('No EMAIL_TO_SEND.md found for job', jobId);
      return;
    }

    // Decode base64 content
    const emailContent = Buffer.from(response.content, 'base64').toString('utf-8');

    // Convert markdown to simple HTML
    const htmlContent = convertMarkdownToHtml(emailContent);

    // Send the email
    const recipientEmail = process.env.LEAD_RECIPIENT_EMAIL || process.env.EMAIL_DEFAULT_TO;
    if (!recipientEmail) {
      console.log('No recipient email configured');
      return;
    }

    const result = await sendEmail({
      to: recipientEmail,
      subject: `🎯 Lead Analysis Report - ${new Date().toLocaleDateString()}`,
      body: htmlContent,
      isHtml: true,
    });

    if (result.success) {
      console.log(`📧 Lead analysis emailed to ${recipientEmail}`);
    } else {
      console.error('Failed to email lead analysis:', result.error);
    }
  } catch (err) {
    console.error('Error fetching/emailing lead analysis:', err.message);
  }
}

/**
 * Simple markdown to HTML converter for emails
 */
function convertMarkdownToHtml(markdown) {
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3 style="color: #1f2937; margin-top: 24px;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="color: #111827; margin-top: 32px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="color: #111827; font-size: 24px;">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre style="background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; font-family: monospace; font-size: 13px;">$1</pre>')
    // Inline code
    .replace(/`(.*?)`/g, '<code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">$1</code>')
    // Line breaks
    .replace(/\n\n/g, '</p><p style="margin: 16px 0;">')
    .replace(/\n/g, '<br>')
    // Horizontal rules
    .replace(/^---$/gim, '<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 32px 0;">');

  // Wrap in styled container
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 24px;">🎯 Lead Analysis Report</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Generated by JarvisBot on ${new Date().toLocaleDateString()}</p>
      </div>
      <p style="margin: 16px 0;">${html}</p>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
        <p>This analysis was generated by JarvisBot AI. Always verify "no website" claims before outreach.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Summarize a completed job using Claude — returns the raw message to send
 * @param {Object} results - Job results from webhook payload
 * @param {string} results.job - Original task (job.md)
 * @param {string} results.commit_message - Final commit message
 * @param {string[]} results.changed_files - List of changed file paths
 * @param {string} results.pr_status - PR state (open, closed, merged)
 * @param {string} results.log - Agent session log (JSONL)
 * @param {string} results.pr_url - PR URL
 * @returns {Promise<string>} The message to send to Telegram
 */
async function summarizeJob(results) {
  try {
    const apiKey = getApiKey();

    // System prompt from JOB_SUMMARY.md (supports {{includes}})
    const systemPrompt = render_md(
      path.join(__dirname, '..', 'operating_system', 'JOB_SUMMARY.md')
    );

    // User message: structured job results
    const userMessage = [
      results.job ? `## Task\n${results.job}` : '',
      results.commit_message ? `## Commit Message\n${results.commit_message}` : '',
      results.changed_files?.length ? `## Changed Files\n${results.changed_files.join('\n')}` : '',
      results.pr_status ? `## PR Status\n${results.pr_status}` : '',
      results.merge_result ? `## Merge Result\n${results.merge_result}` : '',
      results.pr_url ? `## PR URL\n${results.pr_url}` : '',
      results.log ? `## Agent Log\n${results.log}` : '',
    ].filter(Boolean).join('\n\n');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.EVENT_HANDLER_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) throw new Error(`Claude API error: ${response.status}`);

    const result = await response.json();
    return (result.content?.[0]?.text || '').trim() || 'Job completed.';
  } catch (err) {
    console.error('Failed to summarize job:', err);
    return 'Job completed.';
  }
}

// POST /github/webhook - receive GitHub PR notifications
app.post('/github/webhook', async (req, res) => {
  // Validate webhook secret
  if (GH_WEBHOOK_SECRET) {
    const headerSecret = req.headers['x-github-webhook-secret-token'];
    if (headerSecret !== GH_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const event = req.headers['x-github-event'];
  const payload = req.body;

  if (event !== 'pull_request') {
    return res.status(200).json({ ok: true, skipped: true });
  }

  const pr = payload.pull_request;
  if (!pr) return res.status(200).json({ ok: true, skipped: true });

  const branchName = pr.head?.ref;
  const jobId = extractJobId(branchName);
  if (!jobId) return res.status(200).json({ ok: true, skipped: true, reason: 'not a job branch' });

  if (!TELEGRAM_CHAT_ID || !telegramBotToken) {
    console.log(`Job ${jobId} completed but no chat ID to notify`);
    return res.status(200).json({ ok: true, skipped: true, reason: 'no chat to notify' });
  }

  try {
    // All job data comes from the webhook payload — no GitHub API calls needed
    const results = payload.job_results || {};
    results.pr_url = pr.html_url;

    const message = await summarizeJob(results);

    await sendMessage(telegramBotToken, TELEGRAM_CHAT_ID, message);

    // Add the summary to chat memory so Claude has context in future conversations
    const history = getHistory(TELEGRAM_CHAT_ID);
    history.push({ role: 'assistant', content: message });
    updateHistory(TELEGRAM_CHAT_ID, history);

    // Email lead analysis if this was a lead finder job
    await emailLeadAnalysisIfPresent(jobId, results.changed_files);

    console.log(`Notified chat ${TELEGRAM_CHAT_ID} about job ${jobId.slice(0, 8)}`);

    res.status(200).json({ ok: true, notified: true });
  } catch (err) {
    console.error('Failed to process GitHub webhook:', err);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// SPA fallback - serve index.html for all non-API routes (static files served at top)
if (fs.existsSync(webDistPath)) {
  app.get('*', (req, res, next) => {
    // Don't intercept API routes or existing endpoints
    if (req.path.startsWith('/api/') ||
        req.path.startsWith('/telegram/') ||
        req.path.startsWith('/github/') ||
        req.path === '/webhook' ||
        req.path === '/ping' ||
        req.path.startsWith('/jobs/')) {
      return next();
    }
    res.sendFile(path.join(webDistPath, 'index.html'));
  });
}

// Error handler - don't leak stack traces
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
  loadCrons();
});
