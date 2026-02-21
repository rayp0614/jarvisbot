// Manual lead finder - trigger anytime to find website leads
import { task, logger } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { searchAllCategories, setSearchConfig } from "./outscraper.js";
import { verifyNoWebsiteBusinesses } from "./google-verifier.js";
import { analyzeWebsites } from "./website-analyzer.js";
import { rankLeads } from "./lead-scorer.js";
import { sendLeadsEmail } from "./email-sender.js";
import { BUSINESS_CATEGORIES, DEFAULT_SEARCH_CONFIG, Lead } from "./types.js";

// JarvisBot webhook URL
const JARVISBOT_WEBHOOK_URL = "https://jarvisbot-production-6490.up.railway.app/webhook";

// Input schema - customize your lead search
const LeadFinderSchema = z.object({
  // Location settings
  zipCode: z.string().regex(/^\d{5}$/, "Must be a 5-digit zip code").default("06002"),
  radiusMiles: z.number().min(5).max(50).default(20),
  // Number of leads to find (default: 20)
  leadCount: z.number().min(1).max(50).default(20),
  // Business categories to search (default: all categories)
  categories: z.array(z.string()).optional(),
  // Services you offer - affects how AI tailors outreach scripts
  services: z.array(z.enum(["website", "social", "ai"])).default(["website"]),
  // Send results via email (default: true)
  sendEmail: z.boolean().default(true),
  // Override recipient email (uses LEAD_RECIPIENT_EMAIL env var if not provided)
  recipientEmail: z.string().email().optional(),
  // Send leads to JarvisBot for AI prioritization (default: true)
  sendToJarvis: z.boolean().default(true),
});

/**
 * Send leads to JarvisBot for AI-powered prioritization
 * JarvisBot will analyze leads and send results via Telegram + Email
 */
