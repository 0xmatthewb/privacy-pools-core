import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import styles from "./index.module.css";

/* ── Icons ── */

function IconCode(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconBook(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function IconShield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconCpu(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  );
}

function IconContract(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconCircuit(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
  );
}

function IconCheckShield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/* ── Data ── */

const PERSONAS = [
  {
    title: "Builders",
    icon: IconCode,
    description: "Build deposit, approval, withdrawal, and ragequit flows.",
    link: "/build/start",
    label: "Start here",
  },
  {
    title: "Researchers",
    icon: IconBook,
    description: "Understand the protocol architecture, circuits, and cryptographic primitives.",
    link: "/overview/core-concepts",
    label: "Core concepts",
  },
  {
    title: "Users",
    icon: IconShield,
    description: "Understand how deposits, withdrawals, and ragequit work.",
    link: "/protocol",
    label: "Protocol lifecycle",
  },
  {
    title: "Build with Agents",
    icon: IconCpu,
    description: "Set up Claude Code, Codex, or other AI coding agents for Privacy Pools work.",
    link: "/build/agents",
    label: "Agent setup",
  },
];

const ARCH_LAYERS = [
  {
    label: "Contract Layer",
    icon: IconContract,
    link: "/layers/contracts",
    description: "On-chain entry points, pool logic, and Merkle state management.",
    items: [
      { name: "Entrypoint", desc: "Upgradeable coordinator for pools", link: "/layers/contracts/entrypoint" },
      { name: "PrivacyPool", desc: "Per-asset pool for funds and state", link: "/layers/contracts/privacy-pools" },
      { name: "State", desc: "Merkle trees, nullifiers, root history", link: "/layers/contracts" },
    ],
  },
  {
    label: "ZK Layer",
    icon: IconCircuit,
    link: "/layers/zk",
    description: "Circom circuits proving deposits and withdrawals without revealing identity.",
    items: [
      { name: "Commitment", desc: "Hashes secrets into commitments", link: "/layers/zk/commitment" },
      { name: "Withdrawal", desc: "Proves ownership and membership", link: "/layers/zk/withdrawal" },
      { name: "Lean-IMT", desc: "Incremental Merkle tree proofs", link: "/layers/zk/lean-imt" },
    ],
  },
  {
    label: "ASP Layer",
    icon: IconCheckShield,
    link: "/layers/asp",
    description: "Off-chain compliance attestations that gate private withdrawals.",
    items: [
      { name: "Label management", desc: "Approved labels and revocation", link: "/layers/asp" },
      { name: "Root updates", desc: "On-chain ASP root publication", link: "/layers/asp" },
      { name: "Compliance", desc: "Private attestation of deposit origin", link: "/layers/asp" },
    ],
  },
];

/* ── Components ── */

function SearchTrigger(): React.JSX.Element {
  const handleClick = () => {
    const btn = document.querySelector<HTMLButtonElement>(".aa-DetachedSearchButton");
    btn?.click();
  };

  return (
    <button type="button" className={styles.searchTrigger} onClick={handleClick}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span>Search documentation...</span>
      <kbd>⌘K</kbd>
    </button>
  );
}

export default function Home(): React.JSX.Element {
  return (
    <Layout
      title="Privacy Pools Documentation"
      description="Technical documentation for Privacy Pools: public deposits, private withdrawals, and developer integration guidance."
    >
      <main className={styles.main}>
        {/* Hero */}
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>Privacy Pools Documentation</h1>
          <p className={styles.heroDeck}>
            Public deposits, private withdrawals, and a public fallback exit.
          </p>
          <div className={styles.heroActions}>
            <SearchTrigger />
            <Link to="/build/start" className={styles.introButton}>
              Start integrating <span className={styles.introArrow}>→</span>
            </Link>
          </div>
        </section>

        {/* Persona cards */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Get started</span>
            <h2 className={styles.sectionTitle}>Choose your path</h2>
          </div>
          <div className={styles.personas}>
            {PERSONAS.map((p) => (
              <Link key={p.title} to={p.link} className={styles.personaCard}>
                <div className={styles.personaIconWrap}>
                  <p.icon className={styles.personaIcon} aria-hidden="true" />
                </div>
                <h3 className={styles.personaTitle}>{p.title}</h3>
                <p className={styles.personaDesc}>{p.description}</p>
                <span className={styles.personaLink}>{p.label} <span className={styles.personaArrow}>→</span></span>
              </Link>
            ))}
          </div>
        </section>

        {/* Architecture */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>How it works</span>
            <h2 className={styles.sectionTitle}>Protocol architecture</h2>
            <p className={styles.sectionDesc}>
              Smart contracts for state, ZK circuits for privacy, and an ASP for compliance.
            </p>
          </div>
          <div className={styles.archGrid}>
            {ARCH_LAYERS.map((layer) => (
              <div key={layer.label} className={styles.archLayer}>
                <div className={styles.archTop}>
                  <div className={styles.archIconWrap}>
                    <layer.icon className={styles.archIcon} aria-hidden="true" />
                  </div>
                  <Link to={layer.link} className={styles.archHeader}>
                    <span className={styles.archLabel}>{layer.label}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.archHeaderArrow}>
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                  <p className={styles.archDesc}>{layer.description}</p>
                </div>
                <div className={styles.archItems}>
                  {layer.items.map((item) => (
                    <Link key={item.name} to={item.link} className={styles.archItem}>
                      <span className={styles.archItemName}>{item.name}</span>
                      <span className={styles.archItemDesc}>{item.desc}</span>
                      <span className={styles.archItemArrow} aria-hidden="true">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}
