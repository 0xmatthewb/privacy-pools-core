// Promptfoo var helper: reads and concatenates doc files.
// Called from test YAML via file:// reference to context-*.js files,
// or directly with require().
const fs = require('fs');
const path = require('path');

const docsRoot = path.resolve(__dirname, '../../docs');

function loadDocs(/** @type {string[]} */ relativePaths) {
  return relativePaths
    .map((p) => {
      const resolved = path.resolve(docsRoot, p.trim());
      if (!fs.existsSync(resolved)) {
        throw new Error(`Missing docs context: ${resolved}`);
      }
      return fs.readFileSync(resolved, 'utf-8');
    })
    .join('\n\n---\n\n');
}

module.exports = loadDocs;
