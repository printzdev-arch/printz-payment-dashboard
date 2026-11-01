import React, { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  modalBackdropVariants,
  modalDialogVariants,
  reducedMotionVariants,
  isReducedMotionPreferred,
} from "./motionTokens";

/**
 * Reusable MotionModal wrapper for dialogs, drawer overlays, and popup confirmations.
 * Renders into document.body via createPortal to guarantee viewport centering and prevent clipping.
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

  // Lock body scroll when modal is open to avoid background shifts
  useEffect(() => {
    if (isOpen && typeof document !== "undefined") {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const activeBackdrop = prefersReduced ? reducedMotionVariants : modalBackdropVariants;
  const activeDialog = prefersReduced ? reducedMotionVariants : modalDialogVariants;

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="motion-modal-backdrop"
          variants={activeBackdrop}
          initial="closed"
          animate="open"
          exit="closed"
          onClick={closeOnBackdropClick ? onClose : undefined}
          className={`so-modal-overlay jf-modal-overlay ${backdropClassName}`}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.25rem",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            overflowY: "auto",
            boxSizing: "border-box",
            willChange: "opacity",
          }}
        >
          <motion.div
            key="motion-modal-dialog"
            variants={activeDialog}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={(e) => e.stopPropagation()}
            className={dialogClassName}
            style={{
              width: "100%",
              maxWidth: "760px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              margin: "auto",
              boxSizing: "border-box",
              outline: "none",
              willChange: "transform, opacity",
              pointerEvents: "auto",
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default MotionModal;