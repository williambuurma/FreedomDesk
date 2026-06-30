"use strict";

const fs = require("fs");
const path = require("path");

class KnowledgeStore {
  constructor(options = {}) {
    this.repoRoot = options.repoRoot || process.cwd();
    this.readFile = options.readFile || fs.readFileSync.bind(fs);
    this.cache = new Map();
  }

  resolveAbsolutePath(relativePath) {
    return path.join(this.repoRoot, relativePath);
  }

  readUtf8(relativePath) {
    const absolutePath = this.resolveAbsolutePath(relativePath);
    if (this.cache.has(absolutePath)) {
      return this.cache.get(absolutePath);
    }

    const content = this.readFile(absolutePath, "utf8");
    this.cache.set(absolutePath, content);
    return content;
  }

  readJson(relativePath) {
    return JSON.parse(this.readUtf8(relativePath));
  }

  getCachedPathCount() {
    return this.cache.size;
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = {
  KnowledgeStore,
};
