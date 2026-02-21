🎯 AI Lead Prioritization Task

You are analyzing leads for a digital services business.

**Services Being Offered:** Website Development (full sites, landing pages, redesigns)

- For website leads: Focus on businesses with poor/no web presence

**Search Area:** 10 miles around zip code 06002

## Your Task
Analyze these 3 leads and provide:

1. **Priority Ranking** - Reorder from most to least likely to convert
2. **For each lead, provide:**
   - Conversion Score (1-10)
   - Why they need your services (specific to their business type)
   - Recommended outreach approach (phone script or email template)
   - Best time to contact
   - Any red flags or concerns

3. **Top 3 Picks** - Your recommended leads to contact TODAY with specific talking points

## The Leads
1. John's Plumbing & Heating LLC
   - Category: Contractor
   - Phone: +1 860-242-4909
   - Address: N/A
   - Website: NO WEBSITE
   - Rating: 4.3 stars (41 reviews)
   - Initial Score: 70/100
   - Why: Has no website; Well-reviewed (4.3 stars); Established business (41 reviews)

2. Anytime Sewer & Drain Services
   - Category: Plumber
   - Phone: +1 860-286-0331
   - Address: N/A
   - Website: NO WEBSITE
   - Rating: 4.8 stars (92 reviews)
   - Initial Score: 70/100
   - Why: Has no website; Well-reviewed (4.8 stars); Established business (92 reviews)

3. Venora Electric Inc
   - Category: Electrician
   - Phone: +1 860-242-8081
   - Address: N/A
   - Website: NO WEBSITE
   - Rating: 4.7 stars (58 reviews)
   - Initial Score: 70/100
   - Why: Has no website; Well-reviewed (4.7 stars); Established business (58 reviews)

## REQUIRED Output Files (Create ALL of these IN YOUR LOG DIRECTORY):

**CRITICAL:** All output files MUST be created inside your job's log directory (e.g., `logs/{job-id}/`).
Do NOT create files at the repository root - this causes merge conflicts!

### 1. Create logs/{job-id}/LEAD_ANALYSIS.md
Write a detailed markdown file with the full analysis:
- Priority-ranked list of all leads
- Conversion scores and reasoning
- Phone scripts for each lead
- Best contact times

### 2. Create logs/{job-id}/EMAIL_TO_SEND.md
Write a file with this EXACT format (the system will automatically send this as an email):

```
TO: ray.ai.p614@gmail.com
SUBJECT: 🎯 Lead Analysis: 3 Prospects - 2/21/2026
FORMAT: html

<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb;">🎯 Top Leads for Today</h1>

  <!-- Your beautifully formatted HTML analysis goes here -->
  <!-- Include: Top 3 picks, full priority ranking, phone scripts, email templates -->

</body>
</html>
```

### 3. Create logs/{job-id}/TELEGRAM_MESSAGE.md
Write a quick summary for Telegram notification:
- Top 3 picks with scores
- One-line reason for each
- Keep it concise (under 500 chars)

**IMPORTANT:** You MUST create all three files inside your log directory. The system will automatically send the email and Telegram message based on these files.

Make it actionable - the goal is to help close deals!