async function sendToJarvisBot(
  leads: Lead[],
  searchParams: { zipCode: string; radiusMiles: number; services: string[] }
): Promise<{ jobId: string; branch: string } | null> {
  const apiKey = process.env.JARVISBOT_API_KEY;
  if (!apiKey) {
    logger.warn("⚠️ JARVISBOT_API_KEY not set, skipping JarvisBot integration");
    return null;
  }

  // Format leads for the AI to analyze
  const leadsFormatted = leads.map((l, i) =>
    `${i + 1}. ${l.business.name}
   - Category: ${l.business.category}
   - Phone: ${l.business.phone || "N/A"}
   - Address: ${l.business.address || "N/A"}
   - Website: ${l.business.website || "NO WEBSITE"}
   - Rating: ${l.business.rating ? `${l.business.rating} stars (${l.business.reviewCount} reviews)` : "N/A"}
   - Initial Score: ${l.leadScore}/100
   - Why: ${l.reason}`
  ).join("\n\n");

  const recipientEmail = process.env.LEAD_RECIPIENT_EMAIL || "ray.ai.p614@gmail.com";

  // Build services context for the AI
  const serviceLabels: Record<string, string> = {
    website: "Website Development (full sites, landing pages, redesigns)",
    social: "Social Media Content (posts, graphics, content calendars)",
    ai: "AI Automation (chatbots, workflow automation, AI tools)",
  };

  const servicesOffered = searchParams.services
    .map(s => serviceLabels[s] || s)
    .join(", ");

  const serviceInstructions = searchParams.services.includes("website")
    ? "\n- For website leads: Focus on businesses with poor/no web presence"
    : "";
  const socialInstructions = searchParams.services.includes("social")
    ? "\n- For social media leads: Highlight visual businesses (restaurants, salons, florists) great for social content"
    : "";
  const aiInstructions = searchParams.services.includes("ai")
    ? "\n- For AI automation leads: Identify high-volume service businesses that could benefit from chatbots/scheduling"
    : "";

  const jobDescription = `🎯 AI Lead Prioritization Task

You are analyzing leads for a digital services business.

**Services Being Offered:** ${servicesOffered}
${serviceInstructions}${socialInstructions}${aiInstructions}

**Search Area:** ${searchParams.radiusMiles} miles around zip code ${searchParams.zipCode}

## Your Task
Analyze these ${leads.length} leads and provide:

1. **Priority Ranking** - Reorder from most to least likely to convert
2. **For each lead, provide:**
   - Conversion Score (1-10)
   - Why they need your services (specific to their business type)
   - Recommended outreach approach (phone script or email template)
   - Best time to contact
   - Any red flags or concerns

3. **Top 3 Picks** - Your recommended leads to contact TODAY with specific talking points

## The Leads
${leadsFormatted}

## REQUIRED Output Files (Create ALL of these IN YOUR LOG DIRECTORY):

**CRITICAL:** All output files MUST be created inside your job's log directory (e.g., \`logs/{job-id}/\`).
Do NOT create files at the repository root - this causes merge conflicts!

### 1. Create logs/{job-id}/LEAD_ANALYSIS.md
Write a detailed markdown file with the full analysis:
- Priority-ranked list of all leads
- Conversion scores and reasoning
- Phone scripts for each lead
- Best contact times

### 2. Create logs/{job-id}/EMAIL_TO_SEND.md
Write a file with this EXACT format (the system will automatically send this as an email):

\`\`\`
TO: ${recipientEmail}
SUBJECT: 🎯 Lead Analysis: ${leads.length} Prospects - ${new Date().toLocaleDateString()}
FORMAT: html

<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb;">🎯 Top Leads for Today</h1>

  <!-- Your beautifully formatted HTML analysis goes here -->
  <!-- Include: Top 3 picks, full priority ranking, phone scripts, email templates -->

</body>
</html>
\`\`\`

### 3. Create logs/{job-id}/TELEGRAM_MESSAGE.md
Write a quick summary for Telegram notification:
- Top 3 picks with scores
- One-line reason for each
- Keep it concise (under 500 chars)

**IMPORTANT:** You MUST create all three files inside your log directory. The system will automatically send the email and Telegram message based on these files.

Make it actionable - the goal is to help close deals!`;

  logger.info("🤖 Sending leads to JarvisBot for AI prioritization...");

  try {
    const response = await fetch(JARVISBOT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ job: jobDescription }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`JarvisBot webhook failed: ${response.status} - ${errorText}`);
      return null;
    }

    const result = await response.json() as { job_id: string; branch: string };
    logger.info(`✅ JarvisBot job created: ${result.job_id}`);

    return {
      jobId: result.job_id,
      branch: result.branch,
    };
  } catch (error) {
    logger.error("Failed to send to JarvisBot:", { error });
    return null;
  }
}

