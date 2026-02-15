/**
 * Shared utilities for travel research scraping
 */

/**
 * Connect to Chrome via CDP (already running on port 9222 in Docker)
 */
async function connectBrowser() {
  const puppeteer = require('puppeteer-core');

  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: { width: 1280, height: 800 }
    });
    return browser;
  } catch (error) {
    console.error('Failed to connect to Chrome. Is it running on port 9222?');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

/**
 * Random delay to mimic human behavior
 */
function randomDelay(min = 500, max = 1500) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Scroll page slowly to load dynamic content
 */
async function slowScroll(page, scrolls = 3) {
  for (let i = 0; i < scrolls; i++) {
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight / 2);
    });
    await randomDelay(800, 1200);
  }
}

/**
 * Wait for element with timeout
 */
async function waitForElement(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe text extraction
 */
async function safeText(page, selector, defaultValue = '') {
  try {
    const element = await page.$(selector);
    if (element) {
      const text = await page.evaluate(el => el.textContent, element);
      return text ? text.trim() : defaultValue;
    }
  } catch {
    // Ignore errors
  }
  return defaultValue;
}

/**
 * Extract multiple elements' text
 */
async function extractTexts(page, selector, limit = 10) {
  try {
    const texts = await page.$$eval(selector, (elements, max) => {
      return elements.slice(0, max).map(el => el.textContent?.trim()).filter(Boolean);
    }, limit);
    return texts;
  } catch {
    return [];
  }
}

/**
 * Parse rating from string (e.g., "4.5 stars" -> 4.5)
 */
function parseRating(text) {
  if (!text) return null;
  const match = text.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Parse review count from string (e.g., "(234 reviews)" -> 234)
 */
function parseReviewCount(text) {
  if (!text) return null;
  const match = text.match(/(\d+(?:,\d+)*)/);
  if (match) {
    return parseInt(match[1].replace(/,/g, ''), 10);
  }
  return null;
}

/**
 * Parse price range from symbols ($ to $$$$)
 */
function parsePriceRange(text) {
  if (!text) return null;
  const match = text.match(/(\$+)/);
  return match ? match[1] : null;
}

/**
 * Clean and truncate review text
 */
function cleanReview(text, maxLength = 200) {
  if (!text) return '';
  let cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength) + '...';
  }
  return cleaned;
}

/**
 * Generate summary from results
 */
function generateSummary(results) {
  if (!results || results.length === 0) {
    return 'No results found for this search.';
  }

  const avgRating = results.reduce((sum, r) => sum + (r.rating || 0), 0) / results.length;
  const topRated = results.filter(r => r.rating >= 4.5);
  const priceRanges = [...new Set(results.map(r => r.priceRange).filter(Boolean))];

  let summary = `Found ${results.length} results. `;
  summary += `Average rating: ${avgRating.toFixed(1)} stars. `;

  if (topRated.length > 0) {
    summary += `Top rated (4.5+): ${topRated.map(r => r.name).join(', ')}. `;
  }

  if (priceRanges.length > 0) {
    summary += `Price ranges: ${priceRanges.join(', ')}.`;
  }

  return summary;
}

/**
 * Format output as JSON
 */
function formatOutput(query, results, summary = null) {
  return {
    query,
    timestamp: new Date().toISOString(),
    resultCount: results.length,
    results,
    summary: summary || generateSummary(results)
  };
}

module.exports = {
  connectBrowser,
  randomDelay,
  slowScroll,
  waitForElement,
  safeText,
  extractTexts,
  parseRating,
  parseReviewCount,
  parsePriceRange,
  cleanReview,
  generateSummary,
  formatOutput
};
