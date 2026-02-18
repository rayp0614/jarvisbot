/**
 * Google Sheets integration for reading sales data
 */
const { google } = require('googleapis');

// Parse credentials from environment variable (base64 encoded JSON)
function getSheetsClient() {
  const credentialsBase64 = process.env.GOOGLE_SHEETS_CREDENTIALS || process.env.GOOGLE_CALENDAR_CREDENTIALS;
  if (!credentialsBase64) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS environment variable not set');
  }

  const credentials = JSON.parse(Buffer.from(credentialsBase64, 'base64').toString('utf8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Read data from a Google Sheet
 * @param {Object} options - Read options
 * @param {string} options.spreadsheetId - The spreadsheet ID (from URL)
 * @param {string} options.range - Cell range (e.g., "Sheet1!A1:I1000")
 * @returns {Object} Sheet data
 */
async function readSheet({ spreadsheetId, range }) {
  const sheets = getSheetsClient();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return { success: true, headers: [], data: [] };
    }

    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] || '';
      });
      return obj;
    });

    return { success: true, headers, data, rowCount: data.length };
  } catch (error) {
    console.error('Failed to read sheet:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get sales data from the configured spreadsheet
 * @param {Object} options - Options
 * @param {string} options.startDate - Start date filter (YYYY-MM-DD)
 * @param {string} options.endDate - End date filter (YYYY-MM-DD)
 * @returns {Object} Sales data with analytics
 */
async function getSalesData({ startDate, endDate } = {}) {
  const spreadsheetId = process.env.SALES_SPREADSHEET_ID;
  const range = process.env.SALES_SHEET_RANGE || 'Sheet1!A:I';

  if (!spreadsheetId) {
    return { success: false, error: 'SALES_SPREADSHEET_ID not configured' };
  }

  const result = await readSheet({ spreadsheetId, range });
  if (!result.success) return result;

  let sales = result.data;

  // Filter by date if provided
  if (startDate || endDate) {
    sales = sales.filter(row => {
      const saleDate = row.sold_date?.split(' ')[0]; // Extract date part
      if (startDate && saleDate < startDate) return false;
      if (endDate && saleDate > endDate) return false;
      return true;
    });
  }

  // Parse SA (sales amount) as numbers
  sales = sales.map(row => ({
    ...row,
    SA: parseFloat(row.SA) || 0,
  }));

  return { success: true, sales, totalRows: sales.length };
}

/**
 * Calculate sales analytics
 * @param {Array} sales - Array of sales records
 * @returns {Object} Analytics object
 */
function calculateAnalytics(sales) {
  if (!sales || sales.length === 0) {
    return {
      totalSales: 0,
      totalDeals: 0,
      avgDealSize: 0,
      topReps: [],
      teamStats: [],
      sourceStats: [],
      pipelineStats: { submitted: 0, installed: 0 },
    };
  }

  // Total sales
  const totalSales = sales.reduce((sum, s) => sum + s.SA, 0);
  const totalDeals = sales.length;
  const avgDealSize = totalSales / totalDeals;

  // Top reps by SA
  const repStats = {};
  sales.forEach(s => {
    const rep = s.sales_rep || 'Unknown';
    if (!repStats[rep]) {
      repStats[rep] = { name: rep, totalSA: 0, deals: 0 };
    }
    repStats[rep].totalSA += s.SA;
    repStats[rep].deals += 1;
  });
  const topReps = Object.values(repStats)
    .sort((a, b) => b.totalSA - a.totalSA)
    .slice(0, 10);

  // Team stats
  const teamData = {};
  sales.forEach(s => {
    const team = s.team_name || 'Unknown';
    if (!teamData[team]) {
      teamData[team] = { name: team, totalSA: 0, deals: 0, group: s.team_group };
    }
    teamData[team].totalSA += s.SA;
    teamData[team].deals += 1;
  });
  const teamStats = Object.values(teamData).sort((a, b) => b.totalSA - a.totalSA);

  // Source stats
  const sourceData = {};
  sales.forEach(s => {
    const source = s.source || 'Unknown';
    if (!sourceData[source]) {
      sourceData[source] = { name: source, totalSA: 0, deals: 0 };
    }
    sourceData[source].totalSA += s.SA;
    sourceData[source].deals += 1;
  });
  const sourceStats = Object.values(sourceData).sort((a, b) => b.totalSA - a.totalSA);

  // Pipeline stats
  const pipelineStats = {
    submitted: sales.filter(s => s.deal_stage?.includes('Submitted')).length,
    installed: sales.filter(s => s.deal_stage?.includes('Installed')).length,
  };

  return {
    totalSales: Math.round(totalSales * 100) / 100,
    totalDeals,
    avgDealSize: Math.round(avgDealSize * 100) / 100,
    topReps,
    teamStats,
    sourceStats,
    pipelineStats,
  };
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get date N days ago in YYYY-MM-DD format
 */
function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

/**
 * Generate a sales summary message for Telegram
 * @param {Object} analytics - Analytics object
 * @param {string} period - Period description (e.g., "Today", "This Week")
 * @returns {string} Formatted message
 */
function formatSalesSummary(analytics, period = 'Today') {
  const { totalSales, totalDeals, topReps, teamStats, pipelineStats } = analytics;

  let message = `<b>Sales Summary - ${period}</b>\n\n`;
  message += `<b>Total SA:</b> $${totalSales.toLocaleString()}\n`;
  message += `<b>Deals:</b> ${totalDeals}\n`;
  message += `<b>Pipeline:</b> ${pipelineStats.submitted} submitted, ${pipelineStats.installed} installed\n\n`;

  if (topReps.length > 0) {
    message += `<b>Top Reps:</b>\n`;
    topReps.slice(0, 5).forEach((rep, i) => {
      message += `${i + 1}. ${rep.name}: $${rep.totalSA.toLocaleString()} (${rep.deals} deals)\n`;
    });
    message += '\n';
  }

  if (teamStats.length > 0) {
    message += `<b>Team Leaderboard:</b>\n`;
    teamStats.slice(0, 5).forEach((team, i) => {
      message += `${i + 1}. ${team.name}: $${team.totalSA.toLocaleString()}\n`;
    });
  }

  return message;
}

/**
 * Check if sheets integration is enabled
 */
function isSheetsEnabled() {
  return !!(process.env.GOOGLE_SHEETS_CREDENTIALS || process.env.GOOGLE_CALENDAR_CREDENTIALS);
}

module.exports = {
  readSheet,
  getSalesData,
  calculateAnalytics,
  formatSalesSummary,
  getTodayDate,
  getDateDaysAgo,
  isSheetsEnabled,
};
