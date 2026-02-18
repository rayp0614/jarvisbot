/**
 * Dashboard API routes
 */
const fs = require('fs');
const path = require('path');

const CRONS_PATH = path.join(__dirname, '../../operating_system/CRONS.json');
const TRIGGERS_PATH = path.join(__dirname, '../../operating_system/TRIGGERS.json');

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

function setupDashboardRoutes(app, authMiddleware, db) {
  // Get dashboard stats
  app.get('/api/dashboard/stats', authMiddleware, (req, res) => {
    try {
      const crons = loadJson(CRONS_PATH);
      const triggers = loadJson(TRIGGERS_PATH);
      const jobStats = db.getJobStats();

      res.json({
        totalCrons: crons.length,
        enabledCrons: crons.filter((c) => c.enabled !== false).length,
        totalTriggers: triggers.length,
        enabledTriggers: triggers.filter((t) => t.enabled !== false).length,
        jobsToday: jobStats.today,
        jobsRunning: jobStats.running,
        successRate: jobStats.successRate,
      });
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  // Get recent activity
  app.get('/api/dashboard/activity', authMiddleware, (req, res) => {
    try {
      const activity = db.getRecentActivity(20);
      res.json(activity);
    } catch (error) {
      console.error('Error getting activity:', error);
      res.status(500).json({ error: 'Failed to get activity' });
    }
  });
}

module.exports = { setupDashboardRoutes };