export const findLeadsTask = task({
  id: "find-leads",
  schema: {
    payload: LeadFinderSchema,
  },
  run: async ({ zipCode, radiusMiles, leadCount, categories, services, sendEmail, recipientEmail, sendToJarvis }) => {
    // Apply defaults if not provided (Zod defaults may not apply in some contexts)
    const effectiveZipCode = zipCode || "06002";
    const effectiveRadius = radiusMiles ?? 20;
    const effectiveLeadCount = leadCount ?? 20;
    const effectiveServices = services || ["website"];
    const effectiveSendEmail = sendEmail ?? true;
    const effectiveSendToJarvis = sendToJarvis ?? true;

    logger.info("🚀 Starting lead finder", {
      zipCode: effectiveZipCode,
      radiusMiles: effectiveRadius,
      leadCount: effectiveLeadCount,
      services: effectiveServices,
      sendEmail: effectiveSendEmail,
      sendToJarvis: effectiveSendToJarvis,
      categories: categories?.length || "all",
    });

    // Set search configuration for this run
    setSearchConfig({
      zipCode: effectiveZipCode,
      radiusMiles: effectiveRadius,
    });

    // Use provided categories or default to all
    const searchCategories = categories || BUSINESS_CATEGORIES;

    // Validate environment variables
    const outsrcaperKey = process.env.OUTSCRAPER_API_KEY;
    if (!outsrcaperKey) {
      throw new Error("OUTSCRAPER_API_KEY is not set");
    }

    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlKey) {
      throw new Error("FIRECRAWL_API_KEY is not set");
    }

    // Step 1: Search for businesses
    logger.info(`📍 Searching ${searchCategories.length} categories...`);

    // Search 3 businesses per category to get good coverage
    let businesses = await searchAllCategories(searchCategories, 3);

    logger.info(`Found ${businesses.length} businesses`);

    if (businesses.length === 0) {
      return {
        success: false,
        error: "No businesses found",
        businesses: [],
        leads: [],
      };
    }

    // Step 1.5: Verify businesses without websites via Google Search
    // This catches false positives where Outscraper missed the website
    const businessesWithoutWebsite = businesses.filter((b) => !b.website).length;
    if (businessesWithoutWebsite > 0) {
      logger.info(`🔍 Verifying ${businessesWithoutWebsite} businesses without websites...`);
      businesses = await verifyNoWebsiteBusinesses(businesses);
      const verified = businesses.filter((b) => b.websiteSource === "google_search").length;
      logger.info(`✅ Found ${verified} websites via Google Search`);
    }

    // Step 2: Analyze websites
    const websiteUrls = businesses
      .map((b) => b.website)
      .filter((url): url is string => url !== null);

    logger.info(`🔍 Analyzing ${websiteUrls.length} websites...`);

    const websiteAnalyses = await analyzeWebsites(websiteUrls);

    // Step 3: Score and rank leads
    logger.info("📊 Scoring leads...");

    const topLeads = rankLeads(businesses, websiteAnalyses, effectiveLeadCount);

    const hotLeads = topLeads.filter((l) => l.leadScore >= 60).length;
    const warmLeads = topLeads.filter(
      (l) => l.leadScore >= 30 && l.leadScore < 60
    ).length;

    // Step 4: Send email if requested
    let emailResult = null;
    if (effectiveSendEmail) {
      const email = recipientEmail || process.env.LEAD_RECIPIENT_EMAIL;
      if (!email) {
        throw new Error("No recipient email provided - set LEAD_RECIPIENT_EMAIL or pass recipientEmail");
      }

      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        throw new Error("RESEND_API_KEY is not set");
      }

      logger.info(`📧 Sending ${topLeads.length} leads to ${email}...`);
      emailResult = await sendLeadsEmail(email, topLeads);
    }

    // Step 5: Send to JarvisBot for AI prioritization
    let jarvisResult = null;
    if (effectiveSendToJarvis) {
      jarvisResult = await sendToJarvisBot(topLeads, {
        zipCode: effectiveZipCode,
        radiusMiles: effectiveRadius,
        services: effectiveServices,
      });
    }

    logger.info("✅ Lead finder completed!", {
      businessesFound: businesses.length,
      leadsGenerated: topLeads.length,
      hotLeads,
      warmLeads,
      emailSent: emailResult?.success || false,
      jarvisJobCreated: !!jarvisResult,
    });

    return {
      success: true,
      searchParams: {
        zipCode: effectiveZipCode,
        radiusMiles: effectiveRadius,
        categories: searchCategories,
        services: effectiveServices,
      },
      businessesFound: businesses.length,
      websitesAnalyzed: websiteUrls.length,
      leadsGenerated: topLeads.length,
      hotLeads,
      warmLeads,
      coldLeads: topLeads.length - hotLeads - warmLeads,
      leads: topLeads.map((l) => ({
        name: l.business.name,
        phone: l.business.phone,
        address: l.business.address,
        category: l.business.category,
        website: l.business.website,
        leadScore: l.leadScore,
        reason: l.reason,
        websiteIssues: l.websiteAnalysis?.issues || [],
      })),
      emailResult,
      jarvisResult,
    };
  },
});
