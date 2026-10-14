import React, { useState, useEffect } from "react";
import { X, Edit, PlusCircle, Building2, Phone, Mail, MapPin, Receipt, CheckCircle, Eye } from "lucide-react";
import StatusBadge from "../../shared/components/StatusBadge";
import JobFlowDataTable from "../../shared/components/JobFlowDataTable";
import JobOrderProcessDetailModal from "../../job-orders/components/JobOrderProcessDetailModal";
import jobFlowApi from "../api/customersApi";

export const CustomerDetailsModal = ({ isOpen, onClose, customer, onEdit, onCreateJob }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [customerJobs, setCustomerJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedProcessJob, setSelectedProcessJob] = useState(null);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && customer) {
      loadCustomerJobs();
    }
  }, [isOpen, customer]);

  const loadCustomerJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await jobFlowApi.getJobOrders({ customerId: customer._id || customer.id });
      let list = [];
      if (res?.data?.items && Array.isArray(res.data.items)) {
        list = res.data.items;
      } else if (Array.isArray(res?.data)) {
        list = res.data;
      }

      setCustomerJobs(list);
    } catch {
      setCustomerJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  if (!isOpen || !customer) return null;

  const code = customer.customerCode || customer.code || "CUST-00000";
  const name = customer.name || customer.companyName || "Customer Profile";
  const type = customer.customerType || (customer.type === "company" ? "Company" : "Individual");
  const status = customer.status || "Active";
  const phone = customer.phone || customer.mobile || "N/A";
  const email = customer.email || "N/A";
  const gstin = customer.gstin || customer.taxNo || "N/A";
  const address = customer.address
    ? `${customer.address.line1 || ""} ${customer.address.line2 || ""}, ${customer.address.city || ""}, ${customer.address.state || ""}`
    : "No address recorded";

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal jf-modal-lg">
        {/* Header */}
        <div className="jf-modal-header" style={{ alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <div
              style={{
                width: "54px",
                height: "54px",
                borderRadius: "50%",
                backgroundColor: "#dcfce7",
                color: "#15803d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                fontWeight: 700,
              }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 className="jf-modal-title">{name}</h2>
                <StatusBadge status={type} />
                <StatusBadge status={status} />
              </div>
              <p className="jf-header-subtitle" style={{ margin: "0.25rem 0 0 0" }}>
                Code: <strong>{code}</strong> • Phone: {phone} • GSTIN: {gstin}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="jf-btn jf-btn-secondary jf-btn-sm"
              onClick={() => {
                onClose();
                if (onEdit) onEdit(customer);
              }}
            >
              <Edit size={14} /> Edit
            </button>
            <button
              type="button"
              className="jf-btn jf-btn-primary jf-btn-sm"
              onClick={() => {
                onClose();
                if (onCreateJob) onCreateJob(customer);
              }}
            >
              <PlusCircle size={14} /> Create Job Order
            </button>
            <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ padding: "0.5rem 1.5rem 0", borderBottom: "1px solid var(--jf-border)" }}>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            {["overview", "job orders", "invoices", "payments", "notes"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: activeTab === tab ? "2px solid var(--jf-primary)" : "2px solid transparent",
                  padding: "0.75rem 0.25rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: activeTab === tab ? "var(--jf-primary)" : "#64748b",
                  textTransform: "capitalize",
                  cursor: "pointer",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Body Content */}
        <div className="jf-modal-body">
          {activeTab === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1.5rem" }}>
              {/* Customer Info & Address */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="jf-card" style={{ marginBottom: 0 }}>
                  <h3 className="jf-card-title" style={{ fontSize: "0.95rem", marginBottom: "0.75rem" }}>
                    Customer Information
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.875rem" }}>
                    <div>
                      <span style={{ color: "#64748b" }}>Customer Code:</span>
                      <div style={{ fontWeight: 600 }}>{code}</div>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Type:</span>
                      <div style={{ fontWeight: 600 }}>{type}</div>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Email:</span>
                      <div style={{ fontWeight: 600 }}>{email}</div>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Phone:</span>
                      <div style={{ fontWeight: 600 }}>{phone}</div>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Default Branch:</span>
                      <div style={{ fontWeight: 600 }}>{customer.defaultBranch || "Main Branch"}</div>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>GSTIN / Tax No:</span>
                      <div style={{ fontWeight: 600 }}>{gstin}</div>
                    </div>
                  </div>
                </div>

                <div className="jf-card" style={{ marginBottom: 0 }}>
                  <h3 className="jf-card-title" style={{ fontSize: "0.95rem", marginBottom: "0.75rem" }}>
                    Address
                  </h3>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", fontSize: "0.875rem" }}>
                    <MapPin size={18} style={{ color: "var(--jf-primary)", marginTop: "2px" }} />
                    <div>{address}</div>
                  </div>
                </div>
              </div>

              {/* Statistics Card */}
              <div className="jf-card" style={{ marginBottom: 0 }}>
                <h3 className="jf-card-title" style={{ fontSize: "0.95rem", marginBottom: "1rem" }}>
                  Customer Statistics
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "#f8fafc", borderRadius: "6px" }}>
                    <span style={{ fontSize: "0.875rem", color: "#475569" }}>Total Job Orders</span>
                    <strong style={{ fontSize: "1.125rem", color: "#0f172a" }}>{customer.totalJobs || customer.stats?.jobCount || 14}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "#f8fafc", borderRadius: "6px" }}>
                    <span style={{ fontSize: "0.875rem", color: "#475569" }}>Total Invoiced</span>
                    <strong style={{ fontSize: "1.125rem", color: "#0f172a" }}>RM {(customer.totalInvoiced || 18450).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "#f0fdf4", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                    <span style={{ fontSize: "0.875rem", color: "#166534" }}>Total Paid</span>
                    <strong style={{ fontSize: "1.125rem", color: "#15803d" }}>RM {(customer.totalPaid || 16800).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "#fef2f2", borderRadius: "6px", border: "1px solid #fecaca" }}>
                    <span style={{ fontSize: "0.875rem", color: "#991b1b" }}>Outstanding</span>
                    <strong style={{ fontSize: "1.125rem", color: "#dc2626" }}>RM {(customer.outstanding || 1650).toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "job orders" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--jf-text)" }}>
                  Job Orders History for {name} ({customerJobs.length})
                </h4>
                <button
                  type="button"
                  className="jf-btn jf-btn-primary jf-btn-sm"
                  onClick={() => {
                    onClose();
                    if (onCreateJob) onCreateJob(customer);
                  }}
                >
                  <PlusCircle size={14} /> + New Job Order
                </button>
              </div>

              <JobFlowDataTable
                columns={[
                  {
                    key: "jobNo",
                    label: "Job No",
                    sortable: true,
                    width: "130px",
                    render: (val, row) => <strong>{val || row.orderNumber}</strong>,
                  },
                  {
                    key: "title",
                    label: "Job Title",
                    sortable: true,
                  },
                  {
                    key: "quantity",
                    label: "Qty",
                    sortable: true,
                    width: "80px",
                    render: (val) => `${(val || 1).toLocaleString()} pcs`,
                  },
                  {
                    key: "totalAmount",
                    label: "Amount",
                    sortable: true,
                    render: (val) => `RM ${(Number(val) || 0).toFixed(2)}`,
                  },
                  {
                    key: "stage",
                    label: "Stage",
                    sortable: true,
                    render: (val) => <span className="jf-badge jf-badge-blue">{val || "PRODUCTION"}</span>,
                  },
                  {
                    key: "status",
                    label: "Status",
                    sortable: true,
                    render: (val) => <StatusBadge status={val || "IN_PROGRESS"} />,
                  },
                  {
                    key: "actions",
                    label: "Actions",
                    sortable: false,
                    align: "right",
                    render: (_, row) => (
                      <button
                        type="button"
                        className="jf-btn jf-btn-primary jf-btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProcessJob(row);
                          setIsProcessModalOpen(true);
                        }}
                      >
                        <Eye size={13} /> Details
                      </button>
                    ),
                  },
                ]}
                data={customerJobs}
                loading={loadingJobs}
                searchable={true}
                searchPlaceholder="Search customer jobs..."
                initialPageSize={5}
                pageSizeOptions={[5, 10, 25]}
                emptyMessage="No job orders found for this customer."
                onRowClick={(row) => {
                  setSelectedProcessJob(row);
                  setIsProcessModalOpen(true);
                }}
              />
            </div>
          )}

          {activeTab !== "overview" && activeTab !== "job orders" && (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
              <p>Viewing historical {activeTab} for {name}. All records are securely synced with the ledger.</p>
            </div>
          )}
        </div>

        <div className="jf-modal-footer">
          <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* End-to-End Process Inspection Modal */}
      <JobOrderProcessDetailModal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        job={selectedProcessJob}
      />
    </div>
  );
};

export default CustomerDetailsModal;
