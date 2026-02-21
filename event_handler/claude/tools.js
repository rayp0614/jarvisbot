const { createJob } = require('../tools/create-job');
const { getJobStatus } = require('../tools/github');
const { createCalendarEvent, listUpcomingEvents, isCalendarEnabled } = require('../tools/google-calendar');
const { sendEmail, isEmailEnabled } = require('../tools/email');
const { getSalesData, calculateAnalytics, isSheetsEnabled, getTodayDate, getDateDaysAgo } = require('../tools/google-sheets');

const toolDefinitions = [
  {
    name: 'create_job',
    description:
      'Create an autonomous job for jarvisbot to execute. Use this tool liberally - if the user asks for ANY task to be done, create a job. Jobs can handle code changes, file updates, research tasks, web scraping, data analysis, or anything requiring autonomous work. When the user explicitly asks for a job, ALWAYS use this tool. Returns the job ID and branch name.',
    input_schema: {
      type: 'object',
      properties: {
        job_description: {
          type: 'string',
          description:
            'Detailed job description including context and requirements. Be specific about what needs to be done.',
        },
      },
      required: ['job_description'],
    },
  },
  {
    name: 'get_job_status',
    description:
      'Check status of running jobs. Returns list of active workflow runs with timing and current step. Use when user asks about job progress, running jobs, or job status.',
    input_schema: {
      type: 'object',
      properties: {
        job_id: {
          type: 'string',
          description:
            'Optional: specific job ID to check. If omitted, returns all running jobs.',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_calendar_event',
    description:
      'Create a new event on Google Calendar. Use this when the user wants to add an event, meeting, reminder, or appointment to their calendar. Always confirm the date, time, and title with the user before creating.',
    input_schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'Event title/name',
        },
        description: {
          type: 'string',
          description: 'Event description or notes (optional)',
        },
        startDateTime: {
          type: 'string',
          description: 'Start date and time in ISO 8601 format, e.g., "2024-01-15T10:00:00"',
        },
        endDateTime: {
          type: 'string',
          description: 'End date and time in ISO 8601 format, e.g., "2024-01-15T11:00:00"',
        },
        location: {
          type: 'string',
          description: 'Event location (optional)',
        },
        timeZone: {
          type: 'string',
          description: 'Time zone, e.g., "America/New_York" (optional, defaults to configured timezone)',
        },
      },
      required: ['summary', 'startDateTime', 'endDateTime'],
    },
  },
  {
    name: 'list_calendar_events',
    description:
      'List upcoming events from Google Calendar. Use this when the user asks about their schedule, upcoming events, or what they have planned.',
    input_schema: {
      type: 'object',
      properties: {
        maxResults: {
          type: 'number',
          description: 'Maximum number of events to return (default: 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'send_email',
    description:
      'Send an email via Gmail. Use this to email research results, summaries, reports, or any content the user wants sent to their inbox. Perfect for sending job results, daily summaries, or important findings.',
    input_schema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient email address (optional, defaults to configured default)',
        },
        subject: {
          type: 'string',
          description: 'Email subject line',
        },
        body: {
          type: 'string',
          description: 'Email body content (plain text or HTML)',
        },
        isHtml: {
          type: 'boolean',
          description: 'Whether the body is HTML formatted (default: false)',
        },
      },
      required: ['subject', 'body'],
    },
  },
  {
    name: 'get_sales_summary',
    description:
      'Get sales summary and analytics. Use this when the user asks about sales performance, total revenue, deal counts, or sales metrics. Returns total sales, average deal size, deal counts, and pipeline stats.',
    input_schema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period: "today", "week", "month", or "all" for all time (default: "month")',
          enum: ['today', 'week', 'month', 'all'],
        },
      },
      required: [],
    },
  },
  {
    name: 'get_sales_reps',
    description:
      'Get sales rep performance and leaderboard. Use this when the user asks about top performers, rep rankings, who is selling the most, or individual rep performance.',
    input_schema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period: "today", "week", "month", or "all" for all time (default: "month")',
          enum: ['today', 'week', 'month', 'all'],
        },
        limit: {
          type: 'number',
          description: 'Maximum number of reps to return (default: 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_sales_teams',
    description:
      'Get team performance and leaderboard. Use this when the user asks about team rankings, which team is performing best, or team comparisons.',
    input_schema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period: "today", "week", "month", or "all" for all time (default: "month")',
          enum: ['today', 'week', 'month', 'all'],
        },
      },
      required: [],
    },
  },
  {
    name: 'get_recent_deals',
    description:
      'Get recent sales deals. Use this when the user asks about recent sales, latest deals, or what was sold recently.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of deals to return (default: 10)',
        },
      },
      required: [],
    },
  },
];

