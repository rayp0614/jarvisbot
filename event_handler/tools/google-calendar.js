/**
 * Google Calendar integration for creating events
 */
const { google } = require('googleapis');

// Parse credentials from environment variable (base64 encoded JSON)
function getCalendarClient() {
  const credentialsBase64 = process.env.GOOGLE_CALENDAR_CREDENTIALS;
  if (!credentialsBase64) {
    throw new Error('GOOGLE_CALENDAR_CREDENTIALS environment variable not set');
  }

  const credentials = JSON.parse(Buffer.from(credentialsBase64, 'base64').toString('utf8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  return google.calendar({ version: 'v3', auth });
}

/**
 * Create a calendar event
 * @param {Object} options - Event options
 * @param {string} options.summary - Event title
 * @param {string} options.description - Event description (optional)
 * @param {string} options.startDateTime - Start time in ISO 8601 format (e.g., "2024-01-15T10:00:00")
 * @param {string} options.endDateTime - End time in ISO 8601 format (e.g., "2024-01-15T11:00:00")
 * @param {string} options.timeZone - Time zone (default: America/New_York)
 * @param {string} options.location - Location (optional)
 * @param {string} options.calendarId - Calendar ID (default: primary or from env)
 * @returns {Object} Created event details
 */
async function createCalendarEvent({
  summary,
  description = '',
  startDateTime,
  endDateTime,
  timeZone = process.env.GOOGLE_CALENDAR_TIMEZONE || 'America/New_York',
  location = '',
  calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'
}) {
  const calendar = getCalendarClient();

  const event = {
    summary,
    description,
    location,
    start: {
      dateTime: startDateTime,
      timeZone,
    },
    end: {
      dateTime: endDateTime,
      timeZone,
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId,
      resource: event,
    });

    return {
      success: true,
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
      summary: response.data.summary,
      start: response.data.start,
      end: response.data.end,
    };
  } catch (error) {
    console.error('Failed to create calendar event:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * List upcoming events
 * @param {Object} options - List options
 * @param {number} options.maxResults - Max number of events to return (default: 10)
 * @param {string} options.calendarId - Calendar ID (default: primary or from env)
 * @returns {Array} List of events
 */
async function listUpcomingEvents({
  maxResults = 10,
  calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'
} = {}) {
  const calendar = getCalendarClient();

  try {
    const response = await calendar.events.list({
      calendarId,
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return {
      success: true,
      events: response.data.items.map(event => ({
        id: event.id,
        summary: event.summary,
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        location: event.location,
        htmlLink: event.htmlLink,
      })),
    };
  } catch (error) {
    console.error('Failed to list calendar events:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if calendar integration is enabled
 */
function isCalendarEnabled() {
  return !!process.env.GOOGLE_CALENDAR_CREDENTIALS;
}

module.exports = {
  createCalendarEvent,
  listUpcomingEvents,
  isCalendarEnabled,
};
