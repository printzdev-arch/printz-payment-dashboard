import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MOTION_TIMINGS, MOTION_EASINGS, isReducedMotionPreferred } from "./motionTokens";

/**
 * Reusable MotionTableFade wrapper.
 * Provides a gentle cross-fade when data updates, searches resolve, or switching between
 * Loading Skeleton <-> Table Data <-> Empty State, without animating individual rows.
 *
 * @param {Object} props
 * @param {string|number} [props.dataKey] - Key representing dataset version (e.g. page number, search query, or loading state)
 * @param {React.ReactNode} props.children
 * @param {string} [props.className=""]
 */
export const MotionTableFade = ({
  dataKey = "table-content",
  children,
  className = "",
  style = {},
}) => {
  const prefersReduced = useMemo(() => isReducedMotionPreferred(), []);

  if (prefersReduced) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={dataKey}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: MOTION_TIMINGS.normal,
          ease: MOTION_EASINGS.easeOut,
        }}
        className={className}
        style={style}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default MotionTableFade;