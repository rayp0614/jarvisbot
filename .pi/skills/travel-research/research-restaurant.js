#!/usr/bin/env node
/**
 * Research a specific restaurant using Google Maps
 *
 * Usage: node research-restaurant.js "Restaurant Name" "City"
 * Example: node research-restaurant.js "Canlis" "Seattle"
 */

const {
  connectBrowser,
  randomDelay,
  slowScroll,
  waitForElement,
  cleanReview
} = require('./utils');

async function researchRestaurant(restaurantName, city) {
  const browser = await connectBrowser();
  const page = await browser.newPage();

  // Set user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const result = {
    name: restaurantName,
    city: city,
    rating: null,
    reviewCount: null,
    priceRange: null,
    cuisine: null,
    address: null,
    phone: null,
    website: null,
    hours: null,
    reviewHighlights: [],
    concerns: [],
    topDishes: [],
    atmosphere: [],
    photos: []
  };

  try {
    // Search for the specific restaurant
    const query = `${restaurantName} ${city} restaurant`;
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    console.error(`Searching: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(2000, 3000);

    // Wait for results and click on first result
    const hasResults = await waitForElement(page, '[role="feed"]', 10000);

    if (hasResults) {
      // Click first result
      const firstResult = await page.$('[role="feed"] > div a[aria-label]');
      if (firstResult) {
        await firstResult.click();
        await randomDelay(2000, 3000);
      }
    }

    // Wait for details panel to load
    await waitForElement(page, '[role="main"]', 10000);
    await randomDelay(1000, 1500);

    // Extract basic info
    const basicInfo = await page.evaluate(() => {
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent?.trim() : null;
      };

      const getAttribute = (selector, attr) => {
        const el = document.querySelector(selector);
        return el ? el.getAttribute(attr) : null;
      };

      // Get title/name
      const name = getText('h1') || getText('[data-item-id="title"]');

      // Get rating
      const ratingEl = document.querySelector('[role="img"][aria-label*="star"]');
      const ratingText = ratingEl ? ratingEl.getAttribute('aria-label') : null;
      const ratingMatch = ratingText ? ratingText.match(/(\d\.?\d?)/) : null;
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

      // Get review count
      const reviewText = document.body.textContent;
      const reviewMatch = reviewText.match(/(\d+(?:,\d+)*)\s*reviews?/i);
      const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, ''), 10) : null;

      // Get price and category
      const categoryText = getText('[class*="fontBodyMedium"]');
      const priceMatch = categoryText ? categoryText.match(/(\$+)/) : null;
      const priceRange = priceMatch ? priceMatch[1] : null;

      // Get address
      const addressEl = document.querySelector('[data-item-id="address"]');
      const address = addressEl ? addressEl.textContent?.trim() : null;

      // Get phone
      const phoneEl = document.querySelector('[data-item-id^="phone"]');
      const phone = phoneEl ? phoneEl.textContent?.trim() : null;

      // Get website
      const websiteEl = document.querySelector('[data-item-id="authority"]');
      const website = websiteEl ? websiteEl.getAttribute('href') : null;

      // Get hours
      const hoursEl = document.querySelector('[aria-label*="hour"]');
      const hours = hoursEl ? hoursEl.getAttribute('aria-label') : null;

      return {
        name,
        rating,
        reviewCount,
        priceRange,
        address,
        phone,
        website,
        hours
      };
    });

    // Merge basic info
    Object.assign(result, {
      name: basicInfo.name || restaurantName,
      rating: basicInfo.rating,
      reviewCount: basicInfo.reviewCount,
      priceRange: basicInfo.priceRange,
      address: basicInfo.address,
      phone: basicInfo.phone,
      website: basicInfo.website,
      hours: basicInfo.hours
    });

    // Try to click on reviews tab to get detailed reviews
    console.error('Looking for reviews...');
    const reviewsTab = await page.$('button[aria-label*="Review"]');
    if (reviewsTab) {
      await reviewsTab.click();
      await randomDelay(2000, 3000);
      await slowScroll(page, 2);
    }

    // Extract reviews
    const reviews = await page.evaluate(() => {
      const reviewElements = document.querySelectorAll('[data-review-id]');
      const reviewData = [];

      reviewElements.forEach((el, idx) => {
        if (idx >= 15) return; // Limit to 15 reviews

        const textEl = el.querySelector('[class*="bodyText"], [class*="review-text"]');
        const text = textEl ? textEl.textContent?.trim() : null;

        const ratingEl = el.querySelector('[role="img"][aria-label*="star"]');
        const ratingText = ratingEl ? ratingEl.getAttribute('aria-label') : null;
        const ratingMatch = ratingText ? ratingText.match(/(\d)/) : null;
        const rating = ratingMatch ? parseInt(ratingMatch[1]) : null;

        if (text) {
          reviewData.push({ text, rating });
        }
      });

      return reviewData;
    });

    // Analyze reviews for highlights and concerns
    const positiveKeywords = ['amazing', 'excellent', 'best', 'love', 'great', 'fantastic', 'delicious', 'perfect', 'wonderful', 'recommend'];
    const negativeKeywords = ['slow', 'expensive', 'loud', 'crowded', 'wait', 'disappointed', 'mediocre', 'overrated', 'cold', 'rude'];
    const dishKeywords = ['ordered', 'tried', 'had the', 'recommend the', 'must try', 'favorite'];

    const highlights = [];
    const concerns = [];
    const dishes = new Set();

    reviews.forEach(review => {
      const text = review.text?.toLowerCase() || '';

      // Check for positive highlights
      positiveKeywords.forEach(keyword => {
        if (text.includes(keyword) && review.rating >= 4) {
          const sentence = extractSentenceWithKeyword(review.text, keyword);
          if (sentence && !highlights.includes(sentence)) {
            highlights.push(cleanReview(sentence, 100));
          }
        }
      });

      // Check for concerns
      negativeKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          const sentence = extractSentenceWithKeyword(review.text, keyword);
          if (sentence && !concerns.includes(sentence)) {
            concerns.push(cleanReview(sentence, 100));
          }
        }
      });

      // Try to extract dish mentions
      const dishMatches = text.match(/(?:ordered|tried|had|recommend)\s+(?:the\s+)?([a-z\s]+?)(?:\.|,|!|\band\b)/gi);
      if (dishMatches) {
        dishMatches.forEach(match => {
          const dish = match.replace(/^(ordered|tried|had|recommend)\s+(?:the\s+)?/i, '').replace(/[.,!].*/, '').trim();
          if (dish.length > 3 && dish.length < 40) {
            dishes.add(dish.charAt(0).toUpperCase() + dish.slice(1));
          }
        });
      }
    });

    result.reviewHighlights = highlights.slice(0, 5);
    result.concerns = concerns.slice(0, 3);
    result.topDishes = Array.from(dishes).slice(0, 5);

    // Generate summary
    result.summary = generateRestaurantSummary(result);

  } catch (error) {
    console.error('Research error:', error.message);
    result.error = error.message;
  } finally {
    await page.close();
  }

  return result;
}

function extractSentenceWithKeyword(text, keyword) {
  if (!text) return null;
  const sentences = text.split(/[.!?]+/);
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
      return sentence.trim();
    }
  }
  return null;
}

function cleanReview(text, maxLength = 100) {
  if (!text) return '';
  let cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength) + '...';
  }
  return cleaned;
}

function generateRestaurantSummary(result) {
  const parts = [];

  if (result.name) {
    parts.push(`${result.name}`);
  }

  if (result.rating) {
    parts.push(`is rated ${result.rating}/5`);
    if (result.reviewCount) {
      parts.push(`based on ${result.reviewCount.toLocaleString()} reviews`);
    }
  }

  if (result.priceRange) {
    parts.push(`Price: ${result.priceRange}`);
  }

  if (result.reviewHighlights.length > 0) {
    parts.push(`\n\nHighlights: ${result.reviewHighlights.slice(0, 2).join('; ')}`);
  }

  if (result.concerns.length > 0) {
    parts.push(`\n\nConsiderations: ${result.concerns.slice(0, 2).join('; ')}`);
  }

  if (result.topDishes.length > 0) {
    parts.push(`\n\nPopular dishes: ${result.topDishes.join(', ')}`);
  }

  return parts.join(' ');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node research-restaurant.js "Restaurant Name" "City"');
    console.error('Example: node research-restaurant.js "Canlis" "Seattle"');
    process.exit(1);
  }

  const restaurantName = args[0];
  const city = args[1];

  console.error(`\nResearching: "${restaurantName}" in ${city}\n`);

  const result = await researchRestaurant(restaurantName, city);

  // Output JSON to stdout
  const output = {
    query: `${restaurantName} ${city}`,
    timestamp: new Date().toISOString(),
    restaurant: result
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
