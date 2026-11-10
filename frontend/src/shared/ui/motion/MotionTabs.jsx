import React, { useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MOTION_TIMINGS, MOTION_EASINGS, isReducedMotionPreferred } from "./motionTokens";

/**
 * Reusable MotionTabs navigation with an animated sliding active indicator pill.
 *
 * @param {Object} props
 * @param {Array<{ id: string|number, label: React.ReactNode, icon?: React.ReactNode, count?: number|string }>} props.tabs
 * @param {string|number} props.activeTab - Currently active tab id
 * @param {Function} props.onChange - Called when a tab is clicked
 * @param {string} [props.className] - Outer container className
 * @param {string} [props.tabClassName] - Base tab button className
 * @param {string} [props.activeTabClassName] - Additional class for active tab text/icon
 * @param {string} [props.indicatorClassName] - Styling for the moving background indicator
 * @param {string} [props.layoutId="motion-tab-active-pill"] - Unique layout ID to link the indicator
 */
export const MotionTabs = ({
  tabs = [],
  activeTab,
  onChange,
  className = "flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
  tabClassName = "relative shrink-0 whitespace-nowrap px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-300 ease-out cursor-pointer select-none",
  activeTabClassName = "text-emerald-700 font-bold",
  inactiveTabClassName = "text-slate-600 hover:text-slate-900",
  indicatorClassName = "absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/60",
  layoutId = "motion-tab-active-pill",
}) => {
  const prefersReduced = useMemo(() => isReducedMotionPreferred(), []);
  const activeRef = useRef(null);

  // Keep the active tab visible when the tab strip scrolls on small screens
  useEffect(() => {
    const el = activeRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({
        behavior: prefersReduced ? "auto" : "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [activeTab, prefersReduced]);

  return (
    <div className={className} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={isActive ? activeRef : null}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange && onChange(tab.id)}
            className={`${tabClassName} ${isActive ? activeTabClassName : inactiveTabClassName}`}
          >
            {isActive && (
              <motion.div
                layoutId={prefersReduced ? undefined : layoutId}
                className={indicatorClassName}
                transition={{
                  type: "spring",
                  stiffness: 220,
                  damping: 28,
                  mass: 0.9,
                }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.icon && <span>{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count !== null && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors duration-300 ${
                    isActive
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default MotionTabs;