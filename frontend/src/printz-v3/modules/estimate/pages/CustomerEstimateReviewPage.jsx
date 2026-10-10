import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import CustomerEstimateReviewView from "../../customer/components/CustomerEstimateReviewView";
import { getCustomerEstimate } from "../api/estimateApi";
import "../../customer/styles/customerV3.css";
import "../../job/styles/jobV3.css";
import "../styles/estimateV3.css";

export default function CustomerEstimateReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [estimate, setEstimate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchEstimate(id);
    }
  }, [id]);

  const fetchEstimate = async (estimateId) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCustomerEstimate(estimateId);
      setEstimate(data);
    } catch (err) {
      console.error("Failed to load customer estimate:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Quotation not found. Please verify your link or contact PrintZ support."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", overflowY: "auto", backgroundColor: "#f8fafc", paddingBottom: "80px", boxSizing: "border-box" }}>
      {isLoading ? (
        <div style={{ padding: "100px 20px", textAlign: "center", color: "#64748b" }}>
          <Loader2 size={36} style={{ animation: "spin 1s linear infinite", margin: "0 auto 14px", color: "#047857" }} />
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
            Loading Quotation #{id}...
          </p>
          <span style={{ fontSize: "12px", color: "#64748b" }}>Connecting securely to PrintZ</span>
        </div>
      ) : error ? (
        <div style={{ maxWidth: "600px", margin: "60px auto", padding: "0 16px" }}>
          <div className="v3-warning-box" style={{ borderColor: "#f87171", backgroundColor: "#fef2f2", padding: "28px", borderRadius: "14px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
              <AlertCircle size={28} color="#dc2626" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: "16px", color: "#991b1b" }}>Quotation Link Invalid or Expired</strong>
                <p style={{ margin: "6px 0 16px 0", fontSize: "13px", color: "#b91c1c", lineHeight: "1.5" }}>
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/customer-register")}
                  className="v3-btn-secondary"
                  style={{ fontSize: "12px" }}
                >
                  <ArrowLeft size={14} /> Go to Customer Portal
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <CustomerEstimateReviewView
          estimate={estimate}
          onEstimateUpdated={(updated) => setEstimate(updated)}
        />
      )}
    </div>
  );
}
