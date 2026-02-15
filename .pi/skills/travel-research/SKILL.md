---
name: travel-research
description: Research restaurants, attractions, and local spots using browser automation. Scrapes Google Maps for ratings, reviews, menus, and recommendations. Use this skill for any travel planning, restaurant research, or local exploration tasks.
---

# Travel Research Skill

Research restaurants, attractions, and local spots with comprehensive summaries including ratings, reviews, price ranges, and AI-generated recommendations.

## When to Use

- User asks about restaurants in an area ("best Italian restaurants in Seattle")
- User wants to research a specific restaurant ("tell me about Canlis Seattle")
- User needs attraction/spot information ("things to do in Capitol Hill")
- User wants menu information or price ranges
- User wants review summaries for travel planning

## Available Scripts

### 1. `research-area.js` - Area-Based Search

Search for multiple restaurants/spots in an area.

```bash
node .pi/skills/travel-research/research-area.js "Italian restaurants Capitol Hill Seattle"
```

**Output:** JSON with top 5-10 results including ratings, reviews, prices.

### 2. `research-restaurant.js` - Single Restaurant Deep Dive

Get detailed information about a specific restaurant.

```bash
node .pi/skills/travel-research/research-restaurant.js "Canlis" "Seattle"
```

**Output:** JSON with full details including reviews, menu highlights, hours.

## Output Format

```json
{
  "query": "search query",
  "timestamp": "ISO date",
  "results": [
    {
      "name": "Restaurant Name",
      "rating": 4.5,
      "reviewCount": 234,
      "priceRange": "$$",
      "cuisine": "Italian",
      "address": "123 Main St, Seattle WA",
      "phone": "(206) 555-1234",
      "hours": "Mon-Sun 11am-10pm",
      "website": "https://example.com",
      "reviewHighlights": [
        "Amazing pasta dishes",
        "Great wine selection",
        "Cozy atmosphere"
      ],
      "concerns": [
        "Can get crowded on weekends",
        "Limited parking"
      ],
      "topDishes": [
        "Carbonara",
        "Margherita Pizza",
        "Tiramisu"
      ]
    }
  ],
  "summary": "AI-generated summary of findings"
}
```

## Best Practices

1. **Be specific with location** - Include neighborhood or city name
2. **Specify cuisine type** - "Thai restaurants" vs just "restaurants"
3. **For single restaurants** - Include the city to avoid confusion
4. **Save results** - Output is JSON, save to file for reference

## Example Prompts

- "Research the top 5 ramen restaurants in Seattle's International District"
- "Find me highly-rated brunch spots in Capitol Hill with outdoor seating"
- "What are the best-reviewed Italian restaurants near Pike Place Market?"
- "Tell me about the menu and reviews for Din Tai Fung Seattle"
- "Research romantic dinner spots in Bellevue for an anniversary"

## Technical Notes

- Uses Puppeteer to connect to Chrome on CDP port 9222
- Scrapes Google Maps for comprehensive data
- Includes delays to avoid rate limiting
- Results are cached in the job's log directory
