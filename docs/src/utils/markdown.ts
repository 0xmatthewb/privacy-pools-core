const MARKDOWN_ROUTE_EXCLUSIONS = [
  { docId: "toc", path: "/toc" },
  { docId: "privacy-policy", path: "/privacy-policy" },
] as const;

const NO_MARKDOWN_DOC_IDS = new Set(
  MARKDOWN_ROUTE_EXCLUSIONS.map((entry) => entry.docId),
);
const NO_MARKDOWN_PATHS = new Set(
  MARKDOWN_ROUTE_EXCLUSIONS.map((entry) => entry.path),
);

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

export function canExposeMarkdownForDocId(docId: string): boolean {
  return !NO_MARKDOWN_DOC_IDS.has(docId);
}

export function canExposeMarkdownForPath(pathname: string): boolean {
  return !NO_MARKDOWN_PATHS.has(normalizePath(pathname));
}

export function toMarkdownPathFromPathname(pathname: string): string {
  const normalizedPath = normalizePath(pathname);
  const basePath =
    normalizedPath === "/"
      ? "/overview/what-is-privacy-pools"
      : normalizedPath;

  return `${basePath}.md`;
}

export function toMarkdownPathFromSource(
  source: string,
  permalink: string,
): string {
  const normalizedSource = source.replace(/\\/g, "/");
  const siteDocsMatch = normalizedSource.match(
    /^@site\/docs\/docs\/(.+?)\.(md|mdx)$/i,
  );
  if (siteDocsMatch?.[1]) {
    return `/${siteDocsMatch[1]}.md`;
  }

  const i18nDocsMatch = normalizedSource.match(
    /docusaurus-plugin-content-docs\/current\/(.+?)\.(md|mdx)$/i,
  );
  if (i18nDocsMatch?.[1]) {
    return `/${i18nDocsMatch[1]}.md`;
  }

  return toMarkdownPathFromPathname(permalink);
}

export function toAbsoluteSiteUrl(pathname: string, origin: string): string {
  return new URL(pathname, origin).toString();
}
