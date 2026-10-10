import React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import JobCreationForm from "../components/JobCreationForm";
import { useAuth } from "../../../../context/AuthContext";
import "../../customer/styles/customerV3.css";
import "../styles/jobV3.css";

export default function CreateJobPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const customerIdParam = searchParams.get("customerId") || location.state?.customerId;
  const preloadedCustomer = location.state?.customer || null;

  const branchName = currentUser?.branch || currentUser?.branchName || localStorage.getItem("userBranchName") || "Banaswadii";
  const branchId = currentUser?.branchId || "489571a9af51836599708543";

  const handleJobCreated = (createdJob) => {
    navigate(`/v3/jobs/${createdJob.id || createdJob._id || createdJob.jobId || createdJob.jobNo}`);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="v3-job-page-wrapper">
      <JobCreationForm
        initialCustomerId={customerIdParam}
        initialCustomer={preloadedCustomer}
        branchName={branchName}
        branchId={branchId}
        onJobCreated={handleJobCreated}
        onCancel={handleCancel}
      />
    </div>
  );
}
