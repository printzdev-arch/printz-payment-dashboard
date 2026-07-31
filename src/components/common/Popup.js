"use client"

import { useEffect, useState } from "react"
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
  const [timeRemaining, setTimeRemaining] = useState(autoCloseDelay / 1000)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setTimeRemaining(autoCloseDelay / 1000)
    } else {
      setIsVisible(false)
    }
  }, [isOpen, autoCloseDelay])

  useEffect(() => {
    let timer
    let countdownTimer

    const closePopup = () => {
      setIsVisible(false)
      setTimeout(() => {
        onClose()
      }, 300) // Wait for animation to complete
    }

    if (isOpen && autoClose) {
      // Auto close timer
      timer = setTimeout(() => {
        closePopup()
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
  }, [isOpen, autoClose, autoCloseDelay, onClose])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
    }, 300) // Wait for animation to complete
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  const getPopupIcon = () => {
    switch (type) {
      case "success":
        return "✓"
      case "error":
        return "✕"
      case "warning":
        return "!"
      case "info":
      default:
        return "ℹ"
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
    <div className={`popup-overlay ${isVisible ? "popup-overlay-visible" : ""}`} onClick={handleOverlayClick}>
      <div className={`popup-container popup-${type} ${isVisible ? "popup-visible" : ""}`}>
        {/* Header */}
        <div className="popup-header">
          <div className="popup-title-section">
            <div className={`popup-icon popup-icon-${type}`}>{getPopupIcon()}</div>
            <h3 className="popup-title">{getPopupTitle()}</h3>
          </div>
          <button className="popup-close-btn" onClick={handleClose} aria-label="Close popup">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="popup-content">
          {typeof content === "string" ? <p style={{ whiteSpace: "pre-wrap" }}>{content}</p> : content}
        </div>

        {/* Footer with countdown */}
        {autoClose && (
          <div className="popup-footer">
            <div className="popup-countdown">
              <span>Auto-close in {timeRemaining}s</span>
              <div className="popup-progress-bar">
                <div
                  className="popup-progress-fill"
                  style={{
                    width: `${(timeRemaining / (autoCloseDelay / 1000)) * 100}%`,
                    animationDuration: `${autoCloseDelay}ms`,
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
