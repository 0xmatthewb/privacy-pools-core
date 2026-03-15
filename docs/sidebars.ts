import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: "category",
      label: "Overview",
      collapsible: false,
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
      collapsible: false,
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
          collapsible: false,
          description:
            "Architecture of the smart contract layer, covering Entrypoint, asset-specific pools, verifiers, and protocol state.",
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
          collapsible: false,
          description:
            "Circom zero-knowledge circuits for commitment hashing, LeanIMT inclusion proofs, and withdrawal proof composition.",
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
        {
          type: "doc",
          id: "layers/asp",
          label: "ASP Layer",
          className: "sidebar-layer-label",
        },
      ],
    },
    {
      type: "category",
      label: "Using Privacy Pools",
      collapsible: false,
      link: {
        type: "generated-index",
        slug: "/protocol",
        title: "Using Privacy Pools",
        description:
          "Deposit, withdrawal, and ragequit guidance for Privacy Pools.",
        keywords: [
          "privacy pools",
          "deposit",
          "withdrawal",
          "ragequit",
          "relayer",
        ],
      },
      items: [
        "protocol/deposit",
        "protocol/withdrawal",
        "protocol/ragequit",
      ],
    },
    {
      type: "category",
      label: "Technical Reference",
      collapsible: false,
      link: {
        type: "generated-index",
        slug: "/reference",
        title: "Technical Reference",
        description:
          "Integration guide, SDK, contract, and circuit reference material for Privacy Pools.",
        keywords: [
          "privacy pools",
          "sdk",
          "contracts",
          "circuits",
          "reference",
          "api",
          "integration",
        ],
      },
      items: [
        "protocol/integrations",
        "reference/contracts",
        "reference/circuits",
        "reference/sdk",
      ],
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
