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
      label: "Build",
      collapsible: false,
      link: {
        type: "generated-index",
        slug: "/build",
        title: "Build",
        description:
          "Guides for integrating Privacy Pools into frontends and agent workflows.",
        keywords: [
          "privacy pools",
          "build",
          "integration",
          "agents",
          "skills",
          "contributing",
        ],
      },
      items: [
        "build/start",
        "build/integration",
        "build/ux-patterns",
        "build/agents",
        "build/skills",
        "build/contributing",
      ],
    },
    {
      type: "category",
      label: "Using Privacy Pools",
      collapsible: false,
      link: {
        type: "doc",
        id: "protocol/overview",
      },
      items: [
        "protocol/deposit",
        "protocol/withdrawal",
        "protocol/ragequit",
      ],
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
      label: "Technical Reference",
      collapsible: false,
      link: {
        type: "generated-index",
        slug: "/reference",
        title: "Technical Reference",
        description:
          "SDK, contract, circuit, API, and deployment reference material for Privacy Pools.",
        keywords: [
          "privacy pools",
          "sdk",
          "contracts",
          "circuits",
          "reference",
          "api",
          "deployments",
          "errors",
        ],
      },
      items: [
        "reference/sdk",
        "reference/contracts",
        "reference/circuits",
        "reference/asp-api",
        "reference/relayer-api",
        "reference/errors",
        "deployments",
      ],
    },
    "toc",
    "privacy-policy",
  ],
};

export default sidebars;
