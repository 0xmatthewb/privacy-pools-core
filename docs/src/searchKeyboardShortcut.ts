/**
 * Global Cmd+K / Ctrl+K shortcut to open the search modal.
 * Registered as a Docusaurus client module in docusaurus.config.ts.
 */

if (typeof window !== "undefined") {
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      const searchButton = document.querySelector<HTMLButtonElement>(
        "button.aa-DetachedSearchButton",
      );
      searchButton?.click();
    }
  });
}

export {};
