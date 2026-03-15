import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  docs: [
    {
      type: "category",
      label: "Overview",
      link: {
        type: "generated-index",
        slug: "/overview",
        title: "Overview",
        description:
          "Introductory docs for Privacy Pools, its architecture, and core concepts.",
        keywords: [
          "privacy pools",
          "overview",
          "architecture",
          "core concepts",
        ],
      },
      items: ["overview/what-is-privacy-pools", "overview/core-concepts"],
    },
    {
      type: "category",
      label: "Protocol Components",
      link: {
        type: "generated-index",
        slug: "/layers",
        title: "Protocol Components",
        description:
          "Reference pages for the contract, zero-knowledge, and ASP layers.",
        keywords: [
          "privacy pools",
          "contracts",
          "zero knowledge",
          "zk proofs",
          "asp",
          "protocol layers",
        ],
      },
      items: [
        {
          type: "category",
          label: "Smart Contracts Layer",
          link: {
            type: "doc",
            id: "layers/contracts",
          },
          items: [
            "layers/contracts/entrypoint",
            "layers/contracts/privacy-pools",
          ],
        },
        {
          type: "category",
          label: "Zero Knowledge Layer",
          link: {
            type: "doc",
            id: "layers/zk",
          },
          items: [
            "layers/zk/commitment",
            "layers/zk/lean-imt",
            "layers/zk/withdrawal",
          ],
        },
        "layers/asp",
      ],
    },
    {
      type: "category",
      label: "Using Privacy Pools",
      link: {
        type: "generated-index",
        slug: "/protocol",
        title: "Using Privacy Pools",
        description:
          "Integration, deposit, withdrawal, and ragequit guidance for Privacy Pools.",
        keywords: [
          "privacy pools",
          "integration",
          "deposit",
          "withdrawal",
          "ragequit",
          "relayer",
        ],
      },
      items: [
        "protocol/integrations",
        "protocol/deposit",
        "protocol/withdrawal",
        "protocol/ragequit",
      ],
    },
    {
      type: "category",
      label: "Technical Reference",
      link: {
        type: "generated-index",
        slug: "/reference",
        title: "Technical Reference",
        description:
          "SDK, contract, and circuit reference material for Privacy Pools.",
        keywords: [
          "privacy pools",
          "sdk",
          "contracts",
          "circuits",
          "reference",
          "api",
        ],
      },
      items: ["reference/contracts", "reference/circuits", "reference/sdk"],
    },
    {
      type: "ref",
      id: "protocol/integrations",
    },
    "agent-workflows",
    "dev-guide",
    "toc",
    "privacy-policy",
    "deployments",
  ],
};

export default sidebars;
