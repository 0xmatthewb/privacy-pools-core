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

    if (e.key === "Escape") {
      const cancelButton = document.querySelector<HTMLButtonElement>(
        ".aa-DetachedCancelButton",
      );
      cancelButton?.click();
    }
  });

  /* Clear search input whenever the modal closes */
  const observer = new MutationObserver(() => {
    const container = document.querySelector(".aa-DetachedContainer");
    if (!container) {
      const input = document.querySelector<HTMLInputElement>(".aa-Input");
      if (input && input.value) {
        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

export {};
