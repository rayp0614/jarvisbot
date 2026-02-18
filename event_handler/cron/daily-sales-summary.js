#!/usr/bin/env node
/**
 * Daily Sales Summary Cron Script
 * Sends a formatted sales summary to Telegram
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { getSalesData, calculateAnalytics, formatSalesSummary, getTodayDate, getDateDaysAgo, isSheetsEnabled } = require('../tools/google-sheets');
const { sendMessage } = require('../tools/telegram');

async function main() {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!chatId || !botToken) {
    console.log('Telegram not configured - skipping sales summary');
    return;
  }

  if (!isSheetsEnabled()) {
    console.log('Google Sheets not configured - skipping sales summary');
    return;
  }

  try {
    // Get yesterday's sales (run in morning, report previous day)
    const yesterday = getDateDaysAgo(1);
    const result = await getSalesData({ startDate: yesterday, endDate: yesterday });

    if (!result.success) {
      console.error('Failed to fetch sales data:', result.error);
      return;
    }

    const analytics = calculateAnalytics(result.sales);

    // Only send if there were sales
    if (analytics.totalDeals === 0) {
      console.log('No sales yesterday - skipping summary');
      return;
    }

    const message = formatSalesSummary(analytics, 'Yesterday');
    await sendMessage(botToken, chatId, message);
    console.log('Daily sales summary sent successfully');
  } catch (err) {
    console.error('Failed to send daily sales summary:', err);
  }
}

main();
