---
name: local-web-scraper
description: >
  Zero-external-API web scraper using local Playwright/Puppeteer. Auto-activate for:
  scraping websites, extracting web content, crawling pages, taking web screenshots,
  monitoring websites, extracting structured data from URLs, competitive research,
  content monitoring, DOM extraction, filling forms programmatically, batch URL processing.
  Triggers: "scrape", "crawl", "extract from website", "get content from URL",
  "screenshot a page", "monitor this site", "pull data from", "web extraction".
  IMPORTANT: Only for PUBLIC URLs. Never scrape authenticated, private, or internal URLs.
  Zero data leaves your machine — all processing is local via headless Chromium.
---

# Local Web Scraper (Playwright — Zero External API)

## Privacy & Security Guarantee
- ✅ 100% local — headless Chromium runs on YOUR machine
- ✅ No API keys required
- ✅ No data transmitted to any external service
- ✅ Free forever (open source)
- ❌ Do NOT use for authenticated URLs, internal tools, or staging environments

---

## Prerequisites Check

Before scraping, verify Playwright is installed:
```bash
# Check
node -e "require('playwright')" 2>/dev/null && echo "Ready" || echo "Need install"

# Install if needed (one-time)
npm install -g playwright
npx playwright install chromium
```

---

## Core Patterns

### 1. Extract Text Content from a Page
```javascript
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://example.com', { waitUntil: 'networkidle' });
const text = await page.textContent('body');
await browser.close();
console.log(text);
```

### 2. Extract Structured Data (Tables, Lists, Cards)
```javascript
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle' });

const data = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('table tr')).map(row =>
    Array.from(row.querySelectorAll('td, th')).map(cell => cell.innerText.trim())
  );
});
await browser.close();
```

### 3. Screenshot a Page
```javascript
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle' });
await page.screenshot({ path: 'screenshot.png', fullPage: true });
await browser.close();
```

### 4. Batch Crawl Multiple URLs
```javascript
const { chromium } = require('playwright');
const browser = await chromium.launch();
const results = [];

for (const url of urls) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const title = await page.title();
    const content = await page.textContent('main, article, body');
    results.push({ url, title, content });
  } catch (e) {
    results.push({ url, error: e.message });
  } finally {
    await page.close();
  }
}
await browser.close();
```

### 5. Dynamic JS-Rendered Content (SPAs, React, Vue apps)
```javascript
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url);
// Wait for a specific element to appear (React/Vue apps need this)
await page.waitForSelector('.product-list', { timeout: 10000 });
const items = await page.$$eval('.product-card', cards =>
  cards.map(c => ({
    title: c.querySelector('h3')?.innerText,
    price: c.querySelector('.price')?.innerText,
    link: c.querySelector('a')?.href
  }))
);
await browser.close();
```

### 6. Interact with Page (Click, Scroll, Form)
```javascript
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: false }); // headless:false to watch
const page = await browser.newPage();
await page.goto(url);
await page.click('#load-more-button');
await page.waitForTimeout(2000); // wait for content to load
await page.scroll(0, 1000); // scroll down
const newContent = await page.textContent('.results');
await browser.close();
```

---

## Decision Guide

| Need | Pattern to Use |
|---|---|
| Plain article/blog text | Pattern 1 — textContent |
| Tables, product listings | Pattern 2 — evaluate + querySelectorAll |
| Visual page snapshot | Pattern 3 — screenshot |
| Many URLs at once | Pattern 4 — batch crawl |
| React/Vue/Angular app | Pattern 5 — waitForSelector |
| Paginated content | Pattern 6 — click + scroll |

---

## Output Formats

Always offer to save output as:
- `.json` — structured data, easy to process
- `.md` — readable content, good for analysis
- `.csv` — tabular data, for spreadsheets
- `.png` — screenshots

---

## Responsible Use Rules

1. **Check robots.txt** before crawling: `https://example.com/robots.txt`
2. **Rate limit** batch jobs: add `await page.waitForTimeout(1000)` between requests
3. **Never scrape** login-gated, private, or internal pages
4. **Respect ToS** — don't automate actions that the site's ToS prohibits
5. **No data persistence** beyond your local machine
