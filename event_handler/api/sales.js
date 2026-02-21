/**
 * Sales API routes for dashboard
 */
const { getSalesData, calculateAnalytics, getTodayDate, getDateDaysAgo, isSheetsEnabled } = require('../tools/google-sheets');

function setupSalesRoutes(app, authMiddleware) {
  // GET /api/sales/status - Check if sales integration is enabled
  app.get('/api/sales/status', authMiddleware, (req, res) => {
    res.json({
      enabled: isSheetsEnabled(),
      configured: !!process.env.SALES_SPREADSHEET_ID,
    });
  });

  // GET /api/sales/summary - Get sales summary for a period
  app.get('/api/sales/summary', authMiddleware, async (req, res) => {
    try {
      const { period = 'today' } = req.query;

      let startDate, endDate;
      const today = getTodayDate();

      switch (period) {
        case 'today':
          startDate = today;
          endDate = today;
          break;
        case 'yesterday':
          startDate = getDateDaysAgo(1);
          endDate = getDateDaysAgo(1);
          break;
        case 'week':
          startDate = getDateDaysAgo(7);
          endDate = today;
          break;
        case 'month':
          startDate = getDateDaysAgo(30);
          endDate = today;
          break;
        case 'all':
          // No date filtering - get all data
          startDate = null;
          endDate = null;
          break;
        default:
          startDate = req.query.startDate;
          endDate = req.query.endDate;
      }

      const result = await getSalesData({ startDate, endDate });
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      const analytics = calculateAnalytics(result.sales);

      res.json({
        period,
        startDate,
        endDate,
        ...analytics,
      });
    } catch (err) {
      console.error('Sales summary error:', err);
      res.status(500).json({ error: 'Failed to fetch sales summary' });
    }
  });

  // GET /api/sales/reps - Get rep performance
  app.get('/api/sales/reps', authMiddleware, async (req, res) => {
    try {
      const { period = 'month' } = req.query;
      const today = getTodayDate();

      let startDate = null;
      let endDate = null;
      switch (period) {
        case 'today':
          startDate = today;
          endDate = today;
          break;
        case 'week':
          startDate = getDateDaysAgo(7);
          endDate = today;
          break;
        case 'month':
          startDate = getDateDaysAgo(30);
          endDate = today;
          break;
        case 'all':
          // No date filtering
          break;
        case 'custom':
          startDate = req.query.startDate || null;
          endDate = req.query.endDate || null;
          break;
        default:
          startDate = getDateDaysAgo(30);
          endDate = today;
      }

      const result = await getSalesData({ startDate, endDate });
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      const analytics = calculateAnalytics(result.sales);

      res.json({
        period,
        reps: analytics.topReps,
      });
    } catch (err) {
      console.error('Sales reps error:', err);
      res.status(500).json({ error: 'Failed to fetch rep data' });
    }
  });

  // GET /api/sales/teams - Get team leaderboard
  app.get('/api/sales/teams', authMiddleware, async (req, res) => {
    try {
      const { period = 'month' } = req.query;
      const today = getTodayDate();

      let startDate = null;
      let endDate = null;
      switch (period) {
        case 'today':
          startDate = today;
          endDate = today;
          break;
        case 'week':
          startDate = getDateDaysAgo(7);
          endDate = today;
          break;
        case 'month':
          startDate = getDateDaysAgo(30);
          endDate = today;
          break;
        case 'all':
          // No date filtering
          break;
        case 'custom':
          startDate = req.query.startDate || null;
          endDate = req.query.endDate || null;
          break;
        default:
          startDate = getDateDaysAgo(30);
          endDate = today;
      }

      const result = await getSalesData({ startDate, endDate });
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      const analytics = calculateAnalytics(result.sales);

      // Group teams by team_group
      const byGroup = {};
      analytics.teamStats.forEach(team => {
        const group = team.group || 'Other';
        if (!byGroup[group]) byGroup[group] = [];
        byGroup[group].push(team);
      });

      res.json({
        period,
        teams: analytics.teamStats,
        byGroup,
      });
    } catch (err) {
      console.error('Sales teams error:', err);
      res.status(500).json({ error: 'Failed to fetch team data' });
    }
  });

  // GET /api/sales/sources - Get source breakdown
  app.get('/api/sales/sources', authMiddleware, async (req, res) => {
    try {
      const { period = 'month' } = req.query;
      const today = getTodayDate();

      let startDate = null;
      let endDate = null;
      switch (period) {
        case 'today':
          startDate = today;
          endDate = today;
          break;
        case 'week':
          startDate = getDateDaysAgo(7);
          endDate = today;
          break;
        case 'month':
          startDate = getDateDaysAgo(30);
          endDate = today;
          break;
        case 'all':
          // No date filtering
          break;
        case 'custom':
          startDate = req.query.startDate || null;
          endDate = req.query.endDate || null;
          break;
        default:
          startDate = getDateDaysAgo(30);
          endDate = today;
      }

      const result = await getSalesData({ startDate, endDate });
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      const analytics = calculateAnalytics(result.sales);

      res.json({
        period,
        sources: analytics.sourceStats,
      });
    } catch (err) {
      console.error('Sales sources error:', err);
      res.status(500).json({ error: 'Failed to fetch source data' });
    }
  });

  // GET /api/sales/recent - Get recent deals
  app.get('/api/sales/recent', authMiddleware, async (req, res) => {
    try {
      const { limit = 20 } = req.query;
      // Get all data for recent deals (sorted by date)
      const result = await getSalesData({});

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      // Sort by date descending and limit
      const recentDeals = result.sales
        .sort((a, b) => (b.sold_date || '').localeCompare(a.sold_date || ''))
        .slice(0, parseInt(limit, 10));

      res.json({ deals: recentDeals });
    } catch (err) {
      console.error('Recent sales error:', err);
      res.status(500).json({ error: 'Failed to fetch recent deals' });
    }
  });
}

module.exports = { setupSalesRoutes };
