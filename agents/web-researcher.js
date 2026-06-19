const axios = require('axios');

class WebResearcher {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.cache = new Map();
  }

  async search(query, maxResults = 5) {
    if (!this.apiKey) {
      console.warn('[WebResearcher] No SERPER_API_KEY configured. Returning empty results.');
      return [];
    }
    try {
      const response = await axios.post('https://google.serper.dev/search', {
        q: query,
        num: maxResults
      }, {
        headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' },
        timeout: 15000
      });
      return response.data.organic || [];
    } catch (error) {
      console.error('Search failed:', error.message);
      return [];
    }
  }

  async fetchPage(url) {
    try {
      const response = await axios.get(url, { 
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      // Strip HTML tags for text extraction
      const text = response.data
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 5000);
      return text;
    } catch (error) {
      return `Failed to fetch: ${error.message}`;
    }
  }

  async deepResearch(topic, depth = 3) {
    const results = await this.search(topic, depth);
    const findings = [];

    for (const result of results.slice(0, depth)) {
      const content = await this.fetchPage(result.link);
      findings.push({
        title: result.title,
        url: result.link,
        snippet: result.snippet,
        content: content.substring(0, 2000),
        fetchedAt: new Date().toISOString()
      });
    }

    return findings;
  }
}

module.exports = WebResearcher;
