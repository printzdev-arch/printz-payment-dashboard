import React, { useState, useEffect } from "react";
import api from "../../services/api";
import "../../styles/printzTheme.css";
import "../../styles/addAssets.css";
import { usePopup } from "../../hooks/usePopup";
import Popup from "../common/Popup.jsx";
import Pagination from "../common/Pagination.jsx";
import BranchSelect from "../common/BranchSelect.jsx";
import CalendarSelect from "../common/CalendarSelect.jsx";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Calendar,
  Building2,
  Filter,
  Check,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Clock,
  User,
  ShieldAlert,
  Search,
} from "lucide-react";

const PastDateRequests = () => {
  const { popup, showSuccess, showError } = usePopup();
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [branches, setBranches] = useState([]);

  // State for Allow Past Date dialog
  const [showAllowDialog, setShowAllowDialog] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]); // array of Date objects (local)

  const [itemsPerPage, setItemsPerPage] = useState(20);

  const fetchBranches = async () => {
    try {
      const res = await api.get("/branches");
      const records = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      const branchNames = records
        .map((b) => (typeof b === "string" ? b : b.name || b.code))
        .filter(Boolean);
      setBranches((prev) => {
        const set = new Set([...prev, ...branchNames]);
        set.delete("All Branches");
        set.delete("all branches");
        set.delete("all");
        return Array.from(set).sort((a, b) => a.localeCompare(b));
      });
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get("/past-date-requests");
      const records = res.data?.data || (Array.isArray(res.data) ? res.data : []);

      const requestData = records.map((doc1) => {
        const request = { id: doc1.id || doc1._id, ...doc1 };

        if (!request.requestedByName) {
          request.requestedByName = request.requestedBy || "Unknown";
        }

        const bName = doc1.requestedBranch || doc1.branchName || (doc1.branchId && typeof doc1.branchId === "object" ? doc1.branchId.name : "") || "";
        request.requestedBranch = bName;

        if (
          request.requestedDate &&
          typeof request.requestedDate === "string"
        ) {
          const parts = request.requestedDate.split(" ");
          const dateParts = parts[0] ? parts[0].split("-") : [];
          const timeParts = parts[1] ? parts[1].split(":") : [];
          if (dateParts.length === 3) {
            request.sortableDate = new Date(
              Number.parseInt(dateParts[0]),
              Number.parseInt(dateParts[1]) - 1,
              Number.parseInt(dateParts[2]),
              timeParts[0] ? Number.parseInt(timeParts[0]) : 0,
              timeParts[1] ? Number.parseInt(timeParts[1]) : 0,
              timeParts[2] ? Number.parseInt(timeParts[2]) : 0
            );
          } else {
            request.sortableDate = new Date(0);
          }
        } else {
          request.sortableDate = new Date(0);
        }

        return request;
      });

      const sortedData = requestData.sort(
        (a, b) => b.sortableDate - a.sortableDate
      );
      setRequests(sortedData);
      setFilteredRequests(sortedData);

      const uniqueBranches = [
        ...new Set(sortedData.map((req) => req.requestedBranch)),
      ].filter(
        (b) => b && b.toLowerCase() !== "all branches" && b.toLowerCase() !== "all"
      );
      setBranches((prev) => {
        const set = new Set([...prev, ...uniqueBranches]);
        return Array.from(set).sort((a, b) => a.localeCompare(b));
      });

      setLoading(false);
    } catch (error) {
      console.error("Error fetching requests:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchBranches();
  }, []);

  useEffect(() => {
    let filtered = requests;

    if (branchFilter) {
      filtered = filtered.filter(
        (request) => request.requestedBranch === branchFilter
      );
    }

    if (statusFilter) {
      const status = statusFilter === "Pending" ? "" : statusFilter;
      filtered = filtered.filter(
        (request) => (request.status || "Pending") === (status || "Pending")
      );
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((request) => {
        const requestedByMatch = (request.requestedBy || "")
          .toLowerCase()
          .includes(q);
        const nameMatch = (request.requestedByName || "")
          .toLowerCase()
          .includes(q);
        const branchMatch = (request.requestedBranch || "")
          .toLowerCase()
          .includes(q);
        const dateMatch = (request.requestedDate || "")
          .toLowerCase()
          .includes(q);
        const statusMatch = (request.status || "Pending")
          .toLowerCase()
          .includes(q);
        const typeMatch = (request.type || "Daily Readings")
          .toLowerCase()
          .includes(q);
        return (
          requestedByMatch ||
          nameMatch ||
          branchMatch ||
          dateMatch ||
          statusMatch ||
          typeMatch
        );
      });
    }

    setFilteredRequests(filtered);
    setCurrentPage(1);
  }, [branchFilter, statusFilter, searchQuery, requests]);

  const handleApprove = async (id) => {
    try {
      await api.put(`/past-date-requests/${id}`, { status: "Approved" });
      showSuccess("Request approved successfully.");
      fetchRequests();
    } catch (error) {
      console.error("Error approving request:", error);
      showError("Failed to approve the request.");
    }
  };

  const handleReject = async (id) => {
    try {
      await api.put(`/past-date-requests/${id}`, { status: "Rejected" });
      showSuccess("Request rejected successfully.");
      fetchRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      showError("Failed to reject the request.");
    }
  };

  // Helpers for dialog
  const normalizeToLocalMidnight = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const formatYYYYMMDD = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  const openAllowDialog = () => {
    setSelectedDates([]);
    setShowAllowDialog(true);
  };
  const closeAllowDialog = () => setShowAllowDialog(false);

  const handleCalendarChange = (date) => {
    if (!date) return;
    const local = normalizeToLocalMidnight(date);
    setSelectedDates((prev) => {
      const exists = prev.some((d) => isSameDay(d, local));
      if (exists) {
        return prev.filter((d) => !isSameDay(d, local));
      }
      return [...prev, local];
    });
  };

  const handleAllowSelectedDates = async () => {
    if (selectedDates.length === 0) return;
    try {
      const storedUser = localStorage.getItem("user");
      const user = storedUser ? JSON.parse(storedUser) : null;
      const requestedBy = user ? user.name || user.email : "Admin";
      const requestedBranch = branchFilter || "all branches";

      await Promise.all(
        selectedDates.map((d) =>
          api.post("/past-date-requests", {
            requestedBy,
            requestedDate: `${formatYYYYMMDD(d)} 00:00:00`,
            requestedBranch,
            status: "Approved",
            type: "dailyReadings",
          })
        )
      );

      toast.success(
        `Allowed ${selectedDates.length} date${
          selectedDates.length > 1 ? "s" : ""
        } for ${requestedBranch}.`
      );
      setShowAllowDialog(false);
      setSelectedDates([]);
      fetchRequests();
    } catch (error) {
      console.error("Error allowing past dates:", error);
      toast.error("Failed to allow selected dates.");
    }
  };

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setBranchFilter("");
    setStatusFilter("");
    setSearchQuery("");
  };

  const getPaginationItems = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  return (
    <div className="add-assets-page-container">
      <ToastContainer />
      <Popup {...popup} />

      {/* Header Banner - Clean emerald design, no illustration */}
      <div
        className="printz-header-banner-full"
        style={{
          width: "100%",
          background:
            "linear-gradient(90deg, #E8FAF2 0%, #F0FFF9 50%, #E8FAF2 100%)",
          border: "1px solid #dcfce7",
          borderRadius: "16px",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          boxShadow: "0 2px 10px rgba(4, 120, 87, 0.04)",
          boxSizing: "border-box",
          flexWrap: "wrap",
        }}
      >
        <div className="printz-header-title-area" style={{ flexShrink: 0 }}>
          <h1
            style={{
              margin: "0 0 4px 0",
              fontSize: "26px",
              fontWeight: 700,
              color: "#111827",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            Past Date{" "}
            <span className="highlight" style={{ color: "#059669" }}>
              Requests
            </span>
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            Review branch reading requests for past dates or grant date permissions.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <button
            type="button"
            onClick={openAllowDialog}
            className="printz-btn-primary"
            style={{
              padding: "9px 18px",
              fontSize: "13.5px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              borderRadius: "10px",
              background: "#059669",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
            }}
          >
            <Plus size={15} />
            <span>Allow Past Date</span>
          </button>
        </div>
      </div>

      {/* Main Card: Filters & Requests Table */}
      <div className="add-assets-card">
        <div className="add-assets-card-header">
          <div className="add-assets-card-header-left">
            <div className="add-assets-card-icon">
              <Calendar size={18} color="#059669" />
            </div>
            <div>
              <h3 className="add-assets-card-title" style={{ fontSize: "18px", fontWeight: 700 }}>
                Requests Directory
              </h3>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12.5px", color: "#64748b", fontWeight: 500 }}>
              Showing {filteredRequests.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredRequests.length)} of {filteredRequests.length} requests
            </span>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div
          style={{
            padding: "18px 22px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Filter size={15} color="#059669" />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
              Filters:
            </span>
          </div>

          {/* Branch Filter */}
          <div style={{ minWidth: "190px" }}>
            <BranchSelect
              id="branch-filter"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              branches={branches}
              placeholder="All Branches"
              allowAll={true}
              allOptionLabel="All Branches"
              triggerStyle={{ height: "38px", fontSize: "13px" }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: "160px" }}>
            <div className="add-assets-input-wrap" style={{ height: "38px" }}>
              <Clock size={15} className="add-assets-input-icon" />
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="add-assets-select"
                style={{ fontSize: "13px" }}
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Search Filter */}
          <div style={{ minWidth: "240px", flex: "1 1 260px", maxWidth: "380px" }}>
            <div className="add-assets-input-wrap" style={{ height: "38px", position: "relative" }}>
              <Search size={15} color="#059669" className="add-assets-input-icon" />
              <input
                type="text"
                placeholder="Search user, branch, date, type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="add-assets-input"
                style={{ fontSize: "13px", paddingRight: searchQuery ? "32px" : "12px" }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "none",
                    background: "#e2e8f0",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#475569",
                    padding: 0,
                  }}
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {(branchFilter || statusFilter || searchQuery) && (
            <button
              type="button"
              onClick={clearFilters}
              className="add-assets-btn-secondary"
              style={{ height: "38px", padding: "0 14px", fontSize: "12.5px" }}
            >
              <RotateCcw size={13} />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Requests Table */}
        <div>
          {loading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px 20px",
                gap: "10px",
                color: "#64748b",
              }}
            >
              <div className="add-assets-spinner"></div>
              <p style={{ margin: 0, fontSize: "13px" }}>Loading past date requests...</p>
            </div>
          ) : currentRequests.length === 0 ? (
            <div className="add-assets-empty-state">
              <Calendar size={38} color="#cbd5e1" />
              <h4>No requests found</h4>
              <p>No past date requests match the current filters or search query.</p>
              {(branchFilter || statusFilter || searchQuery) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="add-assets-btn-secondary"
                  style={{ marginTop: "12px" }}
                >
                  <RotateCcw size={14} /> Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="add-assets-table-wrap" style={{ overflowX: "auto" }}>
                <table className="add-assets-table balance-directory-table" style={{ width: "100%", tableLayout: "auto" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "45px", textAlign: "center", whiteSpace: "nowrap" }}>S.No</th>
                      <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>Requested By</th>
                      <th style={{ width: "110px", textAlign: "center", whiteSpace: "nowrap" }}>Date</th>
                      <th style={{ width: "85px", textAlign: "center", whiteSpace: "nowrap" }}>Time</th>
                      <th style={{ width: "130px", textAlign: "left", whiteSpace: "nowrap" }}>Branch</th>
                      <th style={{ width: "115px", textAlign: "center", whiteSpace: "nowrap" }}>Type</th>
                      <th style={{ width: "105px", textAlign: "center", whiteSpace: "nowrap" }}>Status</th>
                      <th style={{ width: "155px", textAlign: "center", whiteSpace: "nowrap" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRequests.map((request, index) => {
                      const status = request.status || "Pending";
                      const datePart = request.requestedDate ? request.requestedDate.split(" ")[0] : "N/A";
                      const timePart = request.requestedDate ? request.requestedDate.split(" ")[1] : "N/A";
                      const emailMatch =
                        request.requestedBy && request.requestedBy.includes("(")
                          ? request.requestedBy.split("(")[1]?.replace(")", "")
                          : "";

                      return (
                        <tr key={request.id}>
                          <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>
                            {startIndex + index + 1}
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                              <div
                                style={{
                                  width: "30px",
                                  height: "30px",
                                  borderRadius: "50%",
                                  background: "#ecfdf5",
                                  color: "#059669",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  border: "1px solid #d1fae5",
                                }}
                              >
                                <User size={15} />
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color: "#0f172a",
                                    fontSize: "13px",
                                    lineHeight: "1.3",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {request.requestedByName || "Unknown User"}
                                </span>
                                {emailMatch ? (
                                  <span
                                    style={{
                                      fontSize: "11.5px",
                                      color: "#64748b",
                                      lineHeight: "1.2",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {emailMatch}
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: "11.5px",
                                      color: "#64748b",
                                      lineHeight: "1.2",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {request.requestedBy}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className="add-assets-id-badge" style={{ fontWeight: 600 }}>
                              {request.requestedDate ? request.requestedDate.split(" ")[0] : "N/A"}
                            </span>
                          </td>
                          <td style={{ textAlign: "center", color: "#64748b", fontSize: "12.5px", fontWeight: 500 }}>
                            {request.requestedDate ? request.requestedDate.split(" ")[1] : "N/A"}
                          </td>
                          <td>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                fontWeight: 600,
                                color: "#1e293b",
                                fontSize: "13px",
                              }}
                            >
                              <Building2 size={14} color="#059669" />
                              {request.requestedBranch}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              style={{
                                fontSize: "12px",
                                background: "#f1f5f9",
                                padding: "3px 9px",
                                borderRadius: "6px",
                                color: "#334155",
                                fontWeight: 500,
                                display: "inline-block",
                              }}
                            >
                              {request.type}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {status === "Approved" ? (
                              <span className="balance-status-badge approved">
                                <Check size={11} /> Approved
                              </span>
                            ) : status === "Rejected" ? (
                              <span className="balance-status-badge rejected">
                                <X size={11} /> Rejected
                              </span>
                            ) : (
                              <span className="balance-status-badge pending">
                                <Clock size={11} /> Pending
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                              }}
                            >
                              {status !== "Rejected" && (
                                <button
                                  type="button"
                                  onClick={() => handleApprove(request.id)}
                                  disabled={status === "Approved"}
                                  className="add-assets-action-btn-sm add-assets-action-btn-save"
                                  style={{
                                    opacity: status === "Approved" ? 0.6 : 1,
                                    cursor: status === "Approved" ? "default" : "pointer",
                                  }}
                                  title={status === "Approved" ? "Already approved" : "Approve request"}
                                >
                                  <Check size={12} />
                                  <span>{status === "Approved" ? "Approved" : "Approve"}</span>
                                </button>
                              )}
                              {status !== "Approved" && (
                                <button
                                  type="button"
                                  onClick={() => handleReject(request.id)}
                                  disabled={status === "Rejected"}
                                  className="add-assets-action-btn-sm add-assets-action-btn-delete"
                                  style={{
                                    opacity: status === "Rejected" ? 0.6 : 1,
                                    cursor: status === "Rejected" ? "default" : "pointer",
                                  }}
                                  title={status === "Rejected" ? "Already rejected" : "Reject request"}
                                >
                                  <X size={12} />
                                  <span>{status === "Rejected" ? "Rejected" : "Reject"}</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredRequests.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredRequests.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={setItemsPerPage}
                  pageSizeOptions={[10, 20, 50, 100]}
                  itemLabel="requests"
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Modern Allow Past Date Modal */}
      {showAllowDialog && (
        <div className="add-assets-modal-overlay">
          <div
            className="add-assets-modal-card"
            style={{ maxWidth: "520px", textAlign: "left", alignItems: "stretch" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#059669",
                  }}
                >
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>
                    Allow Past Date(s)
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                    Branch: <strong>{branchFilter || "All Branches"}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeAllowDialog}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "6px",
                  display: "flex",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
              <CalendarSelect
                inline
                selected={null}
                onChange={(d) => d && handleCalendarChange(d)}
                highlightDates={selectedDates}
                shouldCloseOnSelect={false}
                maxDate={new Date()}
                showFooter={false}
              />
            </div>

            <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: "#64748b", textAlign: "center" }}>
              Click dates to toggle selection. {selectedDates.length} date{selectedDates.length !== 1 ? "s" : ""} selected.
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={closeAllowDialog}
                className="add-assets-btn-secondary"
                style={{ height: "38px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAllowSelectedDates}
                disabled={selectedDates.length === 0}
                className="printz-btn-primary"
                style={{
                  height: "38px",
                  padding: "0 16px",
                  fontSize: "13px",
                  borderRadius: "8px",
                  border: "none",
                  background: selectedDates.length === 0 ? "#94a3b8" : "#059669",
                  color: "#ffffff",
                  cursor: selectedDates.length === 0 ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Check size={14} />
                <span>Allow {selectedDates.length} Date(s)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PastDateRequests;
