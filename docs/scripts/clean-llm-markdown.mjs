#!/usr/bin/env node

/**
 * clean-llm-markdown.mjs
 *
 * Post-build cleanup for the generated LLM markdown files under docs/build/.
 * Strips leftover MDX component tags (Tabs, TabItem, etc.) that the
 * docusaurus-plugin-llms plugin passes through as raw text.
 *
 * Run after `docusaurus build` via the `build` script.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const BUILD_DIR = join(import.meta.dirname, "..", "build");

// Patterns to strip: opening/closing JSX component tags and import lines
// that weren't caught by the plugin's excludeImports option.
const PATTERNS = [
  /^import\s+\w+\s+from\s+['"]@theme\/\w+['"];?\s*$/gm,
  /<\/?Tabs[^>]*>\s*/g,
  /<\/?TabItem[^>]*>\s*/g,
];

function cleanFile(filePath) {
  let content = readFileSync(filePath, "utf-8");
  let changed = false;
  for (const pattern of PATTERNS) {
    const before = content;
    content = content.replace(pattern, "");
    if (content !== before) changed = true;
  }
  if (changed) {
    // Collapse runs of 3+ blank lines down to 2
    content = content.replace(/\n{3,}/g, "\n\n");
    writeFileSync(filePath, content, "utf-8");
    return true;
  }
  return false;
}

function walk(dir) {
  let cleaned = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      cleaned += walk(full);
    } else if (full.endsWith(".md") || full.endsWith(".txt")) {
      if (cleanFile(full)) cleaned++;
    }
  }
  return cleaned;
}

const cleaned = walk(BUILD_DIR);
if (cleaned > 0) {
  console.log(`clean-llm-markdown: stripped MDX tags from ${cleaned} file(s)`);
}
