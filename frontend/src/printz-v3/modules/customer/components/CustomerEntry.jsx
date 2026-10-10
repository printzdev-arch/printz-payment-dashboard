import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlus,
  QrCode,
  Users,
  Search,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import CustomerSearchPanel from "./CustomerSearchPanel";
import { useAuth } from "../../../../context/AuthContext";
import WalkInRegistrationForm from "./WalkInRegistrationForm";
import QrRegistrationModal from "./QrRegistrationModal";
import CustomerDetailsView from "./CustomerDetailsView";
import CustomerList from "./CustomerList";
import "../styles/customerV3.css";

export default function CustomerEntry({
  branchName,
  branchId,
  branchCode,
  onCustomerSelectedForJob
}) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const effectiveBranchName = currentUser?.branch || currentUser?.branchName || branchName || "Banaswadi";
  const effectiveBranchId = currentUser?.branchId || branchId || "64f1a2b3c4d5e6f7a8b90001";
  const effectiveBranchCode = currentUser?.branchCode || branchCode || "BR001";

  const [activeTab, setActiveTab] = useState("walkin");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [createdSuccessCustomer, setCreatedSuccessCustomer] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);


  const [walkinPrefill, setWalkinPrefill] = useState(null);
  const [activeMobileQuery, setActiveMobileQuery] = useState("");

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCreatedSuccessCustomer(null);
  };

  const handleCustomerCreated = (newCustomer) => {
    setCreatedSuccessCustomer(newCustomer);
    setSelectedCustomer(newCustomer);
    setWalkinPrefill(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleClearSelection = () => {
    setSelectedCustomer(null);
    setCreatedSuccessCustomer(null);
  };

  const handleProceedToJob = (customer) => {
    if (onCustomerSelectedForJob) {
      onCustomerSelectedForJob(customer);
    } else {
      const cusId = customer._id || customer.id || customer.customerId;
      const url = cusId && /^[0-9a-fA-F]{24}$/.test(String(cusId))
        ? `/v3/jobs/new?customerId=${cusId}`
        : `/v3/jobs/new`;
      navigate(url, { state: { customer } });
    }
  };

  return (
    <div className="v3-customer-container">
      {/* Top Header & Tab Navigation */}
      <div className="v3-header-row">
        <div>
          <div className="v3-breadcrumb">
            <span className="v3-breadcrumb-root">PrintZ V3</span>
            <span>/</span>
            <span>Customer Desk</span>
            <span>/</span>
            <span>Registration & Directory</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
            <h1 className="v3-page-title" style={{ margin: 0 }}>Customer Desk</h1>
            <span className="v3-branch-pill">📍 {effectiveBranchName}</span>
          </div>
        </div>

        {/* Tab Switcher (Walk-in & QR Code only) */}
        <div className="v3-tab-nav">
          <button
            type="button"
            onClick={() => {
              setActiveTab("walkin");
              setSelectedCustomer(null);
            }}
            className={`v3-tab-btn ${activeTab === "walkin" && !selectedCustomer ? "active" : ""}`}
          >
            <UserPlus size={15} />
            Walk-in Customer
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("qr");
              setSelectedCustomer(null);
            }}
            className={`v3-tab-btn ${activeTab === "qr" && !selectedCustomer ? "active" : ""}`}
          >
            <QrCode size={15} />
            Mobile / QR Code
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {createdSuccessCustomer && (
        <div className="v3-success-box">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "#047857", color: "#ffffff", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <strong style={{ fontSize: "13px", color: "#065f46", display: "block" }}>
                Customer Created Successfully!
              </strong>
              <span style={{ fontSize: "12px", color: "#047857" }}>
                <strong>{createdSuccessCustomer.name}</strong> •{" "}
                <span style={{ fontFamily: "monospace" }}>{createdSuccessCustomer.customerCode}</span> •{" "}
                {createdSuccessCustomer.mobile}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleProceedToJob(createdSuccessCustomer)}
            className="v3-btn-primary"
            style={{ fontSize: "12px", padding: "8px 16px" }}
          >
            Continue to Job Order
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Dynamic Views */}
      {selectedCustomer ? (
        <CustomerDetailsView
          customer={selectedCustomer}
          onProceedToJob={handleProceedToJob}
          onClose={handleClearSelection}
          onEdit={(cus) => alert(`Editing profile for ${cus.name}`)}
        />
      ) : activeTab === "walkin" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Side-by-Side 2-Column Layout (Left Search + Right Walk-in Form) */}
          <div className="v3-customer-grid-split">
            {/* Left Column: Search Existing Customers Panel */}
            <CustomerSearchPanel
              branchName={effectiveBranchName}
              onSelectCustomer={handleSelectCustomer}
              activeMobileQuery={activeMobileQuery}
            />

            {/* Right Column: Walk-in Registration Form */}
            <WalkInRegistrationForm
              branchName={effectiveBranchName}
              branchId={effectiveBranchId}
              initialValues={walkinPrefill}
              onCustomerCreated={handleCustomerCreated}
              onSelectExistingCustomer={handleSelectCustomer}
              onMobileChange={(mobile) => setActiveMobileQuery(mobile)}
            />
          </div>

          {/* Customer Directory Table Section below the fields */}
          <div>
            <CustomerList
              branchName={effectiveBranchName}
              onSelectCustomer={handleSelectCustomer}
              onAddNewCustomer={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>
      ) : (
        <QrRegistrationModal
          branchCode={effectiveBranchCode}
          branchName={effectiveBranchName}
        />
      )}

    </div>
  );
}
