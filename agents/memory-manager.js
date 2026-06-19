class MemoryManager {
  constructor(maxSize = 1000) {
    this.shortTerm = [];  // Recent interactions
    this.longTerm = [];   // Important facts
    this.maxSize = maxSize;
  }

  add(content, importance = 0.5, category = 'general') {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      content,
      importance,
      category,
      accessCount: 0
    };

    this.shortTerm.unshift(entry);

    if (importance > 0.7) {
      this.longTerm.push(entry);
    }

    // Prune short-term memory
    if (this.shortTerm.length > this.maxSize) {
      this.shortTerm = this.shortTerm.slice(0, this.maxSize);
    }

    return entry;
  }

  search(query, limit = 10) {
    const all = [...this.shortTerm, ...this.longTerm];
    const scored = all.map(entry => ({
      ...entry,
      score: this.calculateRelevance(entry, query)
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  calculateRelevance(entry, query) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = entry.content.toLowerCase();
    let score = entry.importance * 0.3 + entry.accessCount * 0.1;

    for (const word of queryWords) {
      if (contentWords.includes(word)) score += 0.2;
    }

    // Recency bonus
    const age = Date.now() - new Date(entry.timestamp).getTime();
    score += Math.max(0, 1 - age / (24 * 60 * 60 * 1000)) * 0.3;

    return score;
  }

  getContext(recentCount = 5) {
    return this.shortTerm.slice(0, recentCount);
  }

  getImportant() {
    return this.longTerm.sort((a, b) => b.importance - a.importance);
  }

  clear() {
    this.shortTerm = [];
    this.longTerm = [];
  }

  export() {
    return {
      shortTerm: this.shortTerm,
      longTerm: this.longTerm,
      stats: {
        total: this.shortTerm.length + this.longTerm.length,
        shortTerm: this.shortTerm.length,
        longTerm: this.longTerm.length
      }
    };
  }
}

module.exports = MemoryManager;
