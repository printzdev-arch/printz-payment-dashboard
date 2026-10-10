import React, { useState, useEffect } from "react";
import {
  Printer,
  Search,
  Filter,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Eye,
  ShieldCheck
} from "lucide-react";
import {
  getReprintRequests,
  approveReprintRequest,
  rejectReprintRequest
} from "../api/qualityApi";
import ReprintDetailModal from "./ReprintDetailModal";

export default function ReprintRequestsView({
  onNavigateToQcQueue,
  branchName = "Kothanur",
  currentUser = { name: "Arun Kumar", role: "manager" }
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await getReprintRequests({
        status: statusFilter !== "ALL" ? statusFilter : undefined
      });
      setRequests(res || []);
    } catch (err) {
      console.error("Failed to load reprint requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleApprove = async (id) => {
    try {
      await approveReprintRequest(id);
      fetchRequests();
    } catch (err) {
      console.error("Failed to approve reprint:", err);
    }
  };

  const handleReject = async (id, payload) => {
    try {
      await rejectReprintRequest(id, payload);
      fetchRequests();
    } catch (err) {
      console.error("Failed to reject reprint:", err);
    }
  };

  const filtered = requests.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.reprintNo && r.reprintNo.toLowerCase().includes(q)) ||
      (r.productionNo && r.productionNo.toLowerCase().includes(q)) ||
      (r.jobNo && r.jobNo.toLowerCase().includes(q)) ||
      (r.customerName && r.customerName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="qc-container">
      {/* Header Bar */}
      <div className="qc-header-bar">
        <div className="qc-title-group">
          <div className="qc-breadcrumb">
            <span className="qc-breadcrumb-link" onClick={onNavigateToQcQueue}>
              Quality Control
            </span>
            <span>/</span>
            <span style={{ color: "#0f172a", fontWeight: 700 }}>Reprint & Rework Requests</span>
          </div>
          <h1 className="qc-title">
            <Printer size={22} color="#c2410c" />
            Reprint & Corrective Production Requests
          </h1>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button type="button" onClick={onNavigateToQcQueue} className="qc-btn-secondary">
            <ArrowLeft size={14} /> Back to QC Queue
          </button>
          <button type="button" onClick={fetchRequests} className="qc-btn-secondary">
            <RefreshCw size={13} className={loading ? "prod-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="qc-card" style={{ padding: "14px 18px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 300px", maxWidth: "450px" }}>
            <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "#94a3b8" }} />
            <input
              type="text"
              className="prod-form-input"
              style={{ paddingLeft: "32px", fontSize: "12px" }}
              placeholder="Search by Request #, Production #, Job #, Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>Status:</span>
            <select
              className="prod-form-input"
              style={{ width: "auto", padding: "5px 10px", fontSize: "12px" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="REQUESTED">Requested (Pending Approval)</option>
              <option value="APPROVED">Approved (In Production)</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="qc-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="prod-table" style={{ width: "100%", margin: 0 }}>
          <thead>
            <tr>
              <th>Request No</th>
              <th>Production No</th>
              <th>Job No</th>
              <th>Customer</th>
              <th style={{ textAlign: "center" }}>Reprint Qty</th>
              <th>Source Stage</th>
              <th>Restart From</th>
              <th>Requested By</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th style={{ textAlign: "right", paddingRight: "20px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                  <RefreshCw size={24} className="prod-spin" style={{ margin: "0 auto 10px auto", display: "block", color: "#c2410c" }} />
                  Loading reprint requests...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                  <Printer size={32} style={{ margin: "0 auto 10px auto", display: "block", opacity: 0.3 }} />
                  No reprint or rework requests found.
                </td>
              </tr>
            ) : (
              filtered.map((rp) => (
                <tr key={rp.id || rp.reprintNo}>
                  <td>
                    <strong style={{ color: "#c2410c", fontSize: "12.5px" }}>{rp.reprintNo}</strong>
                  </td>
                  <td style={{ fontWeight: 600, color: "#0f172a" }}>{rp.productionNo}</td>
                  <td style={{ fontSize: "12px", color: "#475569" }}>{rp.jobNo}</td>
                  <td>
                    <strong style={{ color: "#0f172a" }}>{rp.customerName}</strong>
                  </td>
                  <td style={{ textAlign: "center", fontWeight: 700, color: "#dc2626" }}>
                    {(rp.quantity || 0).toLocaleString()} pcs
                  </td>
                  <td style={{ fontSize: "11.5px", color: "#475569" }}>{rp.sourceStage || "PACKING"}</td>
                  <td style={{ fontSize: "11.5px", color: "#047857", fontWeight: 600 }}>
                    {rp.restartFromOperationName || rp.restartFromOperationCode || "PRINTING"}
                  </td>
                  <td style={{ fontSize: "11.5px", color: "#475569" }}>{rp.requestedBy}</td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`qc-status-pill ${rp.status === "APPROVED" ? "passed" : rp.status === "REJECTED" ? "rework" : "pending"}`}>
                      {rp.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", paddingRight: "16px" }}>
                    <button
                      type="button"
                      className="qc-btn-secondary"
                      style={{ padding: "4px 10px", fontSize: "11.5px" }}
                      onClick={() => setSelectedRequest(rp)}
                    >
                      <Eye size={12} /> {rp.status === "REQUESTED" ? "Review & Authorize" : "View Details"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail & Authorization Modal */}
      {selectedRequest && (
        <ReprintDetailModal
          isOpen={Boolean(selectedRequest)}
          onClose={() => setSelectedRequest(null)}
          reprintRequest={selectedRequest}
          onApprove={handleApprove}
          onReject={handleReject}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
