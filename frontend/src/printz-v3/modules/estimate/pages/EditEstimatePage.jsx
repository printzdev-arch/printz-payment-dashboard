import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "../../../../context/AuthContext";
import EstimateForm from "../components/EstimateForm";
import { getEstimateById } from "../api/estimateApi";
import "../../customer/styles/customerV3.css";
import "../../job/styles/jobV3.css";
import "../styles/estimateV3.css";

export default function EditEstimatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const [estimate, setEstimate] = useState(location.state?.estimate || null);
  const [isLoading, setIsLoading] = useState(!location.state?.estimate && !!id);
  const [error, setError] = useState(null);

  const branchName = currentUser?.branch || localStorage.getItem("userBranchName") || "Banaswadi";
  const branchId = currentUser?.branchId || localStorage.getItem("userBranchId") || "489571a9af51836599708543";

  useEffect(() => {
    if (id && !estimate) {
      setIsLoading(true);
      getEstimateById(id)
        .then((data) => setEstimate(data))
        .catch((err) => setError(err.response?.data?.message || err.message || "Failed to load estimate for editing."))
        .finally(() => setIsLoading(false));
    }
  }, [id, estimate]);

  const handleSaved = (savedEstimate) => {
    if (savedEstimate?.stage === "DESIGN_QUEUE" || savedEstimate?.currentStage === "DESIGN_QUEUE" || savedEstimate?.status === "READY" || savedEstimate?.isMarkReady) {
      navigate("/v3/design");
    } else {
      navigate(`/v3/estimates/${savedEstimate.id || savedEstimate._id || savedEstimate.estimateId || savedEstimate.estimateNo}`);
    }
  };

  return (
    <div className="v3-job-page-wrapper">
      {isLoading ? (
        <div style={{ padding: "80px", textAlign: "center", color: "#64748b" }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Loading estimate #{id}...</p>
        </div>
      ) : error ? (
        <div className="v3-estimate-container">
          <div className="v3-warning-box" style={{ borderColor: "#f87171", backgroundColor: "#fef2f2", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <AlertCircle size={24} color="#dc2626" />
              <div>
                <strong style={{ fontSize: "15px", color: "#991b1b" }}>Estimate Not Found</strong>
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
        <EstimateForm
          jobId={estimate.jobId}
          initialEstimate={estimate}
          branchName={branchName}
          branchId={branchId}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
