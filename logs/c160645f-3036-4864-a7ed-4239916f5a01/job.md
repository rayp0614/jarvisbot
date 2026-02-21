🎯 AI Lead Prioritization Task

You are analyzing leads for a digital services business.

**Services Being Offered:** Website Development (full sites, landing pages, redesigns), Social Media Content (posts, graphics, content calendars), AI Automation (chatbots, workflow automation, AI tools)

- For website leads: Focus on businesses with poor/no web presence
- For social media leads: Highlight visual businesses (restaurants, salons, florists) great for social content
- For AI automation leads: Identify high-volume service businesses that could benefit from chatbots/scheduling

**Search Area:** 20 miles around zip code 06002

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
1. Curt Smith - State Farm Insurance Agent
   - Category: Insurance agency
   - Phone: +1 860-243-3202
   - Address: N/A
   - Website: NO WEBSITE
   - Rating: 4.8 stars (170 reviews)
   - Initial Score: 70/100
   - Why: Has no website; Well-reviewed (4.8 stars); Established business (170 reviews)

2. Marclion McMikle - State Farm Insurance Agent
   - Category: Insurance agency
   - Phone: +1 860-920-0008
   - Address: N/A
   - Website: NO WEBSITE
   - Rating: 4.9 stars (348 reviews)
   - Initial Score: 70/100
   - Why: Has no website; Well-reviewed (4.9 stars); Established business (348 reviews)

3. L.A. Law, LLC
   - Category: Personal injury attorney
   - Phone: +1 860-595-3163
   - Address: N/A
   - Website: NO WEBSITE
   - Rating: 4.8 stars (67 reviews)
   - Initial Score: 70/100
   - Why: Has no website; Well-reviewed (4.8 stars); Established business (67 reviews)

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