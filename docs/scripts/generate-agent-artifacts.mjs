#!/usr/bin/env node

/**
 * generate-agent-artifacts.mjs
 *
 * Reads docs/agent-skills/manifest.json and generates:
 *   - docs/static/agent-skills/<name>/SKILL.md  (for each skill)
 *   - .agents/skills/<name>/SKILL.md            (for each skill)
 *   - AGENTS.md                                 (repo root)
 *   - CLAUDE.md                                 (repo root)
 *
 * Uses only Node.js built-ins. Idempotent -- safe to run multiple times.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPO_ROOT = join(__dirname, "..", "..");
const DOCS_ROOT = join(__dirname, "..");
const MANIFEST_PATH = join(DOCS_ROOT, "agent-skills", "manifest.json");
const DOCS_BASE_URL = "https://docs.privacypools.com";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function writeIfChanged(filePath, content) {
  ensureDir(dirname(filePath));
  if (existsSync(filePath)) {
    const existing = readFileSync(filePath, "utf-8");
    if (existing === content) return;
  }
  writeFileSync(filePath, content, "utf-8");
}

// ---------------------------------------------------------------------------
// SKILL.md template
// ---------------------------------------------------------------------------

function routeToLocalPath(route) {
  // Convert a docs route like "/build/integration" to "docs/docs/build/integration.md"
  return `docs/docs${route}.md`;
}

function renderSkill(skill, fragmentContent) {
  const guardrailsList = skill.guardrails
    .map((g) => `- ${g}`)
    .join("\n");

  const readOrderList = skill.readOrder
    .map((route) => `1. ${DOCS_BASE_URL}${route} (local: \`${routeToLocalPath(route)}\`)`)
    .join("\n");

  return `> ${skill.description}

## Read Order

${readOrderList}

## Guardrails

${guardrailsList}

${fragmentContent.trim()}
`;
}

// ---------------------------------------------------------------------------
// AGENTS.md template
// ---------------------------------------------------------------------------

function renderAgentsMd(skills) {
  const skillList = skills
    .map(
      (s) =>
        `- **${s.name}** -- ${s.description}  \n  Skill file: \`.agents/skills/${s.name}/SKILL.md\``
    )
    .join("\n");

  return `# Privacy Pools -- Agent Entry Point

Privacy Pools is a smart-contract protocol for compliant private transactions on Ethereum. It uses zero-knowledge proofs and Association Set Providers (ASPs) to let users withdraw funds privately while proving their deposits are not associated with illicit activity.

> This file helps AI agents discover the Privacy Pools documentation and skill library.
> Works with any agent: Cursor, Copilot, Codex, Claude Code, or custom tooling.

## Repo Structure

This is a monorepo with the following packages:

| Package | Path | Description |
|---------|------|-------------|
| circuits | \`packages/circuits/\` | ZK circuits (Circom) |
| contracts | \`packages/contracts/\` | Solidity smart contracts |
| sdk | \`packages/sdk/\` | TypeScript SDK (\`@0xbow/privacy-pools-core-sdk\`) |
| relayer | \`packages/relayer/\` | Relayer service |
| docs | \`docs/\` | Docusaurus documentation site |

## Quick Start

- Getting started: ${DOCS_BASE_URL}/build/start (local: \`docs/docs/build/start.md\`)
- Agent workflows: ${DOCS_BASE_URL}/build/agents (local: \`docs/docs/build/agents.md\`)
- Skill library: ${DOCS_BASE_URL}/build/skills (local: \`docs/docs/build/skills.md\`)
- Deployments: ${DOCS_BASE_URL}/deployments (local: \`docs/docs/deployments.md\`)
- Integration guide: ${DOCS_BASE_URL}/build/integration (local: \`docs/docs/build/integration.md\`)

## How to Use Skills

Each skill is a self-contained markdown file with a read order, guardrails, and step-by-step instructions for a specific flow. To use a skill:

1. Pick the skill that matches your task from the list below.
2. Open its \`SKILL.md\` file.
3. Follow the read order to load prerequisite context.
4. Implement following the steps and guardrails in the file.

Skills live in two mirrored locations:
- \`.agents/skills/<name>/SKILL.md\` -- for IDE agents (Cursor, Copilot, etc.)
- \`docs/static/agent-skills/<name>/SKILL.md\` -- served on the docs site

## Available Skills

${skillList}

## Key Build Commands

\`\`\`bash
yarn                                                  # install all deps
yarn workspace @0xbow/privacy-pools-core-sdk test      # SDK tests
yarn workspace @privacy-pool-core/contracts test       # contract tests
yarn workspace @privacy-pool-core/circuits test        # circuit tests
yarn workspace @privacy-pool-core/relayer test         # relayer tests
cd docs && yarn build                                  # build docs site
\`\`\`

## Key Docs (local paths)

- Frontend integration: \`docs/docs/build/integration.md\`
- Protocol flows: \`docs/docs/protocol/deposit.md\`, \`withdrawal.md\`, \`ragequit.md\`
- API references: \`docs/docs/reference/relayer-api.md\`, \`asp-api.md\`, \`sdk.md\`
- Contract addresses: \`docs/docs/deployments.md\`
- Error codes: \`docs/docs/reference/errors.md\`

`;
}

// ---------------------------------------------------------------------------
// CLAUDE.md template
// ---------------------------------------------------------------------------

function renderClaudeMd(skills) {
  const skillList = skills
    .map(
      (s) =>
        `- **${s.name}** -- ${s.description}  \n  Skill file: \`.agents/skills/${s.name}/SKILL.md\``
    )
    .join("\n");

  return `# Privacy Pools Claude Code Guide

Privacy Pools is a smart-contract protocol for compliant private transactions on Ethereum. It uses zero-knowledge proofs and Association Set Providers (ASPs) to let users withdraw funds privately while proving their deposits are not associated with illicit activity.

Route all Privacy Pools tasks through the docs below.

## Key Docs

- Frontend integration guide: \`docs/docs/build/integration.md\`
- Agent and backend integration: \`docs/docs/build/agents.md\`
- Deployments and start blocks: \`docs/docs/deployments.md\`
- Skill library: \`docs/docs/build/skills.md\`

## Quick Start

- Getting started: ${DOCS_BASE_URL}/build/start
- Agent workflows: ${DOCS_BASE_URL}/build/agents
- Skill library: ${DOCS_BASE_URL}/build/skills
- Deployments: ${DOCS_BASE_URL}/deployments

## Recommended Read Order

1. Read \`docs/docs/build/integration.md\` for fast orientation.
2. Read the relevant protocol flow: \`docs/docs/protocol/deposit.md\`, \`withdrawal.md\`, or \`ragequit.md\`.
3. Pull addresses/startBlock from \`docs/docs/deployments.md\`.
4. Check API references in \`docs/docs/reference/\` as needed.

## Quick Task Router

- If the task is first-time protocol integration, start with \`docs/docs/build/integration.md\`.
- If the task needs API payloads or edge-case handling, check \`docs/docs/reference/\`.
- If the task needs chain addresses/start blocks, use \`docs/docs/deployments.md\`.
- If the task is about agent file behavior/discovery, use \`docs/docs/build/agents.md\`.

## Available Skills

${skillList}

## Workflow Rules

- Use relayed withdrawals as the only user-facing withdrawal path: \`fastrelay.xyz\` on production chains and \`testnet-relayer.privacypools.com\` on published testnets.
- Treat direct \`PrivacyPool.withdraw()\` as contract-level behavior, not frontend UX.
- Frontends should use mnemonic-backed pool accounts reconstructed from on-chain events. If \`AccountService.initializeWithEvents(...)\` returns \`legacyAccount\`, keep it during restores for migrated users. Never expose deposit secrets, nullifiers, or raw note material in clipboard or copy/paste flows.
- Only expose private withdrawal from approved non-zero pool accounts, and resolve plus validate the recipient before quote or proof generation.
- Request relayer quotes on the review step. If amount, recipient, relayer, or optional gas-token drop changes, or the quote expires, re-quote and require reconfirmation.
- Prefer wallet-signature seed derivation only when the wallet can reproduce the same EIP-712 signature for the same payload twice. Otherwise use manual mnemonic onboarding, require the recovery phrase to be saved before continuing, and sanitize recovery phrase input.
- Always verify ASP root parity before withdrawal proof submission.
- For \`DataService\` event scans, always use the deployment \`startBlock\` from \`docs/docs/deployments.md\`; do not scan from genesis.
- Always use decimal \`X-Pool-Scope\` header values.
- Never modify files under \`audit/\`.

## Build and Test

\`\`\`bash
yarn
yarn workspace @0xbow/privacy-pools-core-sdk test
yarn workspace @privacy-pool-core/contracts test
yarn workspace @privacy-pool-core/circuits test
yarn workspace @privacy-pool-core/relayer test
cd docs && yarn build
\`\`\`
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  // Load manifest
  const manifestRaw = readFileSync(MANIFEST_PATH, "utf-8");
  const manifest = JSON.parse(manifestRaw);
  const skills = manifest.skills;

  console.log(`Loaded manifest with ${skills.length} skills.`);

  for (const skill of skills) {
    // Load fragment
    const fragmentPath = join(DOCS_ROOT, "agent-skills", skill.fragment);
    if (!existsSync(fragmentPath)) {
      console.error(`Fragment not found: ${fragmentPath}`);
      process.exit(1);
    }
    const fragmentContent = readFileSync(fragmentPath, "utf-8");

    // Render SKILL.md
    const skillMd = renderSkill(skill, fragmentContent);

    // Write to docs/static/agent-skills/<name>/SKILL.md
    const docsStaticPath = join(
      DOCS_ROOT,
      "static",
      "agent-skills",
      skill.name,
      "SKILL.md"
    );
    writeIfChanged(docsStaticPath, skillMd);
    console.log(`  wrote ${docsStaticPath}`);

    // Write to .agents/skills/<name>/SKILL.md
    const agentsPath = join(
      REPO_ROOT,
      ".agents",
      "skills",
      skill.name,
      "SKILL.md"
    );
    writeIfChanged(agentsPath, skillMd);
    console.log(`  wrote ${agentsPath}`);
  }

  // Generate AGENTS.md
  const agentsMd = renderAgentsMd(skills);
  const agentsMdPath = join(REPO_ROOT, "AGENTS.md");
  writeIfChanged(agentsMdPath, agentsMd);
  console.log(`wrote ${agentsMdPath}`);

  // Generate CLAUDE.md
  const claudeMd = renderClaudeMd(skills);
  const claudeMdPath = join(REPO_ROOT, "CLAUDE.md");
  writeIfChanged(claudeMdPath, claudeMd);
  console.log(`wrote ${claudeMdPath}`);

  console.log("Done.");
}

main();
