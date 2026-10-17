import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Info, AlertTriangle, X } from "lucide-react";
import { toast as reactToastifyToast } from "react-toastify";
import { isReducedMotionPreferred } from "./motionTokens";

/**
 * Global singleton store for Motion Toasts
 */
const listeners = new Set();
let toastsState = [];
let toastIdCounter = 1;
const recentNotifications = new Map(); // For de-duplication

const notifyListeners = () => {
  listeners.forEach((listener) => listener([...toastsState]));
};

export const addMotionToast = ({
  id,
  type = "info",
  title,
  message,
  autoClose = 4500,
}) => {
  const toastId = id || `motion-toast-${toastIdCounter++}`;
  const now = Date.now();

  // Deduplication: prevent identical messages from spamming within 1200ms
  const dedupKey = `${type}:${typeof message === "string" ? message : JSON.stringify(message)}`;
  const lastTime = recentNotifications.get(dedupKey);
  if (lastTime && now - lastTime < 1200) {
    return toastId;
  }
  recentNotifications.set(dedupKey, now);

  // Derive default title if not provided
  let displayTitle = title;
  if (!displayTitle) {
    switch (type) {
      case "success":
        displayTitle = "Success";
        break;
      case "error":
        displayTitle = "Error";
        break;
      case "warning":
      case "warn":
        displayTitle = "Warning";
        break;
      case "info":
      default:
        displayTitle = "Info";
        break;
    }
  }

  // Normalize type
  const normalizedType = type === "warn" ? "warning" : type;

  const newToast = {
    id: toastId,
    type: normalizedType,
    title: displayTitle,
    message,
    autoClose: autoClose === false ? null : (autoClose || 4500),
    createdAt: now,
  };

  // Add toast, keep max 5 on screen to avoid viewport clutter
  toastsState = [newToast, ...toastsState.filter((t) => t.id !== toastId)].slice(0, 5);
  notifyListeners();
  return toastId;
};

export const removeMotionToast = (id) => {
  toastsState = toastsState.filter((t) => t.id !== id);
  notifyListeners();
};

export const clearMotionToasts = () => {
  toastsState = [];
  notifyListeners();
};

/**
 * Universal toast dispatcher compatible with react-toastify API
 */
export const toast = (content, options = {}) => {
  return addMotionToast({
    id: options.toastId,
    type: options.type || "info",
    title: options.title || options.data?.title,
    message: content,
    autoClose: options.autoClose,
  });
};

toast.success = (content, options = {}) => {
  // Also forward to react-toastify store so external hooks stay in sync
  try {
    if (reactToastifyToast?.success && !options._fromBridge) {
      reactToastifyToast.success(content, { ...options, _fromBridge: true });
    }
  } catch (_) {}

  return addMotionToast({
    id: options.toastId,
    type: "success",
    title: options.title || options.data?.title,
    message: content,
    autoClose: options.autoClose,
  });
};

toast.info = (content, options = {}) => {
  try {
    if (reactToastifyToast?.info && !options._fromBridge) {
      reactToastifyToast.info(content, { ...options, _fromBridge: true });
    }
  } catch (_) {}

  return addMotionToast({
    id: options.toastId,
    type: "info",
    title: options.title || options.data?.title,
    message: content,
    autoClose: options.autoClose,
  });
};

toast.warning = (content, options = {}) => {
  try {
    if (reactToastifyToast?.warning && !options._fromBridge) {
      reactToastifyToast.warning(content, { ...options, _fromBridge: true });
    }
  } catch (_) {}

  return addMotionToast({
    id: options.toastId,
    type: "warning",
    title: options.title || options.data?.title,
    message: content,
    autoClose: options.autoClose,
  });
};
toast.warn = toast.warning;

toast.error = (content, options = {}) => {
  try {
    if (reactToastifyToast?.error && !options._fromBridge) {
      reactToastifyToast.error(content, { ...options, _fromBridge: true });
    }
  } catch (_) {}

  return addMotionToast({
    id: options.toastId,
    type: "error",
    title: options.title || options.data?.title,
    message: content,
    autoClose: options.autoClose,
  });
};

