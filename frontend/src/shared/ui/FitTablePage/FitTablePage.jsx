import { useEffect } from "react";
import "./fitTablePage.css";

const MAX_ABOVE = 340; // height of titles / filters / small stat rows allowed above the table
const MAX_BELOW = 120;

// Pages that are just a table (title + filters + table): fix the page and let only the table body scroll.
// It re-checks whenever the page content changes, so tabbed pages switch in and out of this mode by themselves.
export default function FitTablePage({ routeKey }) {
  useEffect(() => {
    const body = document.querySelector(".content-body");
    if (!body) return undefined;
    let frame = 0;

    const clear = () => {
      body.classList.remove("fit-table");
      body.querySelectorAll("[data-fit]").forEach((el) => el.removeAttribute("data-fit"));
    };

    const evaluate = () => {
      frame = 0;
      const cards = [...body.querySelectorAll(".printz-dt-card")].filter((c) => !c.closest("[role='dialog'], .modal, .modal-overlay"));
      const tables = [...body.querySelectorAll("table")].filter((t) => !t.closest(".printz-dt-card") && !t.closest("[role='dialog'], .modal, .modal-overlay"));
      if (cards.length !== 1 || tables.length > 0) {
        clear();
        return;
      }
      const card = cards[0];
      let above = 0;
      let below = 0;
      const chain = [];
      for (let el = card; el && el !== body; el = el.parentElement) {
        chain.push(el);
        for (let p = el.previousElementSibling; p; p = p.previousElementSibling) above += p.offsetHeight;
        for (let n = el.nextElementSibling; n; n = n.nextElementSibling) {
          const pos = getComputedStyle(n).position;
          if (pos !== "fixed" && pos !== "absolute") below += n.offsetHeight;
        }
      }
      if (above > MAX_ABOVE || below > MAX_BELOW) {
        clear();
        return;
      }
      body.querySelectorAll("[data-fit]").forEach((el) => el.removeAttribute("data-fit"));
      chain.forEach((el, i) => el.setAttribute("data-fit", i === 0 ? "card" : i === chain.length - 1 ? "root" : "mid"));
      body.classList.add("fit-table");
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(evaluate);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
      clear();
    };
  }, [routeKey]);

  return null;
}
