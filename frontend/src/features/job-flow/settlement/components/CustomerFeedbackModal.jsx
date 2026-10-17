import React, { useState } from "react";
import { X, Star, HeartHandshake, Send } from "lucide-react";
import { toast } from "react-toastify";
import settlementApi from "../api/settlementApi";

export const CustomerFeedbackModal = ({ isOpen, onClose, jobId, jobNo, onFeedbackSaved }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comments, setComments] = useState("Superb print quality and prompt delivery!");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settlementApi.submitJobFeedback(jobId, {
        rating: Number(rating),
        comments,
      });
      toast.success("Thank you! Customer feedback & designer rating recorded!");
      if (onFeedbackSaved) onFeedbackSaved({ rating, comments });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal jf-modal-sm">
        <div className="jf-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Star size={20} style={{ color: "#eab308", fill: "#eab308" }} />
            <div>
              <h2 className="jf-modal-title">Customer Feedback & Rating</h2>
              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                Job Order: <strong>{jobNo}</strong>
              </div>
            </div>
          </div>
          <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="jf-modal-body" style={{ textAlign: "center", padding: "1.5rem 1rem" }}>
            <div style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }}>
              Rate customer satisfaction. This directly attributes performance metrics to the assigned graphic designer.
            </div>

            {/* 5-Star Rating Selector */}
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.25rem",
                    transition: "transform 0.15s ease",
                  }}
                >
                  <Star
                    size={36}
                    style={{
                      color: (hoverRating || rating) >= star ? "#eab308" : "#cbd5e1",
                      fill: (hoverRating || rating) >= star ? "#eab308" : "none",
                    }}
                  />
                </button>
              ))}
            </div>

            <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b", marginBottom: "1rem" }}>
              {rating === 5 && "⭐⭐⭐⭐⭐ Outstanding (5/5)"}
              {rating === 4 && "⭐⭐⭐⭐ Very Good (4/5)"}
              {rating === 3 && "⭐⭐⭐ Satisfactory (3/5)"}
              {rating === 2 && "⭐⭐ Needs Improvement (2/5)"}
              {rating === 1 && "⭐ Unsatisfactory (1/5)"}
            </div>

            {/* Review Comments */}
            <div className="jf-form-group" style={{ textAlign: "left" }}>
              <label className="jf-label">Customer Review Comments</label>
              <textarea
                className="jf-textarea"
                rows={3}
                placeholder="Share customer remarks on print clarity, delivery speed, and design responsiveness..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="jf-modal-footer">
            <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="jf-btn jf-btn-primary" disabled={loading}>
              <Send size={14} /> Submit Feedback
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerFeedbackModal;
