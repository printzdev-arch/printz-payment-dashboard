/**
 * PrintZ Motion Tokens & Curves
 * Standardized timing and easing to maintain a unified, smooth and unhurried feel across the dashboard.
 */

export const MOTION_TIMINGS = {
  fast: 0.28,      // 280ms: buttons, pills, subtle hover effects
  normal: 0.4,     // 400ms: dropdowns, card entrances, accordions
  page: 0.5,       // 500ms: route transitions
  modal: 0.5,      // 500ms: modal open/close
};

// Soft, silky curves (long gentle deceleration, no harsh stops)
export const MOTION_EASINGS = {
  easeOut: [0.22, 1, 0.36, 1],
  easeInOut: [0.65, 0, 0.35, 1],
  sharp: [0.33, 1, 0.68, 1],
};

/**
 * Checks whether the user has requested reduced motion in their OS / browser
 */
export const isReducedMotionPreferred = () => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/**
 * Variants for smooth page transitions
 */
export const pageVariants = {
  initial: {
    opacity: 0,
    y: 14,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_TIMINGS.page,
      ease: MOTION_EASINGS.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: MOTION_TIMINGS.fast + 0.06,
      ease: MOTION_EASINGS.easeInOut,
    },
  },
};

/**
 * Fallback variant when prefers-reduced-motion is active
 */
export const reducedMotionVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.05 } },
  exit: { opacity: 0, transition: { duration: 0.05 } },
};

/**
 * Variants for dropdown menus
 */
export const dropdownVariants = {
  closed: {
    opacity: 0,
    y: -10,
    scale: 0.96,
    transition: {
      duration: MOTION_TIMINGS.fast,
      ease: MOTION_EASINGS.easeInOut,
    },
  },
  open: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: MOTION_TIMINGS.normal,
      ease: MOTION_EASINGS.easeOut,
    },
  },
};

/**
 * Variants for modal dialogues
 */
export const modalBackdropVariants = {
  closed: { opacity: 0 },
  open: {
    opacity: 1,
    transition: { duration: MOTION_TIMINGS.modal, ease: MOTION_EASINGS.easeOut },
  },
};

export const modalDialogVariants = {
  closed: {
    opacity: 0,
    scale: 0.94,
    y: 20,
    transition: {
      duration: MOTION_TIMINGS.fast + 0.05,
      ease: MOTION_EASINGS.easeInOut,
    },
  },
  open: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: MOTION_TIMINGS.modal + 0.1,
      ease: MOTION_EASINGS.easeOut,
    },
  },
};