import React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../../context/AuthContext";
import EstimateForm from "../components/EstimateForm";
import "../../customer/styles/customerV3.css";
import "../../job/styles/jobV3.css";
import "../styles/estimateV3.css";

export default function CreateEstimatePage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const jobId = searchParams.get("jobId") || location.state?.jobId || "job_2026_00045";
  const initialJob = location.state?.job || null;

  const branchName = currentUser?.branch || localStorage.getItem("userBranchName") || "Banaswadi";
  const branchId = currentUser?.branchId || "64f1a2b3c4d5e6f7a8b90001";

  const handleSaved = (savedEstimate) => {
    navigate(`/v3/estimates/${savedEstimate.id || savedEstimate._id || savedEstimate.estimateId || savedEstimate.estimateNo}`);
  };

  return (
    <div className="v3-job-page-wrapper">
      <EstimateForm
        jobId={jobId}
        initialJob={initialJob}
        branchName={branchName}
        branchId={branchId}
        onSaved={handleSaved}
      />
    </div>
  );
}