toast.dismiss = (id) => {
  try {
    if (reactToastifyToast?.dismiss) {
      reactToastifyToast.dismiss(id);
    }
  } catch (_) {}
  if (id) {
    removeMotionToast(id);
  } else {
    clearMotionToasts();
  }
};

export const useMotionToast = () => toast;

if (typeof window !== "undefined") {
  window.toast = toast;
}

/**
 * Toast Item Component
 */
const MotionToastItem = ({ item, onDismiss }) => {
  const isReduced = isReducedMotionPreferred();

  useEffect(() => {
    if (!item.autoClose) return;
    const timer = setTimeout(() => {
      onDismiss(item.id);
    }, item.autoClose);
    return () => clearTimeout(timer);
  }, [item.id, item.autoClose, onDismiss]);

  const renderIcon = () => {
    switch (item.type) {
      case "success":
        return <Check size={18} strokeWidth={2.8} />;
      case "info":
        return <Info size={18} strokeWidth={2.8} />;
      case "warning":
        return <AlertTriangle size={18} strokeWidth={2.8} />;
      case "error":
        return <X size={18} strokeWidth={2.8} />;
      default:
        return <Info size={18} strokeWidth={2.8} />;
    }
  };

  return (
    <motion.div
      layout
      initial={
        isReduced
          ? { opacity: 0 }
          : { opacity: 0, y: -24, scale: 0.95 }
      }
      animate={
        isReduced
          ? { opacity: 1 }
          : { opacity: 1, y: 0, scale: 1 }
      }
      exit={
        isReduced
          ? { opacity: 0 }
          : { opacity: 0, y: -20, scale: 0.94, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } }
      }
      transition={{
        type: "spring",
        stiffness: 440,
        damping: 30,
        mass: 0.85,
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 120 }}
      dragElastic={0.3}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 75 || Math.abs(info.velocity.x) > 350) {
          onDismiss(item.id);
        }
      }}
      className={`printz-glass-pill-wrapper printz-glass-pill-wrapper--${item.type}`}
      style={{
        pointerEvents: "auto",
        width: "100%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div className={`printz-glass-pill printz-glass-pill--${item.type}`}>
        {/* Circular Status Icon */}
        <div className="printz-glass-pill__icon-circle">
          {renderIcon()}
        </div>

        {/* Text Area */}
        <div className="printz-glass-pill__content">
          <div className="printz-glass-pill__title">{item.title}</div>
          <div className="printz-glass-pill__message">
            {typeof item.message === "function" ? item.message() : item.message}
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          className="printz-glass-pill__close"
          onClick={() => onDismiss(item.id)}
          aria-label="Close notification"
        >
          <X size={15} strokeWidth={2.2} />
        </button>
      </div>
    </motion.div>
  );
};

/**
 * Top-Center Toast Container
 */
export const MotionToastContainer = () => {
  const [toasts, setToasts] = useState(toastsState);
  const isListeningRef = useRef(false);

  useEffect(() => {
    const handleUpdate = (updatedList) => {
      setToasts(updatedList);
    };
    listeners.add(handleUpdate);

    // Bridge with react-toastify's onChange event to automatically catch
    // calls from existing components that still import from "react-toastify"
    if (!isListeningRef.current && typeof reactToastifyToast?.onChange === "function") {
      isListeningRef.current = true;
      try {
        const unsubscribe = reactToastifyToast.onChange((payload) => {
          if (!payload) return;
          if (payload.status === "added") {
            const rawType = payload.type || "info";
            const normType = rawType === "default" ? "info" : rawType;
            addMotionToast({
              id: String(payload.id),
              type: normType,
              title: payload.data?.title,
              message: payload.content,
              autoClose: payload.autoClose,
            });
          } else if (payload.status === "removed") {
            removeMotionToast(String(payload.id));
          }
        });

        return () => {
          listeners.delete(handleUpdate);
          if (typeof unsubscribe === "function") unsubscribe();
        };
      } catch (err) {
        console.warn("Could not attach react-toastify bridge listener", err);
      }
    }

    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  return (
    <div
      className="printz-motion-toast-container"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {toasts.map((item) => (
          <MotionToastItem
            key={item.id}
            item={item}
            onDismiss={removeMotionToast}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default MotionToastContainer;
