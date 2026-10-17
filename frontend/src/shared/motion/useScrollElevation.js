import { useState, useEffect } from "react";

/**
 * Hook to track whether a scrollable container has scrolled past a given threshold.
 * Useful for adding subtle topbar shadow or backdrop elevation on scroll.
 *
 * @param {string} [selector=".content-body"] - CSS selector of scroll container (or "window")
 * @param {number} [threshold=10] - Scroll offset in pixels to trigger elevation
 * @returns {boolean} isScrolled
 */
export const useScrollElevation = (selector = ".content-body", threshold = 10) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let target = null;
    if (selector === "window") {
      target = window;
    } else {
      target = document.querySelector(selector);
    }

    if (!target) return;

    const handleScroll = () => {
      const currentScroll =
        selector === "window" ? window.scrollY : target.scrollTop;
      setIsScrolled(currentScroll > threshold);
    };

    target.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      target.removeEventListener("scroll", handleScroll);
    };
  }, [selector, threshold]);

  return isScrolled;
};

export default useScrollElevation;