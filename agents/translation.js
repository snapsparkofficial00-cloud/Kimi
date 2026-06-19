const { GoogleGenerativeAI } = require('@google/generative-ai');

class TranslationAgent {
  constructor(config = {}) {
    this.apiKey = config.apiKey;
    this.provider = config.provider || 'google';
    this.cache = new Map();
    this.supportedLanguages = {
      'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
      'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese',
      'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic', 'hi': 'Hindi',
      'tr': 'Turkish', 'pl': 'Polish', 'nl': 'Dutch', 'sv': 'Swedish',
      'id': 'Indonesian', 'vi': 'Vietnamese', 'th': 'Thai', 'ms': 'Malay'
    };
    this.gemini = config.gemini || null;
  }

  async translate(text, targetLang, sourceLang = 'auto') {
    const cacheKey = `${text}_${sourceLang}_${targetLang}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    try {
      let result;

      if (this.provider === 'google' && this.apiKey) {
        result = await this.translateWithGoogle(text, targetLang, sourceLang);
      } else if (this.provider === 'deepl' && this.apiKey) {
        result = await this.translateWithDeepL(text, targetLang, sourceLang);
      } else if (this.gemini) {
        result = await this.translateWithGemini(text, targetLang, sourceLang);
      } else {
        result = {
          success: true,
          translatedText: `[No API configured] Original: ${text}`,
          detectedSourceLanguage: sourceLang,
          provider: 'none'
        };
      }

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async translateWithGoogle(text, targetLang, sourceLang) {
    const axios = require('axios');
    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`,
      {
        q: text,
        target: targetLang,
        source: sourceLang === 'auto' ? undefined : sourceLang,
        format: 'text'
      }
    );

    return {
      success: true,
      translatedText: response.data.data.translations[0].translatedText,
      detectedSourceLanguage: response.data.data.translations[0].detectedSourceLanguage || sourceLang,
      provider: 'google'
    };
  }

  async translateWithDeepL(text, targetLang, sourceLang) {
    const axios = require('axios');
    const response = await axios.post('https://api-free.deepl.com/v2/translate', {
      text: [text],
      target_lang: targetLang.toUpperCase(),
      source_lang: sourceLang === 'auto' ? undefined : sourceLang.toUpperCase()
    }, {
      headers: { Authorization: `DeepL-Auth-Key ${this.apiKey}` }
    });

    return {
      success: true,
      translatedText: response.data.translations[0].text,
      detectedSourceLanguage: response.data.translations[0].detected_source_language,
      provider: 'deepl'
    };
  }

  async translateWithGemini(text, targetLang, sourceLang) {
    const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Translate the following text from ${sourceLang === 'auto' ? 'its original language' : sourceLang} to ${targetLang}:

"${text}"

Respond ONLY with the translated text, no explanations, no quotes around the output.`;

    const result = await model.generateContent(prompt);
    const translated = result.response.text().trim().replace(/^["']|["']$/g, '');

    return {
      success: true,
      translatedText: translated,
      detectedSourceLanguage: sourceLang,
      provider: 'gemini'
    };
  }

  async batchTranslate(texts, targetLang, sourceLang = 'auto') {
    const results = [];
    for (const text of texts) {
      const result = await this.translate(text, targetLang, sourceLang);
      results.push(result);
    }
    return results;
  }

  async detectLanguage(text) {
    if (!this.apiKey) return { success: false, error: 'No API key configured' };
    const axios = require('axios');
    try {
      const response = await axios.post(
        `https://translation.googleapis.com/language/translate/v2/detect?key=${this.apiKey}`,
        { q: text }
      );
      return {
        success: true,
        language: response.data.data.detections[0][0].language,
        confidence: response.data.data.detections[0][0].confidence
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async summarize(text, maxLength = 200, language = 'en') {
    if (!this.gemini) {
      return {
        success: true,
        summary: text.substring(0, maxLength) + (text.length > maxLength ? '...' : ''),
        originalLength: text.length,
        summaryLength: Math.min(maxLength, text.length)
      };
    }
    const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Summarize the following text in ${this.supportedLanguages[language] || language} in ${maxLength} characters or less:

${text}

Respond ONLY with the summary.`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();

    return {
      success: true,
      summary,
      originalLength: text.length,
      summaryLength: summary.length
    };
  }

  async localizeContent(content, targetCulture, options = {}) {
    if (!this.gemini) {
      return { success: true, localizedContent: content, targetCulture, changes: [] };
    }
    const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const prompt = `Localize the following content for ${targetCulture} culture. Adapt idioms, cultural references, date formats, currency, and tone. Maintain the original meaning and intent.

Content: ${content}

${options.instructions || ''}

Respond ONLY with the localized content.`;

    const result = await model.generateContent(prompt);
    return {
      success: true,
      localizedContent: result.response.text().trim(),
      targetCulture,
      changes: []
    };
  }

  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()).slice(0, 10)
    };
  }
}

module.exports = TranslationAgent;
