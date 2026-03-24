// Promptfoo provider that reads any repo-relative file and returns its contents.
// The prompt text is resolved from the repository root.
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');

class RepoFileProvider {
  id() {
    return 'repo-file-reader';
  }

  async callApi(prompt) {
    const [leftPath, rightPath] = prompt.split('|||').map((part) => part.trim());
    if (rightPath) {
      const leftFullPath = path.resolve(repoRoot, leftPath);
      const rightFullPath = path.resolve(repoRoot, rightPath);
      if (!fs.existsSync(leftFullPath)) {
        throw new Error(`Missing repo file: ${leftFullPath}`);
      }
      if (!fs.existsSync(rightFullPath)) {
        throw new Error(`Missing repo file: ${rightFullPath}`);
      }

      return {
        output: JSON.stringify({
          left: fs.readFileSync(leftFullPath, 'utf8'),
          right: fs.readFileSync(rightFullPath, 'utf8'),
        }),
      };
    }

    const fullPath = path.resolve(repoRoot, leftPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing repo file: ${fullPath}`);
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    return { output: content };
  }
}

module.exports = RepoFileProvider;
