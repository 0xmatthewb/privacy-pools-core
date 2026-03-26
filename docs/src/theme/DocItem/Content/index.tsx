/**
 * Swizzled DocItem/Content (eject). Adds PageActions button beside the H1 title.
 * No config-level alternative exists for injecting components into the title row.
 *
 * Based on @docusaurus/theme-classic v3.7.0 DocItem/Content (MIT license).
 * On Docusaurus upgrades, diff against the upstream source to pick up changes:
 *   node_modules/@docusaurus/theme-classic/src/theme/DocItem/Content/index.tsx
 */

import React from "react";
import clsx from "clsx";
import { ThemeClassNames } from "@docusaurus/theme-common";
import { useDoc } from "@docusaurus/plugin-content-docs/client";
import Heading from "@theme/Heading";
import MDXContent from "@theme/MDXContent";
import PageActions from "../../../components/PageActions";
import styles from "./styles.module.css";

/**
 * Resolve the page title: either from the markdown H1 (contentTitle)
 * or from metadata when the markdown has no H1.
 */
function usePageTitle(): string | null {
  const { metadata, frontMatter, contentTitle } = useDoc();
  if (frontMatter.hide_title) return null;
  return contentTitle ?? metadata.title;
}

export default function DocItemContent({ children }: { children: React.ReactNode }): React.JSX.Element {
  const title = usePageTitle();

  return (
    <div className={clsx(ThemeClassNames.docs.docMarkdown, "markdown")}>
      {title && (
        <header className={styles.headerRow}>
          <Heading as="h1" className={styles.title}>
            {title}
          </Heading>
          <PageActions />
        </header>
      )}
      <MDXContent>{children}</MDXContent>
    </div>
  );
}
