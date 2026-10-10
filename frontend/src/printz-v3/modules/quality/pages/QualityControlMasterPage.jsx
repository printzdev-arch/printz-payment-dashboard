import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import QualityControlQueueView from "../components/QualityControlQueueView";
import QualityControlDetailView from "../components/QualityControlDetailView";
import ReprintRequestsView from "../components/ReprintRequestsView";
import { useAuth } from "../../../../context/AuthContext";
import "../styles/qualityV3.css";

export default function QualityControlMasterPage({
  branchName,
  branchId,
  currentUser
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { productionOrderId } = useParams();
  const { currentUser: authUser } = useAuth();

  const effectiveUser = authUser || currentUser || { name: "Lakshmi P", role: "qc_inspector" };
  const effectiveBranchName = effectiveUser?.branch || effectiveUser?.branchName || branchName || "Kothanur";
  const effectiveBranchId = effectiveUser?.branchId || branchId || "64f1a2b3c4d5e6f7a8b90001";

  const [activeTab, setActiveTab] = useState("queue"); // "queue" | "detail" | "reprints"
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/reprints")) {
      setActiveTab("reprints");
      setSelectedOrderId(null);
    } else if (productionOrderId || (path.includes("/quality-control/") && !path.includes("/queue"))) {
      const id = productionOrderId || path.split("/quality-control/").pop();
      if (id && id !== "queue" && id !== "reprints") {
        setSelectedOrderId(id);
        setActiveTab("detail");
      } else {
        setActiveTab("queue");
        setSelectedOrderId(null);
      }
    } else {
      setActiveTab("queue");
      setSelectedOrderId(null);
    }
  }, [location.pathname, productionOrderId]);

  const handleSelectOrderForInspection = (orderId) => {
    setSelectedOrderId(orderId);
    setActiveTab("detail");
    navigate(`/v3/quality-control/${orderId}`);
  };

  const handleBackToQueue = () => {
    setSelectedOrderId(null);
    setActiveTab("queue");
    navigate("/v3/quality-control/queue");
  };

  const handleNavigateToReprints = () => {
    setSelectedOrderId(null);
    setActiveTab("reprints");
    navigate("/v3/quality-control/reprints");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", padding: "16px 24px" }}>
      {activeTab === "detail" && selectedOrderId ? (
        <QualityControlDetailView
          productionOrderId={selectedOrderId}
          onBack={handleBackToQueue}
          onNavigateToReprints={handleNavigateToReprints}
          currentUser={effectiveUser}
          branchName={effectiveBranchName}
        />
      ) : activeTab === "reprints" ? (
        <ReprintRequestsView
          onNavigateToQcQueue={handleBackToQueue}
          branchName={effectiveBranchName}
          currentUser={effectiveUser}
        />
      ) : (
        <QualityControlQueueView
          onSelectOrderForInspection={handleSelectOrderForInspection}
          onNavigateToReprints={handleNavigateToReprints}
          branchName={effectiveBranchName}
          currentUser={effectiveUser}
        />
      )}
    </div>
  );
}

