import { useState, useEffect } from "react";
import {
  collection,
  doc,
  updateDoc,
  getDoc,
  onSnapshot,
  addDoc,
} from "firebase/firestore";
import { db, auth } from "../../services/authservice";
import "../../styles/pastDateRequests.css";
import { usePopup } from "../../hooks/usePopup";
import Popup from "../common/Popup";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "react-toastify";

const PastDateRequests = () => {
  const { popup, showSuccess, showError } = usePopup();
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [branches, setBranches] = useState([]);

  // New state for Allow Past Date dialog
  const [showAllowDialog, setShowAllowDialog] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]); // array of Date objects (local)
  // removed lastPickedDate (not needed with inline calendar)

  const itemsPerPage = 20;

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "pastDateRequests"),
      async (snapshot) => {
        try {
          const requestData = await Promise.all(
            snapshot.docs.map(async (doc1) => {
              const request = { id: doc1.id, ...doc1.data() };

              const userDoc = await getDoc(
                doc(db, "users", request.requestedBy)
              );
              if (userDoc.exists()) {
                const userData = userDoc.data();
                request.requestedBy = `${userData.name} (${userData.email})`;
                request.requestedByName = userData.name;
              } else {
                request.requestedBy = "Unknown User";
                request.requestedByName = "Unknown";
              }

              const dateParts = request.requestedDate.split(" ")[0].split("-");
              const timeParts = request.requestedDate.split(" ")[1].split(":");
              request.sortableDate = new Date(
                Number.parseInt(dateParts[0]),
                Number.parseInt(dateParts[1]) - 1,
                Number.parseInt(dateParts[2]),
                Number.parseInt(timeParts[0]),
                Number.parseInt(timeParts[1]),
                Number.parseInt(timeParts[2])
              );

              return request;
            })
          );

          const sortedData = requestData.sort(
            (a, b) => b.sortableDate - a.sortableDate
          );
          setRequests(sortedData);
          setFilteredRequests(sortedData);

          const uniqueBranches = [
            ...new Set(sortedData.map((req) => req.requestedBranch)),
          ].filter(Boolean);
          setBranches(uniqueBranches);

          setLoading(false);
        } catch (error) {
          console.error("Error fetching requests:", error);
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error listening to requests:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
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

    setFilteredRequests(filtered);
    setCurrentPage(1);
  }, [branchFilter, statusFilter, requests]);

  const handleApprove = async (id) => {
    try {
      const requestDoc = doc(db, "pastDateRequests", id);
      await updateDoc(requestDoc, { status: "Approved" });

      showSuccess("Request approved successfully.");
    } catch (error) {
      console.error("Error approving request:", error);
      showError("Failed to approve the request.");
    }
  };

  const handleReject = async (id) => {
    try {
      const requestDoc = doc(db, "pastDateRequests", id);
      await updateDoc(requestDoc, { status: "Rejected" });

      showSuccess("Request rejected successfully.");
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

  // no-op: inline calendar toggles; dedicated remover not needed

  const handleAllowSelectedDates = async () => {
    if (selectedDates.length === 0) return;
    try {
      const requestedBy = auth?.currentUser?.uid || "system";
      const requestedBranch = branchFilter || "all branches"; // special marker when All Branches is chosen

      await Promise.all(
        selectedDates.map((d) =>
          addDoc(collection(db, "pastDateRequests"), {
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
  };

  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }

  return (
    <div className="past-date-requests-container">
      <h2>Past Date Requests</h2>

      {/* Filters */}
      <div className="filters-container">
        <div className="filter-group">
          <label htmlFor="branch-filter">Filter by Branch:</label>
          <select
            id="branch-filter"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Branches</option>
            {branches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="status-filter">Filter by Status:</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <button onClick={clearFilters} className="clear-filters-btn">
          Clear Filters
        </button>
      </div>

      {/* Results info + action */}
      <div
        className="results-actions-row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginTop: "8px",
          marginBottom: "8px",
        }}
      >
        <div className="results-info">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredRequests.length)}{" "}
          of {filteredRequests.length} entries
          {(branchFilter || statusFilter) && (
            <span className="filter-info">
              {branchFilter && ` | Branch: ${branchFilter}`}
              {statusFilter && ` | Status: ${statusFilter}`}
            </span>
          )}
        </div>
        <button className="clear-filters-btn" onClick={openAllowDialog}>
          Allow Past Date
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="requests-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Requested By</th>
              <th>Date</th>
              <th>Time</th>
              <th>Branch</th>
              <th>Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentRequests.length > 0 ? (
              currentRequests.map((request, index) => (
                <tr key={request.id}>
                  <td style={{ textAlign: "center" }}>
                    {startIndex + index + 1}
                  </td>
                  <td>{request.requestedBy}</td>
                  <td>
                    {request.requestedDate
                      ? request.requestedDate.split(" ")[0]
                      : "N/A"}
                  </td>
                  <td>
                    {request.requestedDate
                      ? request.requestedDate.split(" ")[1]
                      : "N/A"}
                  </td>
                  <td>{request.requestedBranch}</td>
                  <td>{request.type}</td>
                  <td>
                    <span
                      className={`status-badge ${(
                        request.status || "Pending"
                      ).toLowerCase()}`}
                    >
                      {request.status || "Pending"}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {request.status !== "Rejected" && (
                        <button
                          className="approve-button"
                          onClick={() => handleApprove(request.id)}
                          disabled={request.status === "Approved"}
                        >
                          Approve
                        </button>
                      )}
                      {request.status !== "Approved" && (
                        <button
                          className="reject-button"
                          onClick={() => handleReject(request.id)}
                          disabled={request.status === "Rejected"}
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-data">
                  No requests found matching the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            Previous
          </button>

          <div className="pagination-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 2 && page <= currentPage + 2)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`pagination-number ${
                      currentPage === page ? "active" : ""
                    }`}
                  >
                    {page}
                  </button>
                );
              } else if (page === currentPage - 3 || page === currentPage + 3) {
                return (
                  <span key={page} className="pagination-ellipsis">
                    ...
                  </span>
                );
              }
              return null;
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}

      {/* Allow Past Date Dialog */}
      {showAllowDialog && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="modal-content"
            style={{
              background: "#fff",
              borderRadius: 8,
              padding: 20,
              width: "90%",
              maxWidth: 600,
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <div
              className="modal-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0 }}>Allow Past Date(s)</h3>
              <button
                onClick={closeAllowDialog}
                className="close-button"
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
            <div style={{ marginBottom: 8, color: "#555" }}>
              Branch: <strong>{branchFilter || "All Branches"}</strong>
            </div>

            <div
              style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}
            >
              <div>
                <DatePicker
                  inline
                  selected={null}
                  onChange={(d) => d && handleCalendarChange(d)}
                  highlightDates={selectedDates}
                  shouldCloseOnSelect={false}
                  maxDate={new Date()}
                  renderCustomHeader={({
                    date,
                    decreaseMonth,
                    increaseMonth,
                    prevMonthButtonDisabled,
                    nextMonthButtonDisabled,
                  }) => (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "6px 8px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={decreaseMonth}
                        disabled={prevMonthButtonDisabled}
                        style={{
                          background: "transparent",
                          border: "1px solid #ddd",
                          borderRadius: 6,
                          padding: "4px 8px",
                          cursor: prevMonthButtonDisabled
                            ? "default"
                            : "pointer",
                          color: "#333",
                        }}
                        aria-label="Previous Month"
                        title="Previous Month"
                      >
                        ‹
                      </button>
                      <div style={{ fontWeight: 600, color: "#333" }}>
                        {date?.toLocaleString("default", {
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={increaseMonth}
                        disabled={nextMonthButtonDisabled}
                        style={{
                          background: "transparent",
                          border: "1px solid #ddd",
                          borderRadius: 6,
                          padding: "4px 8px",
                          cursor: nextMonthButtonDisabled
                            ? "default"
                            : "pointer",
                          color: "#333",
                        }}
                        aria-label="Next Month"
                        title="Next Month"
                      >
                        ›
                      </button>
                    </div>
                  )}
                  dayClassName={(d) =>
                    selectedDates.some((sd) => isSameDay(sd, d))
                      ? "react-datepicker__day--selected"
                      : undefined
                  }
                />
                <div style={{ color: "#666", marginTop: 6 }}>
                  Click on dates to toggle selection. Selected dates stay
                  highlighted.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 16,
              }}
            >
              <button onClick={closeAllowDialog} className="cancel-btn">
                Cancel
              </button>
              <button
                onClick={handleAllowSelectedDates}
                disabled={selectedDates.length === 0}
                className="approve-button"
              >
                Allow selected date(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Component */}
      <Popup
        show={popup.show}
        message={popup.message}
        type={popup.type}
        onClose={() => {}}
      />
    </div>
  );
};

export default PastDateRequests;
