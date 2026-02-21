// Google Search verification for businesses without websites
// Catches false positives where Outscraper missed the website
import { logger } from "@trigger.dev/sdk/v3";
import { Business } from "./types.js";

const SERPER_API_KEY = process.env.SERPER_API_KEY;

interface SerperResult {
  organic?: Array<{
    title: string;
    link: string;
    snippet?: string;
  }>;
  knowledgeGraph?: {
    website?: string;
    attributes?: Record<string, string>;
  };
}

/**
 * Search Google for a business website using Serper API
 * Returns the website URL if found, null otherwise
 */
async function searchForWebsite(business: Business): Promise<string | null> {
  if (!SERPER_API_KEY) {
    logger.warn("⚠️ SERPER_API_KEY not set, skipping Google verification");
    return null;
  }

  // Build search query: "Business Name City State website"
  const cityState = business.address
    ?.match(/([A-Za-z\s]+),?\s*([A-Z]{2})/)?.[0] || "";
  const searchQuery = `${business.name} ${cityState} website`.trim();

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 5,
      }),
    });

    if (!response.ok) {
      logger.error(`Serper API error: ${response.status}`);
      return null;
    }

    const data: SerperResult = await response.json();

    // Check knowledge graph first (most reliable)
    if (data.knowledgeGraph?.website) {
      logger.info(`✅ Found website in knowledge graph for ${business.name}: ${data.knowledgeGraph.website}`);
      return data.knowledgeGraph.website;
    }

    // Check organic results for official website
    if (data.organic && data.organic.length > 0) {
      // Look for results that match business name (avoid directories like Yelp, Yellow Pages)
      const directoryDomains = [
        "yelp.com",
        "yellowpages.com",
        "bbb.org",
        "facebook.com",
        "linkedin.com",
        "mapquest.com",
        "manta.com",
        "chamberofcommerce.com",
        "angi.com",
        "homeadvisor.com",
        "thumbtack.com",
        "google.com/maps",
      ];

      for (const result of data.organic) {
        const url = new URL(result.link);
        const domain = url.hostname.replace("www.", "");

        // Skip directory sites
        if (directoryDomains.some((d) => domain.includes(d))) {
          continue;
        }

        // Check if the title/snippet mentions the business name
        const businessNameLower = business.name.toLowerCase();
        const titleLower = result.title.toLowerCase();
        const snippetLower = result.snippet?.toLowerCase() || "";

        // Simple name match - at least first word of business name
        const firstWord = businessNameLower.split(/\s+/)[0];
        if (
          titleLower.includes(firstWord) ||
          snippetLower.includes(firstWord)
        ) {
          logger.info(`✅ Found likely website for ${business.name}: ${result.link}`);
          return result.link;
        }
      }
    }

    logger.info(`❌ No website found for ${business.name}`);
    return null;
  } catch (error) {
    logger.error(`Google search failed for ${business.name}:`, { error });
    return null;
  }
}

/**
 * Verify businesses that appear to have no website
 * Returns updated businesses with discovered websites
 */
export async function verifyNoWebsiteBusinesses(
  businesses: Business[]
): Promise<Business[]> {
  // Find businesses without websites
  const noWebsiteBusinesses = businesses.filter((b) => !b.website);

  if (noWebsiteBusinesses.length === 0) {
    logger.info("All businesses have websites, skipping verification");
    return businesses;
  }

  logger.info(
    `🔍 Verifying ${noWebsiteBusinesses.length} businesses without websites...`
  );

  // Process in batches to avoid rate limits
  const BATCH_SIZE = 5;
  const discoveredWebsites = new Map<string, string>();

  for (let i = 0; i < noWebsiteBusinesses.length; i += BATCH_SIZE) {
    const batch = noWebsiteBusinesses.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (business) => {
        const website = await searchForWebsite(business);
        return { business, website };
      })
    );

    for (const { business, website } of results) {
      if (website) {
        discoveredWebsites.set(business.name, website);
      }
    }

    // Small delay between batches
    if (i + BATCH_SIZE < noWebsiteBusinesses.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  logger.info(
    `📊 Google verification: Found ${discoveredWebsites.size} websites out of ${noWebsiteBusinesses.length} checked`
  );

  // Update businesses with discovered websites
  return businesses.map((business) => {
    const discoveredUrl = discoveredWebsites.get(business.name);
    if (discoveredUrl) {
      return {
        ...business,
        website: discoveredUrl,
        websiteSource: "google_search" as const,
      };
    }
    return business;
  });
}
