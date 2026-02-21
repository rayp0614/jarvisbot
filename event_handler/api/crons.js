/**
 * Cron Jobs API routes
 */
const fs = require('fs');
const path = require('path');

const CRONS_PATH = path.join(__dirname, '../../operating_system/CRONS.json');

function loadCrons() {
  try {
    return JSON.parse(fs.readFileSync(CRONS_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveCrons(crons) {
  fs.writeFileSync(CRONS_PATH, JSON.stringify(crons, null, 2));
}

function setupCronsRoutes(app, authMiddleware, db) {
  // Get all crons
  app.get('/api/crons', authMiddleware, (req, res) => {
    try {
      const crons = loadCrons();
      res.json(crons);
    } catch (error) {
      console.error('Error loading crons:', error);
      res.status(500).json({ error: 'Failed to load crons' });
    }
  });

  // Update a cron
  app.put('/api/crons/:name', authMiddleware, (req, res) => {
    try {
      const { name } = req.params;
      const updates = req.body;
      const crons = loadCrons();

      const index = crons.findIndex((c) => c.name === name);
      if (index === -1) {
        return res.status(404).json({ error: 'Cron not found' });
      }

      // Update allowed fields
      if (typeof updates.enabled === 'boolean') {
        crons[index].enabled = updates.enabled;
      }
      if (updates.schedule) {
        crons[index].schedule = updates.schedule;
      }
      if (updates.type) {
        crons[index].type = updates.type;
      }
      if (updates.job !== undefined) {
        crons[index].job = updates.job;
      }
      if (updates.command !== undefined) {
        crons[index].command = updates.command;
      }
      if (updates.url !== undefined) {
        crons[index].url = updates.url;
      }
      if (updates.method !== undefined) {
        crons[index].method = updates.method;
      }
      if (updates.headers !== undefined) {
        crons[index].headers = updates.headers;
      }
      if (updates.vars !== undefined) {
        crons[index].vars = updates.vars;
      }

      saveCrons(crons);

      // Log activity
      db.logActivity(
        'cron_updated',
        `Cron "${name}" ${updates.enabled ? 'enabled' : 'disabled'}`
      );

      res.json(crons[index]);
    } catch (error) {
      console.error('Error updating cron:', error);
      res.status(500).json({ error: 'Failed to update cron' });
    }
  });

  // Create a new cron
  app.post('/api/crons', authMiddleware, (req, res) => {
    try {
      const { name, schedule, type, job, command, url, enabled } = req.body;

      if (!name || !schedule) {
        return res.status(400).json({ error: 'Name and schedule are required' });
      }

      const crons = loadCrons();

      if (crons.some((c) => c.name === name)) {
        return res.status(400).json({ error: 'Cron with this name already exists' });
      }

      const newCron = {
        name,
        schedule,
        type: type || 'agent',
        enabled: enabled !== false,
      };

      if (job) newCron.job = job;
      if (command) newCron.command = command;
      if (url) newCron.url = url;

      crons.push(newCron);
      saveCrons(crons);

      db.logActivity('cron_created', `Cron "${name}" created`);

      res.status(201).json(newCron);
    } catch (error) {
      console.error('Error creating cron:', error);
      res.status(500).json({ error: 'Failed to create cron' });
    }
  });

  // Delete a cron
  app.delete('/api/crons/:name', authMiddleware, (req, res) => {
    try {
      const { name } = req.params;
      const crons = loadCrons();

      const index = crons.findIndex((c) => c.name === name);
      if (index === -1) {
        return res.status(404).json({ error: 'Cron not found' });
      }

      crons.splice(index, 1);
      saveCrons(crons);

      db.logActivity('cron_deleted', `Cron "${name}" deleted`);

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting cron:', error);
      res.status(500).json({ error: 'Failed to delete cron' });
    }
  });

  // Get all recent cron executions
  app.get('/api/crons/executions', authMiddleware, (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const executions = db.getRecentCronExecutions(limit);
      res.json(executions);
    } catch (error) {
      console.error('Error getting cron executions:', error);
      res.status(500).json({ error: 'Failed to get executions' });
    }
  });

  // Get executions for a specific cron
  app.get('/api/crons/:name/executions', authMiddleware, (req, res) => {
    try {
      const { name } = req.params;
      const limit = parseInt(req.query.limit) || 20;
      const executions = db.getCronExecutionsByName(name, limit);
      res.json(executions);
    } catch (error) {
      console.error('Error getting cron executions:', error);
      res.status(500).json({ error: 'Failed to get executions' });
    }
  });
}

module.exports = { setupCronsRoutes };
