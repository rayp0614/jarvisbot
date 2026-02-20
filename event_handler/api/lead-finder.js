/**
 * Lead Finder API routes for dashboard
 * Integrates with Trigger.dev to find local business leads
 */

const TRIGGER_API_URL = 'https://api.trigger.dev/v3';
const TRIGGER_PROJECT_ID = process.env.TRIGGER_PROJECT_ID || 'proj_zfbbwxmqkdqzbowvsdoc';

/**
 * Check if Lead Finder integration is properly configured
 */
function isLeadFinderEnabled() {
  return !!process.env.TRIGGER_SECRET_KEY;
}

/**
 * Trigger the find-leads task on Trigger.dev
 */
async function triggerLeadSearch(params) {
  const secretKey = process.env.TRIGGER_SECRET_KEY;
  if (!secretKey) {
    throw new Error('TRIGGER_SECRET_KEY not configured');
  }

  const payload = {
    zipCode: params.zipCode || '06002',
    radiusMiles: params.radiusMiles || 20,
    leadCount: params.leadCount || 20,
    sendEmail: params.sendEmail !== false,
    sendToJarvis: params.sendToJarvis !== false,
  };

  // Only include categories if specified (empty = all categories)
  if (params.categories && params.categories.length > 0) {
    payload.categories = params.categories;
  }

  // Only include recipient email if provided
  if (params.recipientEmail) {
    payload.recipientEmail = params.recipientEmail;
  }

  const response = await fetch(`${TRIGGER_API_URL}/runs/find-leads/trigger`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      payload,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Trigger.dev API error:', response.status, errorText);
    throw new Error(`Trigger.dev API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Get the status of a Trigger.dev run
 */
async function getRunStatus(runId) {
  const secretKey = process.env.TRIGGER_SECRET_KEY;
  if (!secretKey) {
    throw new Error('TRIGGER_SECRET_KEY not configured');
  }

  const response = await fetch(`${TRIGGER_API_URL}/runs/${runId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Trigger.dev status error:', response.status, errorText);
    throw new Error(`Trigger.dev API error: ${response.status}`);
  }

  return response.json();
}

function setupLeadFinderRoutes(app, authMiddleware) {
  // GET /api/lead-finder/status - Check if lead finder is enabled
  app.get('/api/lead-finder/status', authMiddleware, (req, res) => {
    res.json({
      enabled: isLeadFinderEnabled(),
      configured: !!process.env.TRIGGER_SECRET_KEY,
    });
  });

  // POST /api/lead-finder/search - Start a new lead search
  app.post('/api/lead-finder/search', authMiddleware, async (req, res) => {
    try {
      if (!isLeadFinderEnabled()) {
        return res.status(400).json({
          error: 'Lead Finder not configured. Set TRIGGER_SECRET_KEY in environment variables.'
        });
      }

      const {
        zipCode,
        radiusMiles,
        leadCount,
        categories,
        recipientEmail,
        sendEmail,
        sendToJarvis,
      } = req.body;

      // Validate zip code
      if (zipCode && !/^\d{5}$/.test(zipCode)) {
        return res.status(400).json({ error: 'Invalid zip code. Must be 5 digits.' });
      }

      // Validate radius
      if (radiusMiles && (radiusMiles < 5 || radiusMiles > 50)) {
        return res.status(400).json({ error: 'Radius must be between 5 and 50 miles.' });
      }

      // Validate lead count
      if (leadCount && (leadCount < 1 || leadCount > 50)) {
        return res.status(400).json({ error: 'Lead count must be between 1 and 50.' });
      }

      console.log('Starting lead search:', { zipCode, radiusMiles, leadCount, categories: categories?.length || 'all' });

      const result = await triggerLeadSearch({
        zipCode,
        radiusMiles,
        leadCount,
        categories,
        recipientEmail,
        sendEmail,
        sendToJarvis,
      });

      res.json({
        success: true,
        runId: result.id,
        runUrl: `https://cloud.trigger.dev/projects/v3/${TRIGGER_PROJECT_ID}/runs/${result.id}`,
        message: 'Lead search started successfully',
      });
    } catch (err) {
      console.error('Lead search error:', err);
      res.status(500).json({ error: err.message || 'Failed to start lead search' });
    }
  });

  // GET /api/lead-finder/status/:runId - Get status of a specific run
  app.get('/api/lead-finder/status/:runId', authMiddleware, async (req, res) => {
    try {
      if (!isLeadFinderEnabled()) {
        return res.status(400).json({ error: 'Lead Finder not configured' });
      }

      const { runId } = req.params;
      if (!runId) {
        return res.status(400).json({ error: 'Run ID required' });
      }

      const result = await getRunStatus(runId);

      res.json({
        runId: result.id,
        status: result.status,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        output: result.output,
        error: result.error,
      });
    } catch (err) {
      console.error('Status check error:', err);
      res.status(500).json({ error: err.message || 'Failed to check run status' });
    }
  });
}

module.exports = { setupLeadFinderRoutes };
