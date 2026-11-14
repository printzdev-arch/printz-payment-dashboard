import { useLayoutEffect, useState } from "react";

/**
 * Places a dropdown menu next to its field, on top of the page (render the menu with a portal into <body>).
 * It opens below the field, flips above when there is no room, and always stays on screen,
 * so a popup or card around the field can never cut it off.
 *
 * Returns an inline style for the menu; spread it onto the menu element. Until the position is known the menu is hidden.
 */
export default function useFloatingMenu(anchorRef, menuRef, isOpen, { preferUp = false, minWidth = 0, deps = [] } = {}) {
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPos(null);
      return undefined;
    }
    const place = () => {
      const anchor = anchorRef.current;
      const menu = menuRef.current;
      if (!anchor || !menu) return;
      const t = anchor.getBoundingClientRect();
      const m = menu.getBoundingClientRect();
      const margin = 8;
      const gap = 4;
      const left = Math.max(margin, Math.min(t.left, window.innerWidth - m.width - margin));
      const roomBelow = window.innerHeight - t.bottom - margin;
      const roomAbove = t.top - margin;
      let up = preferUp ? roomAbove >= Math.min(m.height, 160) || roomAbove > roomBelow : m.height > roomBelow && roomAbove > roomBelow;
      if (!up && m.height > roomBelow && roomAbove > roomBelow) up = true;
      const top = up ? Math.max(margin, t.top - m.height - gap) : Math.min(t.bottom + gap, Math.max(margin, window.innerHeight - m.height - margin));
      const next = { top: Math.round(top), left: Math.round(left), width: Math.round(t.width) };
      // Only re-render when the place really changed (otherwise scrolling the list would keep resetting it)
      setPos((prev) => (prev && prev.top === next.top && prev.left === next.left && prev.width === next.width ? prev : next));
    };
    // Scrolling inside the menu itself must not move or redraw it
    const onScroll = (e) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return;
      place();
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, preferUp, ...deps]);

  return {
    position: "fixed",
    top: pos ? pos.top : 0,
    left: pos ? pos.left : 0,
    right: "auto",
    bottom: "auto",
    minWidth: pos ? Math.max(pos.width, minWidth) : minWidth || undefined,
    visibility: pos ? "visible" : "hidden",
  };
}
