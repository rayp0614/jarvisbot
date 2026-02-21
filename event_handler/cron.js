const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { executeAction } = require('./actions');
const { sendMessage, escapeHtml } = require('./tools/telegram');
const CRON_DIR = path.join(__dirname, 'cron');

// Database (optional - graceful if not available)
let db = null;
try {
  db = require('./db');
} catch (err) {
  console.warn('SQLite not available - cron logging disabled');
}

// Telegram config
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Send Telegram alert for cron failure
 */
async function sendCronFailureAlert(name, schedule, errorMessage, durationMs) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return;
  }

  const message =
    `⚠️ <b>Cron Failed: ${escapeHtml(name)}</b>\n\n` +
    `<b>Schedule:</b> <code>${escapeHtml(schedule)}</code>\n` +
    `<b>Error:</b> ${escapeHtml(errorMessage)}\n` +
    `<b>Duration:</b> ${durationMs}ms`;

  try {
    await sendMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, message);
  } catch (err) {
    console.error('Failed to send Telegram alert:', err.message);
  }
}

/**
 * Load and schedule crons from CRONS.json
 * @returns {Array} - Array of scheduled cron tasks
 */
function loadCrons() {
  const cronFile = path.join(__dirname, '..', 'operating_system', 'CRONS.json');

  console.log('\n--- Cron Jobs ---');

  if (!fs.existsSync(cronFile)) {
    console.log('No CRONS.json found');
    console.log('-----------------\n');
    return [];
  }

  const crons = JSON.parse(fs.readFileSync(cronFile, 'utf8'));
  const tasks = [];

  for (const cronEntry of crons) {
    const { name, schedule, type = 'agent', enabled } = cronEntry;
    if (enabled === false) continue;

    if (!cron.validate(schedule)) {
      console.error(`Invalid schedule for "${name}": ${schedule}`);
      continue;
    }

    const task = cron.schedule(schedule, async () => {
      const startTime = Date.now();

      try {
        const result = await executeAction(cronEntry, { cwd: CRON_DIR });
        const duration = Date.now() - startTime;

        console.log(`[CRON] ${name}: ${result || 'ran'}`);
        console.log(`[CRON] ${name}: completed in ${duration}ms`);

        // Log success to database
        if (db) {
          db.logCronExecution(name, type, 'success', null, result, duration);
        }
      } catch (err) {
        const duration = Date.now() - startTime;
        console.error(`[CRON] ${name}: error - ${err.message}`);

        // Log failure to database
        if (db) {
          db.logCronExecution(name, type, 'failed', err.message, null, duration);
        }

        // Send Telegram alert
        await sendCronFailureAlert(name, schedule, err.message, duration);
      }
    });

    tasks.push({ name, schedule, type, task });
  }

  if (tasks.length === 0) {
    console.log('No active cron jobs');
  } else {
    for (const { name, schedule, type } of tasks) {
      console.log(`  ${name}: ${schedule} (${type})`);
    }
  }

  console.log('-----------------\n');

  return tasks;
}

// Run if executed directly
if (require.main === module) {
  console.log('Starting cron scheduler...');
  loadCrons();
}

module.exports = { loadCrons };
