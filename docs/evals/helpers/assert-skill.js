// Factory: creates a Promptfoo assertion function that checks a skill file for a regex pattern.
// Usage: file://helpers/assert-skill.js:privacy-pools-integration/SKILL.md:relay:Found relay reference:Missing relay reference
const fs = require('fs');
const path = require('path');

const skillsRoot = path.resolve(__dirname, '../../static/agent-skills');

module.exports = function createAssertion(skillRelPath, pattern, passMsg, failMsg) {
  const fullPath = path.resolve(skillsRoot, skillRelPath);
  let content;
  try {
    content = fs.readFileSync(fullPath, 'utf-8');
  } catch (err) {
    return { pass: false, score: 0, reason: `Could not read ${fullPath}: ${err.message}` };
  }
  const re = new RegExp(pattern);
  const has = re.test(content);
  return { pass: has, score: has ? 1 : 0, reason: has ? passMsg : failMsg };
};
