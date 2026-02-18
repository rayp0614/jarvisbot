/**
 * Triggers API routes
 */
const fs = require('fs');
const path = require('path');

const TRIGGERS_PATH = path.join(__dirname, '../../operating_system/TRIGGERS.json');

function loadTriggers() {
  try {
    return JSON.parse(fs.readFileSync(TRIGGERS_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveTriggers(triggers) {
  fs.writeFileSync(TRIGGERS_PATH, JSON.stringify(triggers, null, 2));
}

function setupTriggersRoutes(app, authMiddleware, db) {
  // Get all triggers
  app.get('/api/triggers', authMiddleware, (req, res) => {
    try {
      const triggers = loadTriggers();
      res.json(triggers);
    } catch (error) {
      console.error('Error loading triggers:', error);
      res.status(500).json({ error: 'Failed to load triggers' });
    }
  });

  // Update a trigger
  app.put('/api/triggers/:name', authMiddleware, (req, res) => {
    try {
      const { name } = req.params;
      const updates = req.body;
      const triggers = loadTriggers();

      const index = triggers.findIndex((t) => t.name === name);
      if (index === -1) {
        return res.status(404).json({ error: 'Trigger not found' });
      }

      // Update allowed fields
      if (typeof updates.enabled === 'boolean') {
        triggers[index].enabled = updates.enabled;
      }
      if (updates.watch_path) {
        triggers[index].watch_path = updates.watch_path;
      }
      if (updates.actions) {
        triggers[index].actions = updates.actions;
      }

      saveTriggers(triggers);

      // Log activity
      db.logActivity(
        'trigger_updated',
        `Trigger "${name}" ${updates.enabled ? 'enabled' : 'disabled'}`
      );

      res.json(triggers[index]);
    } catch (error) {
      console.error('Error updating trigger:', error);
      res.status(500).json({ error: 'Failed to update trigger' });
    }
  });

  // Create a new trigger
  app.post('/api/triggers', authMiddleware, (req, res) => {
    try {
      const { name, watch_path, actions, enabled } = req.body;

      if (!name || !watch_path || !actions) {
        return res.status(400).json({ error: 'Name, watch_path, and actions are required' });
      }

      const triggers = loadTriggers();

      if (triggers.some((t) => t.name === name)) {
        return res.status(400).json({ error: 'Trigger with this name already exists' });
      }

      const newTrigger = {
        name,
        watch_path,
        actions,
        enabled: enabled !== false,
      };

      triggers.push(newTrigger);
      saveTriggers(triggers);

      db.logActivity('trigger_created', `Trigger "${name}" created`);

      res.status(201).json(newTrigger);
    } catch (error) {
      console.error('Error creating trigger:', error);
      res.status(500).json({ error: 'Failed to create trigger' });
    }
  });

  // Delete a trigger
  app.delete('/api/triggers/:name', authMiddleware, (req, res) => {
    try {
      const { name } = req.params;
      const triggers = loadTriggers();

      const index = triggers.findIndex((t) => t.name === name);
      if (index === -1) {
        return res.status(404).json({ error: 'Trigger not found' });
      }

      triggers.splice(index, 1);
      saveTriggers(triggers);

      db.logActivity('trigger_deleted', `Trigger "${name}" deleted`);

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting trigger:', error);
      res.status(500).json({ error: 'Failed to delete trigger' });
    }
  });
}

module.exports = { setupTriggersRoutes };
