import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ProductionPlanningView from "../components/ProductionPlanningView";
import ProductionPlanningDetailView from "../components/ProductionPlanningDetailView";
import ProductionOrdersView from "../components/ProductionOrdersView";
import ProductionOrderDetailView from "../components/ProductionOrderDetailView";
import ProductionQueueView from "../components/ProductionQueueView";
import OperationExecutionView from "../components/OperationExecutionView";
import { getJobPlanningDetails, getProductionOrderById } from "../api/productionApi";
import { useAuth } from "../../../../context/AuthContext";
import "../styles/productionV3.css";

export default function ProductionMasterPage({
  branchName,
  branchId,
  currentUser
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { jobItemId, orderId, operationId } = useParams();
  const { currentUser: authUser } = useAuth();

  const effectiveUser = authUser || currentUser || { name: "Branch Manager", role: "manager" };
  const effectiveBranchName = effectiveUser?.branch || effectiveUser?.branchName || branchName || "Kothanur";
  const effectiveBranchId = effectiveUser?.branchId || branchId || "64f1a2b3c4d5e6f7a8b90001";

  const [activeTab, setActiveTab] = useState("planning"); // "planning" | "planningDetail" | "orders" | "orderDetail" | "queue" | "operationExec"
  const [selectedJobItem, setSelectedJobItem] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOpId, setSelectedOpId] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);


  useEffect(() => {
    const path = location.pathname;
    if (operationId || path.includes("/operations/")) {
      const id = operationId || path.split("/operations/").pop();
      if (id && id !== "operations") {
        setSelectedOpId(id);
        setActiveTab("operationExec");
      }
    } else if (path.includes("/queue")) {
      setActiveTab("queue");
      setSelectedOpId(null);
    } else if (jobItemId || path.includes("/planning/")) {
      const id = jobItemId || path.split("/planning/").pop();
      if (id && id !== "planning") {
        fetchJobItem(id);
      } else {
        setActiveTab("planning");
      }
    } else if (orderId || path.includes("/orders/")) {
      const id = orderId || path.split("/orders/").pop();
      if (id && id !== "orders") {
        fetchOrder(id);
      } else {
        setActiveTab("orders");
      }
    } else if (path.includes("/orders")) {
      setActiveTab("orders");
      setSelectedOrder(null);
    } else {
      setActiveTab("planning");
      setSelectedJobItem(null);
    }
  }, [location.pathname, jobItemId, orderId, operationId]);

  const fetchJobItem = async (id) => {
    setLoadingDetail(true);
    try {
      const item = await getJobPlanningDetails(id);
      setSelectedJobItem(item);
      setActiveTab("planningDetail");
    } catch (err) {
      console.error("Error fetching job item for planning:", err);
      setActiveTab("planning");
    } finally {
      setLoadingDetail(false);
    }
  };

  const fetchOrder = async (id) => {
    setLoadingDetail(true);
    try {
      const order = await getProductionOrderById(id);
      setSelectedOrder(order);
      setActiveTab("orderDetail");
    } catch (err) {
      console.error("Error fetching production order:", err);
      setActiveTab("orders");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSelectJobForPlanning = (item) => {
    setSelectedJobItem(item);
    setActiveTab("planningDetail");
    const itemId = item.jobId || item._id || item.jobItemId;
    navigate(`/v3/production/planning/${itemId}`);
  };

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setActiveTab("orderDetail");
    const ordId = order.productionOrderId || order.id || order.productionNo;
    navigate(`/v3/production/orders/${ordId}`);
  };

  const handleOrderCreated = (order) => {
    setSelectedOrder(order);
    setActiveTab("orderDetail");
    const ordId = order.productionOrderId || order.id || order.productionNo;
    navigate(`/v3/production/orders/${ordId}`);
  };

  const handleSelectOperation = (opId) => {
    setSelectedOpId(opId);
    setActiveTab("operationExec");
    navigate(`/v3/production/operations/${opId}`);
  };

  const handleBackToPlanning = () => {
    setSelectedJobItem(null);
    setActiveTab("planning");
    navigate("/v3/production/planning");
  };

  const handleBackToOrders = () => {
    setSelectedOrder(null);
    setActiveTab("orders");
    navigate("/v3/production/orders");
  };

  const handleBackToQueue = () => {
    setSelectedOpId(null);
    setActiveTab("queue");
    navigate("/v3/production/queue");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", padding: "16px 24px" }}>
      {loadingDetail ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
          Loading production details...
        </div>
      ) : activeTab === "operationExec" && selectedOpId ? (
        <OperationExecutionView
          operationId={selectedOpId}
          onBack={handleBackToQueue}
          onSelectNextOperation={(nextId) => handleSelectOperation(nextId)}
          currentUser={effectiveUser}
          branchName={effectiveBranchName}
        />
      ) : activeTab === "queue" ? (
        <ProductionQueueView
          onSelectOperation={handleSelectOperation}
          onNavigateToPlanning={handleBackToPlanning}
          branchName={effectiveBranchName}
          currentUser={effectiveUser}
        />
      ) : activeTab === "planningDetail" && selectedJobItem ? (
        <ProductionPlanningDetailView
          jobItem={selectedJobItem}
          onBack={handleBackToPlanning}
          onOrderCreated={handleOrderCreated}
          branchName={effectiveBranchName}
        />
      ) : activeTab === "orderDetail" && selectedOrder ? (
        <ProductionOrderDetailView
          productionOrder={selectedOrder}
          onBack={handleBackToOrders}
          onNavigateToPlanning={handleBackToPlanning}
          onSelectOperation={handleSelectOperation}
          onNavigateToQueue={handleBackToQueue}
          branchName={effectiveBranchName}
        />
      ) : activeTab === "orders" ? (
        <ProductionOrdersView
          onSelectOrder={handleSelectOrder}
          onNavigateToPlanning={handleBackToPlanning}
          branchName={effectiveBranchName}
        />
      ) : (
        <ProductionPlanningView
          onSelectJobForPlanning={handleSelectJobForPlanning}
          onNavigateToOrders={() => {
            setActiveTab("orders");
            navigate("/v3/production/orders");
          }}
          branchName={effectiveBranchName}
        />
      )}
    </div>
  );
}


