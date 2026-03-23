// Custom Promptfoo provider that reads a skill file and returns its content.
// The prompt text is used as the relative path within agent-skills/.
// E.g., prompt "privacy-pools-integration/SKILL.md" returns that file's content.
const fs = require('fs');
const path = require('path');

const skillsRoot = path.resolve(__dirname, '../../static/agent-skills');

class SkillFileProvider {
  id() {
    return 'skill-file-reader';
  }

  async callApi(prompt) {
    const skillPath = prompt.trim();
    const fullPath = path.resolve(skillsRoot, skillPath);
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      return { output: content };
    } catch (err) {
      return { output: `[ERROR: ${err.message}]` };
    }
  }
}

module.exports = SkillFileProvider;
