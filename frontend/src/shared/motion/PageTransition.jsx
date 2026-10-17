import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { pageVariants, reducedMotionVariants, isReducedMotionPreferred } from "./motionTokens";

/**
 * Reusable PageTransition wrapper
 * Provides subtle opacity + vertical slide entrance without remounting dashboard shells.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string|number} [props.routeKey] - Unique key (e.g. location.pathname) to trigger transition on route change
 * @param {string} [props.className]
 */
export const PageTransition = ({ children, routeKey, className = "" }) => {
  const prefersReduced = useMemo(() => isReducedMotionPreferred(), []);
  const activeVariants = prefersReduced ? reducedMotionVariants : pageVariants;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey || "page-transition-content"}
        variants={activeVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={`printz-page-transition-wrap ${className}`}
        style={{
          width: "100%",
          minHeight: "100%",
          willChange: "opacity, transform",
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;