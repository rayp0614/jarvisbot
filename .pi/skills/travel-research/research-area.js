#!/usr/bin/env node
/**
 * Research restaurants/attractions in an area using Google Maps
 *
 * Usage: node research-area.js "Italian restaurants Capitol Hill Seattle"
 */

const {
  connectBrowser,
  randomDelay,
  slowScroll,
  waitForElement,
  parseRating,
  parseReviewCount,
  parsePriceRange,
  cleanReview,
  formatOutput
} = require('./utils');

async function searchGoogleMaps(query) {
  const browser = await connectBrowser();
  const page = await browser.newPage();

  // Set user agent to avoid detection
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const results = [];

  try {
    // Navigate to Google Maps search
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    console.error(`Searching: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(2000, 3000);

    // Wait for results to load
    const hasResults = await waitForElement(page, '[role="feed"]', 15000);

    if (!hasResults) {
      console.error('No results feed found, trying alternate selectors...');
    }

    // Scroll to load more results
    await slowScroll(page, 3);

    // Extract listing data from the results feed
    const listings = await page.$$eval('[role="feed"] > div', (elements) => {
      const data = [];

      for (const el of elements.slice(0, 10)) { // Limit to 10 results
        try {
          // Find the main link/title
          const titleEl = el.querySelector('a[aria-label]');
          if (!titleEl) continue;

          const name = titleEl.getAttribute('aria-label');
          if (!name) continue;

          // Get the text content for parsing
          const textContent = el.textContent || '';

          // Extract rating (look for pattern like "4.5")
          const ratingMatch = textContent.match(/(\d\.\d)\s*\(\d/);
          const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

          // Extract review count (look for pattern like "(234)")
          const reviewMatch = textContent.match(/\((\d+(?:,\d+)*)\)/);
          const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, ''), 10) : null;

          // Extract price range ($ to $$$$)
          const priceMatch = textContent.match(/·\s*(\$+)\s*·/);
          const priceRange = priceMatch ? priceMatch[1] : null;

          // Extract category/cuisine (usually after price)
          const categoryMatch = textContent.match(/·\s*\$*\s*·?\s*([A-Za-z\s]+(?:restaurant|cuisine|food)?)/i);
          const cuisine = categoryMatch ? categoryMatch[1].trim() : null;

          // Try to get address
          const addressMatch = textContent.match(/(\d+\s+[A-Za-z0-9\s,]+(?:St|Ave|Blvd|Dr|Rd|Way|Ln))/i);
          const address = addressMatch ? addressMatch[1].trim() : null;

          data.push({
            name,
            rating,
            reviewCount,
            priceRange,
            cuisine,
            address
          });
        } catch (e) {
          // Skip this element on error
        }
      }

      return data;
    });

    // For each listing, try to get more details by clicking
    for (let i = 0; i < Math.min(listings.length, 5); i++) {
      const listing = listings[i];

      try {
        // Click on the listing to get more details
        const linkSelector = `a[aria-label="${listing.name.replace(/"/g, '\\"')}"]`;
        const link = await page.$(linkSelector);

        if (link) {
          await link.click();
          await randomDelay(1500, 2500);

          // Wait for details panel
          await waitForElement(page, '[role="main"]', 5000);

          // Extract additional details
          const details = await page.evaluate(() => {
            const getText = (selector) => {
              const el = document.querySelector(selector);
              return el ? el.textContent?.trim() : null;
            };

            // Try to find hours
            const hoursEl = document.querySelector('[data-item-id="oh"]');
            const hours = hoursEl ? hoursEl.textContent?.trim() : null;

            // Try to find phone
            const phoneEl = document.querySelector('[data-item-id^="phone"]');
            const phone = phoneEl ? phoneEl.textContent?.trim() : null;

            // Try to find website
            const websiteEl = document.querySelector('[data-item-id="authority"]');
            const website = websiteEl ? websiteEl.getAttribute('href') : null;

            // Try to extract some reviews
            const reviewEls = document.querySelectorAll('[class*="review"] [class*="text"]');
            const reviews = Array.from(reviewEls).slice(0, 3).map(el => el.textContent?.trim()).filter(Boolean);

            return { hours, phone, website, reviews };
          });

          // Merge details into listing
          listing.hours = details.hours;
          listing.phone = details.phone;
          listing.website = details.website;
          listing.reviewHighlights = details.reviews.map(r => cleanReview(r, 150));

          // Go back to results
          await page.goBack({ waitUntil: 'networkidle2' });
          await randomDelay(1000, 1500);
        }
      } catch (e) {
        console.error(`Error getting details for ${listing.name}:`, e.message);
      }

      results.push(listing);
    }

    // Add remaining listings without detailed info
    for (let i = 5; i < listings.length; i++) {
      results.push(listings[i]);
    }

  } catch (error) {
    console.error('Search error:', error.message);
  } finally {
    await page.close();
    // Don't disconnect - other scripts may use the browser
  }

  return results;
}

// Helper to clean review text (duplicated here for browser context)
function cleanReview(text, maxLength = 150) {
  if (!text) return '';
  let cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength) + '...';
  }
  return cleaned;
}

async function main() {
  const query = process.argv.slice(2).join(' ');

  if (!query) {
    console.error('Usage: node research-area.js "Italian restaurants Capitol Hill Seattle"');
    process.exit(1);
  }

  console.error(`\nResearching: "${query}"\n`);

  const results = await searchGoogleMaps(query);

  // Generate output
  const output = formatOutput(query, results);

  // Add helpful summary
  if (results.length > 0) {
    const topRated = results.filter(r => r.rating >= 4.5).sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const mostReviewed = [...results].sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));

    output.recommendations = {
      topRated: topRated.slice(0, 3).map(r => r.name),
      mostPopular: mostReviewed.slice(0, 3).map(r => r.name)
    };
  }

  // Output JSON to stdout
  console.log(JSON.stringify(output, null, 2));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
