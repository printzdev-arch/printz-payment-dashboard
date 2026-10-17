import React, { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  modalBackdropVariants,
  modalDialogVariants,
  reducedMotionVariants,
  isReducedMotionPreferred,
} from "./motionTokens";

/**
 * Reusable MotionModal wrapper for dialogs, drawer overlays, and popup confirmations.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls visibility
 * @param {Function} props.onClose - Callback on backdrop click or Escape key
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} [props.backdropClassName] - Additional classes for backdrop
 * @param {string} [props.dialogClassName] - Additional classes for dialog wrapper
 * @param {boolean} [props.closeOnBackdropClick=true]
 * @param {boolean} [props.closeOnEscape=true]
 */
export const MotionModal = ({
  isOpen,
  onClose,
  children,
  backdropClassName = "",
  dialogClassName = "",
  closeOnBackdropClick = true,
  closeOnEscape = true,
}) => {
  const prefersReduced = useMemo(() => isReducedMotionPreferred(), []);

  useEffect(() => {
    if (!isOpen || !closeOnEscape || !onClose) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  const activeBackdrop = prefersReduced ? reducedMotionVariants : modalBackdropVariants;
  const activeDialog = prefersReduced ? reducedMotionVariants : modalDialogVariants;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="motion-modal-backdrop"
          variants={activeBackdrop}
          initial="closed"
          animate="open"
          exit="closed"
          onClick={closeOnBackdropClick ? onClose : undefined}
          className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm ${backdropClassName}`}
          style={{ willChange: "opacity" }}
        >
          <motion.div
            key="motion-modal-dialog"
            variants={activeDialog}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] overflow-x-hidden overflow-y-auto bg-white rounded-xl sm:rounded-2xl shadow-2xl ${dialogClassName}`}
            style={{ willChange: "transform, opacity" }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MotionModal;