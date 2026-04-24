#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const JEKYLL_ROOT = path.resolve(__dirname, '../../YuzukiTsuru.github.io');
const HEXO_POSTS_DIR = path.resolve(__dirname, '../source/_posts');

const jekyllPostsDir = path.join(JEKYLL_ROOT, '_posts');
const jekyllArchiveDir = path.join(JEKYLL_ROOT, '_archive');

function parseFrontMatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { fm: {}, body: content };

  const raw = match[1];
  const body = content.slice(match[0].length);
  const fm = {};

  for (const line of raw.split('\n')) {
    const m = line.match(/^(\w[\w-]*)\s*:\s*(.*)/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();

    // Parse YAML-like values
    if (val === '' || val === 'true') {
      fm[key] = val === 'true' ? true : '';
    } else if (val === 'false') {
      fm[key] = false;
    } else if (val.startsWith('[') && val.endsWith(']')) {
      // Array: ["A", "B"] or ['A', 'B'] or [A, B]
      fm[key] = val;
    } else if (val.startsWith("'") && val.endsWith("'")) {
      fm[key] = val;
    } else if (val.startsWith('"') && val.endsWith('"')) {
      fm[key] = val;
    } else {
      fm[key] = val;
    }
  }

  return { fm, body };
}

function normalizeTags(fm) {
  // Handle singular 'tag:' → 'tags:'
  if (fm.tag !== undefined && fm.tags === undefined) {
    fm.tags = fm.tag;
    delete fm.tag;
  }

  if (fm.tags === undefined) return;

  let tags = fm.tags;

  // Already a YAML array string
  if (typeof tags === 'string' && tags.startsWith('[')) return;

  // Space-separated string: convert to array
  if (typeof tags === 'string') {
    const parts = tags.split(/\s+/).filter(t => t.length > 0);
    if (parts.length > 1 || (parts.length === 1 && !tags.startsWith('"') && !tags.startsWith("'"))) {
      fm.tags = parts.map(t => `"${t}"`).join(', ');
      fm.tags = `[${fm.tags}]`;
    }
  }
}

function normalizeCategory(fm) {
  if (fm.category !== undefined) {
    fm.categories = `[${typeof fm.category === 'string' ? fm.category : fm.category}]`;
    delete fm.category;
  }
}

function deriveDateFromFilename(filename) {
  const m = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function rewriteFrontMatterPaths(val) {
  if (typeof val !== 'string') return val;
  val = val.replace(/\/assets\/post\//g, '/images/post/');
  return val;
}

function transformFrontMatter(fm, filename) {
  const layout = fm.layout;
  const result = {};

  // Derive date from filename if not present
  if (!fm.date) {
    const dateStr = deriveDateFromFilename(filename);
    if (dateStr) fm.date = dateStr + ' 00:00:00';
  }

  for (const [key, val] of Object.entries(fm)) {
    if (key === 'layout') {
      // Add fullWidth for svgpost/tablepost
      if (val === 'svgpost' || val === 'tablepost') {
        result.fullWidth = true;
      }
      continue;
    }
    if (key === 'cover' && val === '') continue;
    result[key] = rewriteFrontMatterPaths(val);
  }

  normalizeTags(result);
  normalizeCategory(result);

  return result;
}

function formatFrontMatter(fm) {
  let lines = ['---'];
  for (const [key, val] of Object.entries(fm)) {
    if (val === true) {
      lines.push(`${key}: true`);
    } else if (val === false) {
      lines.push(`${key}: false`);
    } else if (val === '') {
      lines.push(`${key}:`);
    } else {
      lines.push(`${key}: ${val}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

function rewriteImagePaths(body) {
  // /assets/post/... → /images/post/...
  body = body.replace(/\/assets\/post\//g, '/images/post/');
  // ../assets/post/... → /images/post/...
  body = body.replace(/\.\.\/assets\/post\//g, '/images/post/');
  return body;
}

function processFile(filePath, outputDir) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath);
  const { fm, body } = parseFrontMatter(content);
  const transformed = transformFrontMatter(fm, filename);
  const newBody = rewriteImagePaths(body);
  const newContent = formatFrontMatter(transformed) + newBody;

  fs.writeFileSync(path.join(outputDir, filename), newContent, 'utf-8');
  return filename;
}

function main() {
  // Ensure output directory exists
  if (!fs.existsSync(HEXO_POSTS_DIR)) {
    fs.mkdirSync(HEXO_POSTS_DIR, { recursive: true });
  }

  let count = 0;

  // Process _posts/
  const posts = fs.readdirSync(jekyllPostsDir).filter(f => f.endsWith('.md'));
  for (const file of posts) {
    processFile(path.join(jekyllPostsDir, file), HEXO_POSTS_DIR);
    count++;
  }
  console.log(`Migrated ${posts.length} posts from _posts/`);

  // Process _archive/
  if (fs.existsSync(jekyllArchiveDir)) {
    const archive = fs.readdirSync(jekyllArchiveDir).filter(f => f.endsWith('.md'));
    for (const file of archive) {
      processFile(path.join(jekyllArchiveDir, file), HEXO_POSTS_DIR);
      count++;
    }
    console.log(`Migrated ${archive.length} posts from _archive/`);
  }

  console.log(`Total: ${count} posts migrated to ${HEXO_POSTS_DIR}`);
}

main();
