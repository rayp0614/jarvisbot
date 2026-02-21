// Types for the lead finder automation

export interface Business {
  name: string;
  phone: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  website: string | null;
  category: string;
  rating: number | null;
  reviewCount: number | null;
  placeId: string;
}

export interface WebsiteAnalysis {
  url: string;
  exists: boolean;
  hasSSL: boolean;
  isMobileFriendly: boolean;
  loadTimeMs: number | null;
  copyrightYear: number | null;
  hasSocialLinks: boolean;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  issues: string[];
  score: number; // 0-100, lower = needs website more
}

export interface Lead {
  business: Business;
  websiteAnalysis: WebsiteAnalysis | null;
  leadScore: number; // 0-100, higher = better prospect
  reason: string; // Why this is a good lead
}

export interface OutscraperResult {
  name: string;
  full_address: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
  site: string;
  type: string;
  rating: number;
  reviews: number;
  place_id: string;
}

// Business categories to search for
export const BUSINESS_CATEGORIES = [
  "plumber",
  "electrician",
  "hvac contractor",
  "landscaper",
  "house cleaning service",
  "auto repair shop",
  "dentist",
  "accountant",
  "hair salon",
  "restaurant",
  "cafe",
  "bakery",
  "florist",
  "pet groomer",
  "dry cleaner",
  "chiropractor",
  "physical therapist",
  "real estate agent",
  "insurance agent",
  "lawyer",
];

// Default search configuration (can be overridden via task parameters)
export const DEFAULT_SEARCH_CONFIG = {
  zipCode: "06002",
  radiusMiles: 20,
  leadsPerWeek: 20,
  businessesPerCategory: 10,
};

// Runtime search configuration (set by task parameters)
export interface SearchConfig {
  zipCode: string;
  radiusMiles: number;
  leadsPerWeek: number;
  businessesPerCategory: number;
}

// For backwards compatibility
export const SEARCH_CONFIG = DEFAULT_SEARCH_CONFIG;
