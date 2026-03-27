/**
 * Global Cmd+K / Ctrl+K shortcut to open the search modal,
 * plus smooth exit animation for the search overlay + container.
 * Registered as a Docusaurus client module in docusaurus.config.ts.
 */

if (typeof window !== "undefined") {
  const EXIT_DURATION = 120; // ms — must match searchModalOut / searchOverlayOut
  let isAnimatingClose = false;
  let isFinalClose = false; // true during the programmatic cancel click after animation

  /**
   * Animate the search modal out, then let the library remove it.
   * Returns true if an animation was started, false if no modal was open.
   */
  function animateSearchClose(): boolean {
    if (isAnimatingClose) return true;
    const container = document.querySelector<HTMLElement>(
      ".aa-DetachedContainer",
    );
    const overlay = document.querySelector<HTMLElement>(".aa-DetachedOverlay");
    if (!container) return false;

    // Check prefers-reduced-motion — skip animation if so
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return false; // let default instant close happen
    }

    isAnimatingClose = true;
    container.classList.add("aa-closing");
    overlay?.classList.add("aa-closing");

    setTimeout(() => {
      isAnimatingClose = false;
      isFinalClose = true; // let the click pass through capture handlers
      container.classList.remove("aa-closing");
      overlay?.classList.remove("aa-closing");
      const cancelButton = document.querySelector<HTMLButtonElement>(
        ".aa-DetachedCancelButton",
      );
      cancelButton?.click();
      isFinalClose = false;
    }, EXIT_DURATION);

    return true;
  }

  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      const searchButton = document.querySelector<HTMLButtonElement>(
        "button.aa-DetachedSearchButton",
      );
      searchButton?.click();
    }

    if (e.key === "Escape") {
      if (animateSearchClose()) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });

  /* Intercept overlay clicks (clicking outside the modal to close) */
  document.addEventListener(
    "click",
    (e: MouseEvent) => {
      if (isFinalClose) return; // let the programmatic close through
      const target = e.target as HTMLElement;
      if (
        target?.classList?.contains("aa-DetachedOverlay") &&
        !isAnimatingClose
      ) {
        e.preventDefault();
        e.stopPropagation();
        animateSearchClose();
      }
    },
    true, // capture phase — intercept before the library handles it
  );

  /* Intercept cancel button clicks */
  document.addEventListener(
    "click",
    (e: MouseEvent) => {
      if (isFinalClose) return; // let the programmatic close through
      const target = e.target as HTMLElement;
      if (
        target?.classList?.contains("aa-DetachedCancelButton") &&
        !isAnimatingClose
      ) {
        e.preventDefault();
        e.stopPropagation();
        animateSearchClose();
      }
    },
    true, // capture phase
  );

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
