"use client"

import React, { useEffect, useState, useCallback } from "react"
import { Check, AlertCircle, AlertTriangle, Info, X } from "lucide-react"
import "../../styles/popup.css"

const Popup = ({
  isOpen,
  onClose,
  content,
  type = "info", // success, error, info, warning
  autoClose = true,
  autoCloseDelay = 5000,
  title = "",
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(Math.ceil(autoCloseDelay / 1000))

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setTimeRemaining(Math.ceil(autoCloseDelay / 1000))
    } else {
      setIsVisible(false)
    }
  }, [isOpen, autoCloseDelay])

  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
    }, 280) // Wait for exit animation to complete
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, handleClose])

  useEffect(() => {
    let timer
    let countdownTimer

    if (isOpen && autoClose) {
      // Auto close timer
      timer = setTimeout(() => {
        handleClose()
      }, autoCloseDelay)

      // Countdown timer
      countdownTimer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timer) clearTimeout(timer)
      if (countdownTimer) clearInterval(countdownTimer)
    }
  }, [isOpen, autoClose, autoCloseDelay, handleClose])

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  const getPopupIcon = () => {
    switch (type) {
      case "success":
        return <Check size={20} strokeWidth={2.5} />
      case "error":
        return <AlertCircle size={20} strokeWidth={2.5} />
      case "warning":
        return <AlertTriangle size={20} strokeWidth={2.5} />
      case "info":
      default:
        return <Info size={20} strokeWidth={2.5} />
    }
  }

  const getPopupTitle = () => {
    if (title) return title

    switch (type) {
      case "success":
        return "Success"
      case "error":
        return "Error"
      case "warning":
        return "Warning"
      case "info":
      default:
        return "Information"
    }
  }

  if (!isOpen) return null

  return (
    <div
      className={`popup-overlay ${isVisible ? "popup-overlay-visible" : ""}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div className={`popup-container popup-${type} ${isVisible ? "popup-visible" : ""}`}>
        {/* Header */}
        <div className="popup-header">
          <div className="popup-title-section">
            <div className={`popup-icon popup-icon-${type}`}>
              {getPopupIcon()}
            </div>
            <h3 className="popup-title">{getPopupTitle()}</h3>
          </div>
          <button
            className="popup-close-btn"
            onClick={handleClose}
            aria-label="Close popup"
            type="button"
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>

        {/* Content */}
        <div className="popup-content">
          {typeof content === "string" ? (
            <p style={{ whiteSpace: "pre-wrap" }}>{content}</p>
          ) : (
            content
          )}
        </div>

        {/* Footer with countdown */}
        {autoClose && (
          <div className="popup-footer">
            <div className="popup-countdown">
              <span>Auto-closing in {timeRemaining}s</span>
              <div className="popup-progress-bar">
                <div
                  className="popup-progress-fill"
                  style={{
                    width: `${(timeRemaining / (autoCloseDelay / 1000)) * 100}%`,
                    transitionDuration: "1s",
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export { Popup }
export default Popup
