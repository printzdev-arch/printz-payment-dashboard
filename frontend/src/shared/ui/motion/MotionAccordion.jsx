import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MOTION_TIMINGS, MOTION_EASINGS, isReducedMotionPreferred } from "./motionTokens";

/**
 * Reusable MotionAccordion wrapper for collapsible submenus and collapsible panel sections.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls expansion state
 * @param {React.ReactNode} props.children - Content inside collapsible container
 * @param {string} [props.className] - Optional container classes
 * @param {string} [props.innerClassName] - Optional inner wrapper classes
 */
export const MotionAccordion = ({
  isOpen,
  children,
  className = "",
  innerClassName = "",
}) => {
  const prefersReduced = useMemo(() => isReducedMotionPreferred(), []);

  if (prefersReduced) {
    if (!isOpen) return null;
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="motion-accordion-body"
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: "auto",
            opacity: 1,
            transition: {
              height: { duration: MOTION_TIMINGS.normal + 0.1, ease: MOTION_EASINGS.easeOut },
              opacity: { duration: MOTION_TIMINGS.normal, delay: 0.05, ease: MOTION_EASINGS.easeOut },
            },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: {
              height: { duration: MOTION_TIMINGS.normal, ease: MOTION_EASINGS.easeInOut },
              opacity: { duration: MOTION_TIMINGS.fast, ease: MOTION_EASINGS.easeInOut },
            },
          }}
          style={{ overflow: "hidden" }}
          className={className}
        >
          <div className={innerClassName}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MotionAccordion;