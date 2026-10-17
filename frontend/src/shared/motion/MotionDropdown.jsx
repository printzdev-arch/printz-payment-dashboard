import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dropdownVariants, reducedMotionVariants, isReducedMotionPreferred } from "./motionTokens";

/**
 * Reusable MotionDropdown wrapper for profile menus, action popovers, and filters.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the dropdown is open
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {Object} [props.style]
 */
export const MotionDropdown = ({
  isOpen,
  children,
  className = "",
  style = {},
  ...restProps
}) => {
  const prefersReduced = useMemo(() => isReducedMotionPreferred(), []);
  const activeVariants = prefersReduced ? reducedMotionVariants : dropdownVariants;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="motion-dropdown-content"
          variants={activeVariants}
          initial="closed"
          animate="open"
          exit="closed"
          className={className}
          style={{
            transformOrigin: "top right",
            willChange: "transform, opacity",
            maxWidth: "calc(100vw - 16px)",
            ...style,
          }}
          {...restProps}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MotionDropdown;