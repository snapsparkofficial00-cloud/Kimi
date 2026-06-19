const axios = require('axios');

class SocialMediaAgent {
  constructor(config = {}) {
    this.platforms = {
      twitter: config.twitter || null,
      instagram: config.instagram || null,
      linkedin: config.linkedin || null,
      facebook: config.facebook || null,
      tiktok: config.tiktok || null,
      youtube: config.youtube || null
    };
    this.contentCalendar = [];
    this.postedContent = [];
  }

  async generatePost(topic, platform, tone = 'professional') {
    // Returns a structured post object - actual content generation happens via AI agent
    return {
      platform,
      content: `Post about: ${topic}`,
      hashtags: this.generateHashtags(topic),
      scheduledTime: null,
      status: 'draft',
      tone,
      maxChars: this.getCharLimit(platform)
    };
  }

  generateHashtags(topic) {
    const words = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    return words.map(w => '#' + w.replace(/[^a-z0-9]/g, ''));
  }

  getCharLimit(platform) {
    const limits = { twitter: 280, linkedin: 3000, instagram: 2200, facebook: 63206, tiktok: 2200, threads: 500 };
    return limits[platform] || 2000;
  }

  schedulePost(content, dateTime) {
    const post = { ...content, scheduledTime: dateTime, status: 'scheduled', id: Date.now() };
    this.contentCalendar.push(post);
    return post;
  }

  async postToTwitter(content, apiKey, apiSecret) {
    if (!this.platforms.twitter?.accessToken) {
      return { success: false, error: 'Twitter credentials not configured' };
    }
    try {
      const { TwitterApi } = require('twitter-api-v2');
      const client = new TwitterApi({
        appKey: apiKey,
        appSecret: apiSecret,
        accessToken: this.platforms.twitter.accessToken,
        accessSecret: this.platforms.twitter.accessSecret
      });

      const tweet = await client.v2.tweet(content);
      this.postedContent.push({ platform: 'twitter', id: tweet.data.id, content, postedAt: new Date() });
      return { success: true, id: tweet.data.id, url: `https://twitter.com/i/web/status/${tweet.data.id}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async postToLinkedIn(content, accessToken) {
    if (!this.platforms.linkedin?.personId) {
      return { success: false, error: 'LinkedIn credentials not configured' };
    }
    try {
      const response = await axios.post('https://api.linkedin.com/v2/ugcPosts', {
        author: `urn:li:person:${this.platforms.linkedin.personId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
      }, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      });
      this.postedContent.push({ platform: 'linkedin', id: response.data.id, content, postedAt: new Date() });
      return { success: true, id: response.data.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async analyzeEngagement(platform, postId) {
    // Platform-specific engagement fetching
    return {
      platform,
      postId,
      likes: 0,
      shares: 0,
      comments: 0,
      reach: 0,
      engagementRate: 0,
      fetchedAt: new Date()
    };
  }

  getContentCalendar() {
    return this.contentCalendar;
  }

  getAnalytics() {
    return {
      totalPosts: this.postedContent.length,
      byPlatform: this.postedContent.reduce((acc, post) => {
        acc[post.platform] = (acc[post.platform] || 0) + 1;
        return acc;
      }, {}),
      recentPosts: this.postedContent.slice(-10)
    };
  }
}

module.exports = SocialMediaAgent;
