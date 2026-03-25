import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Privacy Pools Documentation",
  tagline: "Technical documentation for Privacy Pools protocol",
  favicon: "img/favicon.svg",

  url: "https://docs.privacypools.com",
  baseUrl: "/",
  organizationName: "0xbow-io",
  projectName: "privacy-pools-core",

  onBrokenLinks: "throw",
  clientModules: ["./src/searchKeyboardShortcut.ts"],
  /* Font stylesheet first — Docusaurus emits stylesheets before headTags,
     so preconnect hints go here as objects to fire before the font request. */
  stylesheets: [
    { href: "https://fonts.googleapis.com", rel: "preconnect" },
    {
      href: "https://fonts.gstatic.com",
      rel: "preconnect",
      crossorigin: "anonymous",
    },
    "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap",
  ],
  headTags: [
    {
      tagName: "link",
      attributes: {
        rel: "icon",
        href: "/img/favicon-light.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "icon",
        href: "/img/favicon-dark.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    },
    {
      tagName: "meta",
      attributes: { property: "og:type", content: "website" },
    },
    {
      tagName: "meta",
      attributes: { name: "twitter:site", content: "@0xprivacypools" },
    },
    {
      tagName: "meta",
      attributes: { name: "twitter:creator", content: "@0xbowio" },
    },
    {
      tagName: "meta",
      attributes: { name: "twitter:card", content: "summary_large_image" },
    },
    {
      tagName: "meta",
      attributes: { name: "robots", content: "index, follow" },
    },
    /* ── Structured Data (JSON-LD) ── */
    {
      tagName: "script",
      attributes: { type: "application/ld+json" },
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            name: "0xbow",
            url: "https://0xbow.io",
            logo: "https://docs.privacypools.com/img/logo.svg",
            sameAs: [
              "https://github.com/0xbow-io",
              "https://twitter.com/0xbowio",
            ],
          },
          {
            "@type": "WebSite",
            name: "Privacy Pools Documentation",
            url: "https://docs.privacypools.com",
            publisher: { "@type": "Organization", name: "0xbow" },
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate:
                  "https://docs.privacypools.com/?q={search_term_string}",
              },
              "query-input": "required name=search_term_string",
            },
          },
        ],
      }),
    },
  ],

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  themes: ["@docusaurus/theme-mermaid"],

  plugins: [
    [
      "@cmfcmf/docusaurus-search-local",
      {
        language: "en",
        indexBlog: false,
        indexDocSidebarParentCategories: 2,
        maxSearchResults: 8,
      },
    ],
    [
      "docusaurus-plugin-llms",
      {
        generateMarkdownFiles: true,
        generateLLMsTxt: true,
        generateLLMsFullTxt: true,
        excludeImports: true,
        removeDuplicateHeadings: true,
        ignoreFiles: ["toc.md", "privacy-policy.md"],
        rootContent:
          "Sitemap: https://docs.privacypools.com/sitemap.xml\nFull docs for LLMs: https://docs.privacypools.com/llms-full.txt\nAgent integration: https://docs.privacypools.com/build/agents\nSkill library: https://docs.privacypools.com/build/skills",
        fullRootContent:
          "Start here: https://docs.privacypools.com/build/start (build quickstart).\nSkill library: https://docs.privacypools.com/build/skills (agent skill reference).\nSitemap: https://docs.privacypools.com/sitemap.xml\nSDK package: @0xbow/privacy-pools-core-sdk (npm)",
        pathTransformation: {
          ignorePaths: ["docs"],
        },
      },
    ],
    [
      "@docusaurus/plugin-client-redirects",
      {
        redirects: [
          {
            from: "/protocol/integrations",
            to: "/build/integration",
          },
          {
            from: "/agent-workflows",
            to: "/build/agents",
          },
          {
            from: "/dev-guide",
            to: "/build/contributing",
          },
        ],
      },
    ],
  ],

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          routeBasePath: "/",
          editUrl:
            "https://github.com/0xbow-io/privacy-pools-core/tree/main/docs/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
        sitemap: {
          createSitemapItems: async (params) => {
            const { defaultCreateSitemapItems, ...rest } = params;
            const items = await defaultCreateSitemapItems(rest);
            // Include LLM/AI static artifacts in sitemap for crawler discoverability
            return [
              ...items,
              { url: "https://docs.privacypools.com/llms.txt", changefreq: "weekly" as const, priority: 0.6 },
              { url: "https://docs.privacypools.com/llms-full.txt", changefreq: "weekly" as const, priority: 0.6 },
            ];
          },
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/privacy-pools-banner.png",
    mermaid: {
      theme: {
        light: "neutral",
        dark: "dark",
      },
      options: {
        fontFamily:
          '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: 13,
      },
    },
    navbar: {
      title: "Privacy Pools",
      logo: {
        alt: "Privacy Pools Logo",
        src: "img/logo.svg",
        srcDark: "img/logo-dark.svg",
      },
      items: [
        {
          type: "doc",
          docId: "overview/what-is-privacy-pools",
          label: "Docs",
          position: "left",
        },
        {
          to: "/build/start",
          label: "Build",
          position: "left",
        },
        {
          to: "/build/skills",
          label: "Skills",
          position: "left",
        },
        {
          to: "/reference/sdk",
          label: "SDK",
          position: "left",
        },
        {
          to: "/deployments",
          label: "Deployments",
          position: "left",
        },
        {
          href: "https://github.com/0xbow-io/privacy-pools-core",
          position: "right",
          className: "header-github-link",
          "aria-label": "GitHub repository",
        },
      ],
    },
    footer: {
      style: "light",
      links: [
        {
          title: "For AI Agents",
          items: [
            { label: "Skill Library", to: "/build/skills" },
            { label: "Agent Workflows", to: "/build/agents" },
            { label: "llms.txt", href: "https://docs.privacypools.com/llms.txt" },
            { label: "llms-full.txt", href: "https://docs.privacypools.com/llms-full.txt" },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} 0XBOW LTD`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["solidity"],
    },
    docs: {
      sidebar: {
        hideable: false,
        autoCollapseCategories: true,
      },
    },
    /* NOTE: sidebar config also exists at the top-level themeConfig for
       Docusaurus v3.x; the docs.sidebar block above is the canonical location. */
  } satisfies Preset.ThemeConfig,
};

export default config;
