import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../context/AuthContext";
import EstimateList from "../components/EstimateList";
import "../../customer/styles/customerV3.css";
import "../../job/styles/jobV3.css";
import "../styles/estimateV3.css";

export default function EstimateListPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const branchName = currentUser?.branch || localStorage.getItem("userBranchName") || "Banaswadi";

  return (
    <div className="v3-job-page-wrapper">
      <div className="v3-estimate-container">
        {/* Top Header */}
        <div className="v3-estimate-header">
          <div>
            <div className="v3-breadcrumb">
              <span className="v3-breadcrumb-root">PrintZ V3</span>
              <span>/</span>
              <span>Commercial Quotations</span>
              <span>/</span>
              <span>Estimates Directory</span>
            </div>
            <div className="v3-estimate-title-row">
              <h1 className="v3-estimate-header-title">Quotations & Cost Estimates</h1>
              <span className="v3-branch-pill">📍 {branchName}</span>
            </div>
          </div>
        </div>

        <EstimateList
          branchName={branchName}
          onAddNewEstimate={() => navigate("/v3/jobs")}
          onSelectEstimate={(est) =>
            navigate(`/v3/estimates/${est.id || est._id || est.estimateId || est.estimateNo}`)
          }
        />
      </div>
    </div>
  );
}
