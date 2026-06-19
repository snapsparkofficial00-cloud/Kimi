const fs = require('fs').promises;
const path = require('path');

class FileManager {
  constructor(baseDir = './workspace') {
    this.baseDir = baseDir;
  }

  async ensureDir(dirPath) {
    const fullPath = path.join(this.baseDir, dirPath);
    await fs.mkdir(fullPath, { recursive: true });
    return fullPath;
  }

  async writeFile(filePath, content) {
    const fullPath = path.join(this.baseDir, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf8');
    return fullPath;
  }

  async readFile(filePath) {
    const fullPath = path.join(this.baseDir, filePath);
    return await fs.readFile(fullPath, 'utf8');
  }

  async listFiles(dirPath = '') {
    const fullPath = path.join(this.baseDir, dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    return entries.map(e => ({
      name: e.name,
      type: e.isDirectory() ? 'directory' : 'file',
      path: path.join(dirPath, e.name)
    }));
  }

  async deleteFile(filePath) {
    const fullPath = path.join(this.baseDir, filePath);
    await fs.unlink(fullPath);
    return true;
  }
}

module.exports = FileManager;
