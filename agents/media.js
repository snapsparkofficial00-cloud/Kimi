const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class MediaAgent {
  constructor(config = {}) {
    this.stabilityKey = config.stabilityKey;
    this.replicateKey = config.replicateKey;
    this.openaiKey = config.openaiKey;
    this.outputDir = config.outputDir || './workspace/media';
  }

  async generateImage(prompt, options = {}) {
    const {
      width = 1024,
      height = 1024,
      style = 'photorealistic',
      negativePrompt = '',
      seed = Math.floor(Math.random() * 1000000)
    } = options;

    if (!this.stabilityKey) {
      return { success: false, error: 'Stability API key not configured. Set STABILITY_API_KEY in .env' };
    }

    try {
      const response = await axios.post('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
        prompt: `${prompt}, ${style}`,
        negative_prompt: negativePrompt,
        width,
        height,
        seed,
        output_format: 'png'
      }, {
        headers: {
          Authorization: `Bearer ${this.stabilityKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 60000
      });

      const filename = `image_${Date.now()}_${seed}.png`;
      const filepath = path.join(this.outputDir, filename);
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.writeFile(filepath, response.data);

      return {
        success: true,
        filename,
        filepath,
        prompt,
        seed,
        dimensions: `${width}x${height}`,
        url: `/workspace/media/${filename}`
      };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  async generateVideo(prompt, options = {}) {
    const {
      duration = 4,
      fps = 24,
      width = 1024,
      height = 576
    } = options;

    if (!this.replicateKey) {
      return { success: false, error: 'Replicate API key not configured. Set REPLICATE_API_KEY in .env' };
    }

    try {
      const response = await axios.post('https://api.replicate.com/v1/predictions', {
        version: "stable-video-diffusion",
        input: {
          prompt,
          num_frames: duration * fps,
          width,
          height,
          fps
        }
      }, {
        headers: {
          Authorization: `Token ${this.replicateKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return {
        success: true,
        predictionId: response.data.id,
        status: response.data.status,
        prompt,
        checkUrl: `/api/media/status/${response.data.id}`
      };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  }

  async editImage(imagePath, editPrompt, options = {}) {
    if (!this.stabilityKey) {
      return { success: false, error: 'Stability API key not configured' };
    }
    try {
      const imageBuffer = await fs.readFile(imagePath);

      const response = await axios.post('https://api.stability.ai/v2beta/stable-image/edit', {
        image: imageBuffer.toString('base64'),
        prompt: editPrompt,
        strength: options.strength || 0.7
      }, {
        headers: {
          Authorization: `Bearer ${this.stabilityKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 60000
      });

      const filename = `edited_${Date.now()}.png`;
      const filepath = path.join(this.outputDir, filename);
      await fs.writeFile(filepath, response.data);

      return { success: true, filename, filepath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async upscaleImage(imagePath, scale = 2) {
    if (!this.stabilityKey) {
      return { success: false, error: 'Stability API key not configured' };
    }
    try {
      const imageBuffer = await fs.readFile(imagePath);

      const response = await axios.post('https://api.stability.ai/v2beta/stable-image/upscale', {
        image: imageBuffer.toString('base64'),
        scale
      }, {
        headers: {
          Authorization: `Bearer ${this.stabilityKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 60000
      });

      const filename = `upscaled_${Date.now()}.png`;
      const filepath = path.join(this.outputDir, filename);
      await fs.writeFile(filepath, response.data);

      return { success: true, filename, filepath, scale };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async generateThumbnail(title, options = {}) {
    const prompt = `YouTube thumbnail: ${title}, eye-catching, bold text, vibrant colors, professional, high contrast, 1280x720`;
    return this.generateImage(prompt, { width: 1280, height: 720, ...options });
  }

  async generateLogo(brandName, description, options = {}) {
    const prompt = `Professional logo for "${brandName}": ${description}, clean design, vector style, transparent background, minimalistic`;
    return this.generateImage(prompt, { width: 1024, height: 1024, ...options });
  }

  async checkVideoStatus(predictionId) {
    if (!this.replicateKey) {
      return { success: false, error: 'Replicate API key not configured' };
    }
    try {
      const response = await axios.get(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { Authorization: `Token ${this.replicateKey}` },
        timeout: 10000
      });
      return {
        success: true,
        status: response.data.status,
        output: response.data.output,
        error: response.data.error,
        urls: response.data.output ? (Array.isArray(response.data.output) ? response.data.output : [response.data.output]) : null
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = MediaAgent;
