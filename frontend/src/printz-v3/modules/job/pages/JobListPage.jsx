import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import JobList from "../components/JobList";
import { useAuth } from "../../../../context/AuthContext";
import "../../customer/styles/customerV3.css";
import "../styles/jobV3.css";

export default function JobListPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const branchName = currentUser?.branch || localStorage.getItem("userBranchName") || "Banaswadi";

  return (
    <div className="v3-job-page-wrapper">
      <div className="v3-job-container">
        {/* Header Breadcrumb */}
        <div className="v3-job-header">
          <div className="v3-job-header-left">
            <div className="v3-breadcrumb">
              <span className="v3-breadcrumb-root">PrintZ V3</span>
              <span>/</span>
              <span>Job Management</span>
              <span>/</span>
              <span>Job Orders</span>
            </div>
            <div className="v3-job-title-row">
              <h1 className="v3-job-header-title">Print Job Orders</h1>
              <span className="v3-branch-pill">📍 {branchName}</span>
            </div>
          </div>
        </div>

        <JobList
          branchName={branchName}
          onAddNewJob={() => navigate("/v3/jobs/new")}
          onSelectJob={(job) => navigate(`/v3/jobs/${job.id || job._id || job.jobId || job.jobNo}`)}
        />
      </div>
    </div>
  );
}
