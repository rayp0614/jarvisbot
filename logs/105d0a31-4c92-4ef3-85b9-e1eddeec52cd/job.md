🎯 AI Lead Prioritization Task

You are analyzing leads for a digital services business.

**Services Being Offered:** Website Development (full sites, landing pages, redesigns), Social Media Content (posts, graphics, content calendars), AI Automation (chatbots, workflow automation, AI tools)

- For website leads: Focus on businesses with poor/no web presence
- For social media leads: Highlight visual businesses (restaurants, salons, florists) great for social content
- For AI automation leads: Identify high-volume service businesses that could benefit from chatbots/scheduling

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
1. Bennett & Company CPAs
   - Category: Certified public accountant
   - Phone: +1 860-243-3333
   - Address: N/A
   - Website URL: https://www.bbtcpa.com/ (INCLUDE THIS LINK IN YOUR EMAIL!)
   - Rating: 5 stars (2 reviews)
   - Initial Score: 25/100
   - Why: Website found via Google (not in Maps listing); Well-reviewed (5 stars)

2. Taxes First LLC
   - Category: Accountant
   - Phone: +1 860-242-4330
   - Address: N/A
   - Website URL: https://paro.ai/blog/filing-business-taxes-for-llc-for-the-first-time/ (INCLUDE THIS LINK IN YOUR EMAIL!)
   - Rating: 4.7 stars (14 reviews)
   - Initial Score: 25/100
   - Why: Website found via Google (not in Maps listing); Well-reviewed (4.7 stars)

3. Courtney Fink & Forbes LLP
   - Category: Certified public accountant
   - Phone: +1 860-242-9400
   - Address: N/A
   - Website URL: https://www.cffcpa.com/ (INCLUDE THIS LINK IN YOUR EMAIL!)
   - Rating: 5 stars (2 reviews)
   - Initial Score: 25/100
   - Why: Website found via Google (not in Maps listing); Well-reviewed (5 stars)

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
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
  <h1 style="color: #1e293b;">🎯 Top Leads for Today</h1>

  <!-- IMPORTANT STYLING REQUIREMENTS:
    - Use professional, muted colors (slate, gray, subtle blue accents)
    - NO bright/neon colors (no hot pink, bright purple, lime green, etc.)
    - Card backgrounds: white (#ffffff) or very light gray (#f8fafc)
    - Text: dark gray (#1e293b for headers, #475569 for body)
    - Accent color: subtle blue (#3b82f6) for links and highlights only
    - Border colors: light gray (#e2e8f0)
  -->

  <!-- FOR EACH LEAD, ALWAYS INCLUDE:
    - Business name as header
    - Phone number (clickable: tel:+1XXXXXXXXXX)
    - Website URL (clickable link) - REQUIRED, don't skip this!
    - Rating and review count
    - Your conversion score
    - Why they'll convert (bullet points)
    - Opening line/script
    - Best time to contact
  -->

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