const toolExecutors = {
  create_job: async (input) => {
    const result = await createJob(input.job_description);
    return {
      success: true,
      job_id: result.job_id,
      branch: result.branch,
    };
  },
  get_job_status: async (input) => {
    const result = await getJobStatus(input.job_id);
    return result;
  },
  create_calendar_event: async (input) => {
    if (!isCalendarEnabled()) {
      return { success: false, error: 'Google Calendar is not configured' };
    }
    const result = await createCalendarEvent({
      summary: input.summary,
      description: input.description,
      startDateTime: input.startDateTime,
      endDateTime: input.endDateTime,
      location: input.location,
      timeZone: input.timeZone,
    });
    return result;
  },
  list_calendar_events: async (input) => {
    if (!isCalendarEnabled()) {
      return { success: false, error: 'Google Calendar is not configured' };
    }
    const result = await listUpcomingEvents({
      maxResults: input.maxResults,
    });
    return result;
  },
  send_email: async (input) => {
    if (!isEmailEnabled()) {
      return { success: false, error: 'Email is not configured' };
    }
    const result = await sendEmail({
      to: input.to,
      subject: input.subject,
      body: input.body,
      isHtml: input.isHtml,
    });
    return result;
  },
  get_sales_summary: async (input) => {
    if (!isSheetsEnabled()) {
      return { success: false, error: 'Sales data is not configured. Set GOOGLE_SHEETS_CREDENTIALS and SALES_SPREADSHEET_ID.' };
    }
    const period = input.period || 'month';
    const today = getTodayDate();
    let startDate = null;

    switch (period) {
      case 'today':
        startDate = today;
        break;
      case 'week':
        startDate = getDateDaysAgo(7);
        break;
      case 'month':
        startDate = getDateDaysAgo(30);
        break;
      case 'all':
        startDate = null;
        break;
    }

    const result = await getSalesData({ startDate });
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const analytics = calculateAnalytics(result.sales);
    return {
      success: true,
      period,
      totalSales: analytics.totalSales,
      totalDeals: analytics.totalDeals,
      avgDealSize: Math.round(analytics.avgDealSize),
      pipelineStats: analytics.pipelineStats,
    };
  },
  get_sales_reps: async (input) => {
    if (!isSheetsEnabled()) {
      return { success: false, error: 'Sales data is not configured' };
    }
    const period = input.period || 'month';
    const limit = input.limit || 10;
    const today = getTodayDate();
    let startDate = null;

    switch (period) {
      case 'today':
        startDate = today;
        break;
      case 'week':
        startDate = getDateDaysAgo(7);
        break;
      case 'month':
        startDate = getDateDaysAgo(30);
        break;
      case 'all':
        startDate = null;
        break;
    }

    const result = await getSalesData({ startDate });
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const analytics = calculateAnalytics(result.sales);
    return {
      success: true,
      period,
      reps: analytics.topReps.slice(0, limit).map(rep => ({
        name: rep.name,
        totalSA: rep.totalSA,
        deals: rep.deals,
      })),
    };
  },
  get_sales_teams: async (input) => {
    if (!isSheetsEnabled()) {
      return { success: false, error: 'Sales data is not configured' };
    }
    const period = input.period || 'month';
    const today = getTodayDate();
    let startDate = null;

    switch (period) {
      case 'today':
        startDate = today;
        break;
      case 'week':
        startDate = getDateDaysAgo(7);
        break;
      case 'month':
        startDate = getDateDaysAgo(30);
        break;
      case 'all':
        startDate = null;
        break;
    }

    const result = await getSalesData({ startDate });
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const analytics = calculateAnalytics(result.sales);
    return {
      success: true,
      period,
      teams: analytics.teamStats.map(team => ({
        name: team.name,
        group: team.group,
        totalSA: team.totalSA,
        deals: team.deals,
      })),
    };
  },
  get_recent_deals: async (input) => {
    if (!isSheetsEnabled()) {
      return { success: false, error: 'Sales data is not configured' };
    }
    const limit = input.limit || 10;

    const result = await getSalesData({});
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const recentDeals = result.sales
      .sort((a, b) => (b.sold_date || '').localeCompare(a.sold_date || ''))
      .slice(0, limit)
      .map(deal => ({
        date: deal.sold_date,
        rep: deal.sales_rep,
        team: deal.team_name,
        source: deal.source,
        amount: deal.SA,
        stage: deal.deal_stage,
      }));

    return {
      success: true,
      deals: recentDeals,
    };
  },
};

module.exports = { toolDefinitions, toolExecutors };
