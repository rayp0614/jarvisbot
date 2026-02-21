// Outscraper API integration for finding local businesses
import { Business, OutscraperResult, DEFAULT_SEARCH_CONFIG, SearchConfig } from "./types.js";

const OUTSCRAPER_API_URL = "https://api.app.outscraper.com/maps/search-v3";

// Module-level config that can be set per-run
let currentConfig: SearchConfig = { ...DEFAULT_SEARCH_CONFIG };

/**
 * Set the search configuration for this run
 */
export function setSearchConfig(config: Partial<SearchConfig>): void {
  currentConfig = { ...DEFAULT_SEARCH_CONFIG, ...config };
}

/**
 * Get the current search configuration
 */
export function getSearchConfig(): SearchConfig {
  return currentConfig;
}

interface OutscraperResponse {
  id: string;
  status: string;
  data: OutscraperResult[][];
}

/**
 * Search for businesses using Outscraper Google Maps API
 * @param category - Business category to search for (e.g., "plumber", "restaurant")
 * @param limit - Maximum number of results to return
 */
export async function searchBusinesses(
  category: string,
  limit: number = currentConfig.businessesPerCategory
): Promise<Business[]> {
  const apiKey = process.env.OUTSCRAPER_API_KEY;
  if (!apiKey) {
    throw new Error("OUTSCRAPER_API_KEY is not set");
  }

  const query = `${category} near ${currentConfig.zipCode}`;

  const params = new URLSearchParams({
    query,
    limit: limit.toString(),
    async: "false", // Wait for results
    language: "en",
    region: "US",
  });

  console.log(`Searching Outscraper for: ${query}`);

  const response = await fetch(`${OUTSCRAPER_API_URL}?${params}`, {
    method: "GET",
    headers: {
      "X-API-KEY": apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Outscraper API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as OutscraperResponse;

  // Outscraper returns nested arrays, flatten and map to our Business type
  const results = data.data?.flat() || [];

  return results
    .filter((r) => r && r.name) // Filter out empty results
    .filter((r) => isWithinRadius(r.postal_code)) // Filter by radius
    .map((r) => ({
      name: r.name || "Unknown",
      phone: r.phone || null,
      address: r.full_address || "",
      city: r.city || "",
      state: r.state || "CT",
      zipCode: r.postal_code || "",
      website: r.site || null,
      category: r.type || category,
      rating: r.rating || null,
      reviewCount: r.reviews || null,
      placeId: r.place_id || "",
    }));
}

/**
 * Check if a zip code is within the search radius
 * This is a simplified check - in production you'd use actual geo distance
 */
function isWithinRadius(zipCode: string): boolean {
  // Hartford County CT zip codes within ~20 miles of 06002 (Bloomfield)
  const validZipPrefixes = [
    "060", // Most Hartford County zips start with 060
    "061", // Some nearby areas
  ];

  if (!zipCode) return true; // Include if no zip code

  return validZipPrefixes.some((prefix) => zipCode.startsWith(prefix));
}

/**
 * Search multiple categories and return combined results
 */
export async function searchAllCategories(
  categories: string[],
  limitPerCategory: number = 5
): Promise<Business[]> {
  const allBusinesses: Business[] = [];
  const seenPlaceIds = new Set<string>();

  for (const category of categories) {
    try {
      console.log(`Searching category: ${category}`);
      const businesses = await searchBusinesses(category, limitPerCategory);

      // Deduplicate by place ID
      for (const business of businesses) {
        if (!seenPlaceIds.has(business.placeId)) {
          seenPlaceIds.add(business.placeId);
          allBusinesses.push(business);
        }
      }

      // Small delay between API calls to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error searching ${category}:`, error);
      // Continue with other categories
    }
  }

  return allBusinesses;
}
