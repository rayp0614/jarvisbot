// Website analysis using Firecrawl to detect outdated/missing websites
import { WebsiteAnalysis } from "./types.js";

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1/scrape";

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
      ogImage?: string;
      sourceURL?: string;
      statusCode?: number;
    };
    llm_extraction?: Record<string, unknown>;
  };
  error?: string;
}

/**
 * Analyze a website to determine if it's outdated or needs improvement
 */
export async function analyzeWebsite(
  url: string
): Promise<WebsiteAnalysis | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not set");
  }

  // Ensure URL has protocol
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;

  console.log(`Analyzing website: ${fullUrl}`);

  const startTime = Date.now();

  try {
    const response = await fetch(FIRECRAWL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: fullUrl,
        formats: ["markdown", "html"],
        onlyMainContent: false,
        timeout: 30000,
      }),
    });

    const loadTimeMs = Date.now() - startTime;

    if (!response.ok) {
      // Website doesn't exist or is broken
      if (response.status === 404 || response.status === 500) {
        return {
          url: fullUrl,
          exists: false,
          hasSSL: false,
          isMobileFriendly: false,
          loadTimeMs: null,
          copyrightYear: null,
          hasSocialLinks: false,
          socialLinks: {},
          issues: ["Website does not exist or is unreachable"],
          score: 0, // Worst score - definitely needs a website
        };
      }
      throw new Error(`Firecrawl API error: ${response.status}`);
    }

    const data = (await response.json()) as FirecrawlResponse;

    if (!data.success || !data.data) {
      return {
        url: fullUrl,
        exists: false,
        hasSSL: false,
        isMobileFriendly: false,
        loadTimeMs: null,
        copyrightYear: null,
        hasSocialLinks: false,
        socialLinks: {},
        issues: ["Website could not be analyzed"],
        score: 10,
      };
    }

    const html = data.data.html || "";
    const markdown = data.data.markdown || "";

    // Analyze the website
    const hasSSL = fullUrl.startsWith("https://");
    const copyrightYear = extractCopyrightYear(html);
    const socialLinks = extractSocialLinks(html);
    const isMobileFriendly = checkMobileFriendly(html);

    // Calculate issues
    const issues: string[] = [];

    if (!hasSSL) {
      issues.push("No SSL certificate (not secure)");
    }

    if (copyrightYear && copyrightYear < 2023) {
      issues.push(`Copyright year is ${copyrightYear} (outdated)`);
    }

    if (!isMobileFriendly) {
      issues.push("Not mobile-friendly (no viewport meta tag)");
    }

    if (loadTimeMs > 5000) {
      issues.push(`Slow load time (${(loadTimeMs / 1000).toFixed(1)}s)`);
    }

    if (Object.keys(socialLinks).length === 0) {
      issues.push("No social media links found");
    }

    if (html.length < 5000) {
      issues.push("Very minimal website content");
    }

    // Calculate score (0-100, lower = needs website more)
    let score = 100;
    if (!hasSSL) score -= 25;
    if (copyrightYear && copyrightYear < 2023) score -= 20;
    if (!isMobileFriendly) score -= 20;
    if (loadTimeMs > 5000) score -= 15;
    if (Object.keys(socialLinks).length === 0) score -= 10;
    if (html.length < 5000) score -= 10;

    return {
      url: fullUrl,
      exists: true,
      hasSSL,
      isMobileFriendly,
      loadTimeMs,
      copyrightYear,
      hasSocialLinks: Object.keys(socialLinks).length > 0,
      socialLinks,
      issues,
      score: Math.max(0, score),
    };
  } catch (error) {
    console.error(`Error analyzing ${fullUrl}:`, error);

    // Website likely doesn't exist or has major issues
    return {
      url: fullUrl,
      exists: false,
      hasSSL: false,
      isMobileFriendly: false,
      loadTimeMs: null,
      copyrightYear: null,
      hasSocialLinks: false,
      socialLinks: {},
      issues: ["Website unreachable or has critical errors"],
      score: 5,
    };
  }
}

/**
 * Extract copyright year from HTML
 */
function extractCopyrightYear(html: string): number | null {
  // Look for patterns like "© 2023" or "Copyright 2023"
  const patterns = [
    /©\s*(\d{4})/,
    /copyright\s*(\d{4})/i,
    /&copy;\s*(\d{4})/,
    /(\d{4})\s*©/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const year = parseInt(match[1], 10);
      if (year >= 2000 && year <= new Date().getFullYear()) {
        return year;
      }
    }
  }

  return null;
}

/**
 * Extract social media links from HTML
 */
function extractSocialLinks(html: string): Record<string, string> {
  const links: Record<string, string> = {};

  const patterns: [string, RegExp][] = [
    ["facebook", /href=["'](https?:\/\/(www\.)?facebook\.com\/[^"']+)["']/i],
    ["instagram", /href=["'](https?:\/\/(www\.)?instagram\.com\/[^"']+)["']/i],
    ["twitter", /href=["'](https?:\/\/(www\.)?(twitter|x)\.com\/[^"']+)["']/i],
    ["linkedin", /href=["'](https?:\/\/(www\.)?linkedin\.com\/[^"']+)["']/i],
  ];

  for (const [platform, pattern] of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      links[platform] = match[1];
    }
  }

  return links;
}

/**
 * Check if website has mobile-friendly viewport meta tag
 */
function checkMobileFriendly(html: string): boolean {
  return /viewport/i.test(html) && /width=device-width/i.test(html);
}

/**
 * Analyze multiple websites with rate limiting
 */
export async function analyzeWebsites(
  urls: (string | null)[]
): Promise<Map<string, WebsiteAnalysis | null>> {
  const results = new Map<string, WebsiteAnalysis | null>();

  for (const url of urls) {
    if (!url) {
      continue;
    }

    try {
      const analysis = await analyzeWebsite(url);
      results.set(url, analysis);

      // Rate limit: Firecrawl free tier has limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to analyze ${url}:`, error);
      results.set(url, null);
    }
  }

  return results;
}
