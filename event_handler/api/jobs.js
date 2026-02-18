/**
 * Jobs API routes
 */
const { getJobStatus } = require('../tools/github');

function setupJobsRoutes(app, authMiddleware, db) {
  // Get all jobs (from database + GitHub for running status)
  app.get('/api/jobs', authMiddleware, async (req, res) => {
    try {
      // Get jobs from database
      const dbJobs = db.getRecentJobs(50);

      // Get running jobs from GitHub
      let runningJobs = [];
      try {
        const githubStatus = await getJobStatus();
        if (githubStatus.runs) {
          runningJobs = githubStatus.runs;
        }
      } catch (error) {
        console.error('Error fetching GitHub status:', error.message);
      }

      // Merge data - update status for running jobs
      const jobs = dbJobs.map((job) => {
        const running = runningJobs.find((r) => r.head_branch === `job/${job.id}`);
        if (running) {
          return {
            ...job,
            status: running.status === 'completed' ? running.conclusion : running.status,
          };
        }
        return job;
      });

      // Add any running jobs not in database
      for (const running of runningJobs) {
        const jobId = running.head_branch?.replace('job/', '');
        if (jobId && !jobs.some((j) => j.id === jobId)) {
          jobs.unshift({
            id: jobId,
            description: running.name || 'Running job',
            status: running.status === 'completed' ? running.conclusion : running.status,
            created_at: running.created_at,
          });
        }
      }

      res.json(jobs);
    } catch (error) {
      console.error('Error getting jobs:', error);
      res.status(500).json({ error: 'Failed to get jobs' });
    }
  });

  // Get single job
  app.get('/api/jobs/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const job = db.getJob(id);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Check GitHub for current status
      try {
        const githubStatus = await getJobStatus(id);
        if (githubStatus.runs?.length > 0) {
          const running = githubStatus.runs[0];
          job.status = running.status === 'completed' ? running.conclusion : running.status;
          job.github_url = running.html_url;
        }
      } catch {
        // Ignore GitHub errors
      }

      res.json(job);
    } catch (error) {
      console.error('Error getting job:', error);
      res.status(500).json({ error: 'Failed to get job' });
    }
  });
}

module.exports = { setupJobsRoutes };
