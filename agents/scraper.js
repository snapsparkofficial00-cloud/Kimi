const axios = require('axios');
const cheerio = require('cheerio');

class ScraperAgent {
  constructor(config = {}) {
    this.rateLimit = config.rateLimit || 1000;
    this.userAgent = config.userAgent || 'NeuroSwarm-Bot/1.0';
    this.cache = new Map();
    this.lastRequest = 0;
  }

  async delay() {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.rateLimit) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimit - elapsed));
    }
    this.lastRequest = Date.now();
  }

  async fetchPage(url, options = {}) {
    await this.delay();

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          ...options.headers
        },
        timeout: options.timeout || 15000,
        maxRedirects: options.maxRedirects || 5
      });

      this.cache.set(url, {
        html: response.data,
        status: response.status,
        headers: response.headers,
        fetchedAt: new Date()
      });

      return {
        success: true,
        html: response.data,
        status: response.status,
        url: response.request.res.responseUrl || url
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  parseHTML(html, selectors) {
    const $ = cheerio.load(html);
    const results = {};

    for (const [key, selector] of Object.entries(selectors)) {
      const elements = $(selector);
      results[key] = elements.map((i, el) => {
        const $el = $(el);
        return {
          text: $el.text().trim(),
          html: $el.html(),
          href: $el.attr('href'),
          src: $el.attr('src'),
          alt: $el.attr('alt'),
          title: $el.attr('title')
        };
      }).get();
    }

    return results;
  }

  async scrapeArticle(url) {
    const page = await this.fetchPage(url);
    if (!page.success) return page;

    const selectors = {
      title: 'h1, .article-title, .post-title, [property="og:title"]',
      author: '.author, [rel="author"], .byline',
      date: 'time, .date, .published, [property="article:published_time"]',
      content: 'article, .article-content, .post-content, .entry-content, [property="og:description"]',
      images: 'img[src]'
    };

    const data = this.parseHTML(page.html, selectors);

    return {
      success: true,
      url: page.url,
      title: data.title[0]?.text || 'Unknown',
      author: data.author[0]?.text || 'Unknown',
      date: data.date[0]?.text || data.date[0]?.title || 'Unknown',
      content: data.content.map(c => c.text).join('\n').substring(0, 5000),
      images: data.images.map(img => img.src).filter(Boolean),
      wordCount: data.content.map(c => c.text).join(' ').split(/\s+/).length
    };
  }

  async scrapeProducts(url, productSelector) {
    const page = await this.fetchPage(url);
    if (!page.success) return page;

    const $ = cheerio.load(page.html);
    const products = [];

    $(productSelector).each((i, el) => {
      const $el = $(el);
      products.push({
        name: $el.find('.product-title, h2, h3, .title').first().text().trim(),
        price: $el.find('.price, [class*="price"]').first().text().trim(),
        image: $el.find('img').first().attr('src'),
        link: $el.find('a').first().attr('href'),
        rating: $el.find('.rating, [class*="rating"]').first().text().trim()
      });
    });

    return { success: true, products: products.filter(p => p.name) };
  }

  async scrapeTable(url, tableSelector = 'table') {
    const page = await this.fetchPage(url);
    if (!page.success) return page;

    const $ = cheerio.load(page.html);
    const tables = [];

    $(tableSelector).each((i, table) => {
      const $table = $(table);
      const headers = $table.find('th').map((j, th) => $(th).text().trim()).get();
      const rows = [];

      $table.find('tr').each((j, tr) => {
        const cells = $(tr).find('td').map((k, td) => $(td).text().trim()).get();
        if (cells.length > 0) rows.push(cells);
      });

      tables.push({ headers, rows });
    });

    return { success: true, tables };
  }

  async scrapeSitemap(url) {
    const page = await this.fetchPage(url);
    if (!page.success) return page;

    const $ = cheerio.load(page.html);
    const links = [];

    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && (href.startsWith('http') || href.startsWith('/'))) {
        links.push({
          url: href.startsWith('http') ? href : new URL(href, url).href,
          text: $(el).text().trim(),
          title: $(el).attr('title')
        });
      }
    });

    return { success: true, links: [...new Map(links.map(l => [l.url, l])).values()] };
  }

  async monitorChanges(url, selector, callback, interval = 60000) {
    let lastContent = '';

    const check = async () => {
      const page = await this.fetchPage(url);
      if (!page.success) return;

      const $ = cheerio.load(page.html);
      const currentContent = $(selector).text().trim();

      if (lastContent && currentContent !== lastContent) {
        callback({
          url,
          selector,
          previous: lastContent,
          current: currentContent,
          changedAt: new Date()
        });
      }

      lastContent = currentContent;
    };

    check();
    return setInterval(check, interval);
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      urls: Array.from(this.cache.keys()),
      oldest: this.cache.size > 0 ? Array.from(this.cache.values())[0].fetchedAt : null
    };
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = ScraperAgent;
