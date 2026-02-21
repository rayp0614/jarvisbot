// Lead scoring logic - determines which businesses are the best prospects
import { Business, WebsiteAnalysis, Lead } from "./types.js";

/**
 * Score a business as a potential lead
 * Higher score = better prospect for selling a website
 */
export function scoreLead(
  business: Business,
  websiteAnalysis: WebsiteAnalysis | null
): Lead {
  let score = 0;
  const reasons: string[] = [];

  // No website at all - best prospect!
  if (!business.website) {
    score += 50;
    reasons.push("Has no website (verified via Google)");
  } else if (business.websiteSource === "google_search") {
    // Website was found via Google (not in Outscraper data)
    // Still worth analyzing but note it wasn't in Google Maps
    score += 10;
    reasons.push("Website found via Google (not in Maps listing)");
    if (websiteAnalysis) {
      // Continue with normal website analysis
      const qualityScore = websiteAnalysis.score;
      if (qualityScore < 30) {
        score += 35;
        reasons.push("Website has major issues");
      } else if (qualityScore < 50) {
        score += 25;
        reasons.push("Website needs improvements");
      } else if (qualityScore < 70) {
        score += 15;
        reasons.push("Website could use updates");
      }
    }
  } else if (websiteAnalysis) {
    // Has website but it might be bad
    if (!websiteAnalysis.exists) {
      score += 45;
      reasons.push("Website is broken or unreachable");
    } else {
      // Score based on website quality (lower quality = higher lead score)
      const qualityScore = websiteAnalysis.score;

      if (qualityScore < 30) {
        score += 40;
        reasons.push("Website has major issues");
      } else if (qualityScore < 50) {
        score += 30;
        reasons.push("Website needs significant improvements");
      } else if (qualityScore < 70) {
        score += 20;
        reasons.push("Website could use some updates");
      } else {
        score += 5;
        reasons.push("Website is decent but could be better");
      }

      // Add specific issues as reasons
      if (!websiteAnalysis.hasSSL) {
        score += 10;
        reasons.push("No SSL (security risk)");
      }

      if (!websiteAnalysis.isMobileFriendly) {
        score += 10;
        reasons.push("Not mobile-friendly");
      }

      if (
        websiteAnalysis.copyrightYear &&
        websiteAnalysis.copyrightYear < 2022
      ) {
        score += 10;
        reasons.push(`Outdated (copyright ${websiteAnalysis.copyrightYear})`);
      }

      if (websiteAnalysis.loadTimeMs && websiteAnalysis.loadTimeMs > 5000) {
        score += 5;
        reasons.push("Slow loading");
      }
    }
  }

  // Boost score for businesses with good reviews (they have money to spend)
  if (business.rating && business.rating >= 4.0) {
    score += 10;
    reasons.push(`Well-reviewed (${business.rating} stars)`);
  }

  if (business.reviewCount && business.reviewCount >= 20) {
    score += 5;
    reasons.push(`Established business (${business.reviewCount} reviews)`);
  }

  // Boost for businesses with phone numbers (easier to contact)
  if (business.phone) {
    score += 5;
  }

  // Cap at 100
  score = Math.min(100, score);

  // Generate a summary reason
  const primaryReason =
    reasons.length > 0
      ? reasons.slice(0, 3).join("; ")
      : "Potential website improvement opportunity";

  return {
    business,
    websiteAnalysis,
    leadScore: score,
    reason: primaryReason,
  };
}

/**
 * Score and rank all businesses, return top leads
 */
export function rankLeads(
  businesses: Business[],
  websiteAnalyses: Map<string, WebsiteAnalysis | null>,
  limit: number = 20
): Lead[] {
  const leads: Lead[] = [];

  for (const business of businesses) {
    const analysis = business.website
      ? websiteAnalyses.get(business.website) || null
      : null;

    const lead = scoreLead(business, analysis);
    leads.push(lead);
  }

  // Sort by lead score descending
  leads.sort((a, b) => b.leadScore - a.leadScore);

  // Return top leads
  return leads.slice(0, limit);
}

/**
 * Categorize leads by priority
 */
export function categorizeLeads(leads: Lead[]): {
  hot: Lead[];
  warm: Lead[];
  cold: Lead[];
} {
  return {
    hot: leads.filter((l) => l.leadScore >= 60),
    warm: leads.filter((l) => l.leadScore >= 30 && l.leadScore < 60),
    cold: leads.filter((l) => l.leadScore < 30),
  };
}
