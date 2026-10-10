import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import JobDetailsView from "../components/JobDetailsView";
import { getJobById } from "../api/jobApi";
import "../../customer/styles/customerV3.css";
import "../styles/jobV3.css";

export default function JobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchJobDetails(id);
    }
  }, [id]);

  const fetchJobDetails = async (jobId) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getJobById(jobId);
      setJob(data);
    } catch (err) {
      console.error("Failed to load job details:", err);
      setError(err.response?.data?.message || err.message || "Failed to load job details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="v3-job-page-wrapper">
      {isLoading ? (
        <div style={{ padding: "80px", textAlign: "center", color: "#64748b" }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Loading Job Order #{id}...</p>
        </div>
      ) : error ? (
        <div className="v3-job-container">
          <div className="v3-warning-box" style={{ borderColor: "#f87171", backgroundColor: "#fef2f2", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <AlertCircle size={24} color="#dc2626" />
              <div>
                <strong style={{ fontSize: "15px", color: "#991b1b" }}>Job Order Not Found</strong>
                <p style={{ margin: "4px 0 12px 0", fontSize: "13px", color: "#b91c1c" }}>{error}</p>
                <button
                  type="button"
                  onClick={() => navigate("/v3/jobs")}
                  className="v3-btn-secondary"
                  style={{ fontSize: "12px" }}
                >
                  <ArrowLeft size={14} /> Back to Job Orders
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <JobDetailsView
          job={job}
          onBack={() => navigate("/v3/jobs")}
        />
      )}
    </div>
  );
}
