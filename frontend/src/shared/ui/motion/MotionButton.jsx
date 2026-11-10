import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { MOTION_TIMINGS, MOTION_EASINGS, isReducedMotionPreferred } from "./motionTokens";

/**
 * Reusable MotionButton with tactile hover and click feedback.
 * Automatically disables motion when loading or disabled.
 *
 * @param {Object} props
 * @param {boolean} [props.isLoading=false]
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.disableHover=false]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export const MotionButton = ({
  isLoading = false,
  disabled = false,
  disableHover = false,
  children,
  className = "",
  type = "button",
  onClick,
  ...restProps
}) => {
  const prefersReduced = useMemo(() => isReducedMotionPreferred(), []);
  const isInteractive = !disabled && !isLoading;

  if (prefersReduced || !isInteractive) {
    return (
      <button
        type={type}
        disabled={disabled || isLoading}
        onClick={onClick}
        className={className}
        {...restProps}
      >
        {children}
      </button>
    );
  }

  return (
    <motion.button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      whileHover={
        !disableHover
          ? {
              y: -2,
              transition: { duration: MOTION_TIMINGS.normal, ease: MOTION_EASINGS.easeOut },
            }
          : undefined
      }
      whileTap={{
        scale: 0.97,
        transition: { duration: MOTION_TIMINGS.fast, ease: MOTION_EASINGS.sharp },
      }}
      className={className}
      {...restProps}
    >
      {children}
    </motion.button>
  );
};

export default MotionButton;