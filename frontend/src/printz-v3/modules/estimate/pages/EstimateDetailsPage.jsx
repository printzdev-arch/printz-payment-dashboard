import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import EstimateDetailsView from "../components/EstimateDetailsView";
import { getEstimateById } from "../api/estimateApi";
import "../../customer/styles/customerV3.css";
import "../../job/styles/jobV3.css";
import "../styles/estimateV3.css";

export default function EstimateDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [estimate, setEstimate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchEstimateDetails(id);
    }
  }, [id]);

  const fetchEstimateDetails = async (estimateId) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getEstimateById(estimateId);
      setEstimate(data);
    } catch (err) {
      console.error("Failed to load estimate details:", err);
      setError(err.response?.data?.message || err.message || "Failed to load quotation details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="v3-job-page-wrapper">
      {isLoading ? (
        <div style={{ padding: "80px", textAlign: "center", color: "#64748b" }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Loading Quotation #{id}...</p>
        </div>
      ) : error ? (
        <div className="v3-estimate-container">
          <div className="v3-warning-box" style={{ borderColor: "#f87171", backgroundColor: "#fef2f2", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <AlertCircle size={24} color="#dc2626" />
              <div>
                <strong style={{ fontSize: "15px", color: "#991b1b" }}>Quotation Not Found</strong>
                <p style={{ margin: "4px 0 12px 0", fontSize: "13px", color: "#b91c1c" }}>{error}</p>
                <button
                  type="button"
                  onClick={() => navigate("/v3/estimates")}
                  className="v3-btn-secondary"
                  style={{ fontSize: "12px" }}
                >
                  <ArrowLeft size={14} /> Back to Estimates
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EstimateDetailsView
          estimate={estimate}
          onBack={() => navigate("/v3/estimates")}
          onUpdate={(updated) => setEstimate(updated)}
        />
      )}
    </div>
  );
}
