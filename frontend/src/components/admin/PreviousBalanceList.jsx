import React, { useState, useEffect } from "react";
import api from "../../services/api";
import {
  Wallet,
  Building2,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  IndianRupee,
  Search,
  X,
} from "lucide-react";
import "../../styles/printzTheme.css";
import "../../styles/addAssets.css";
import Pagination from "../common/Pagination";
import BranchSelect from "../common/BranchSelect.jsx";

const PreviousBalanceList = () => {
  const [balanceData, setBalanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);

  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    fetchBalanceData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [balanceData, selectedBranch, selectedStatus, searchQuery]);

  const fetchBalanceData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/payments");
      const records = res.data?.data || (Array.isArray(res.data) ? res.data : []);

      const balanceList = [];
      const branchSet = new Set();

      records.forEach((data) => {
        if (typeof data.balance === "number" || typeof data.paymentToBeCollected === "number") {
          const balance = Number(data.balance || 0);
          const paymentCollected = Number(
            data.paymentCollectedTillNow !== undefined
              ? data.paymentCollectedTillNow
              : (data.paymentCollected || 0)
          );
          const paymentToBeCollected = Number(
            data.paymentToBeCollected !== undefined
              ? data.paymentToBeCollected
              : (balance - paymentCollected)
          );

          // Do not show finished / zero-balance records
          if (paymentToBeCollected <= 0) return;

          balanceList.push({
            id: data.id || data._id,
            branchName:
              data.branchName ||
              (data.branchId && typeof data.branchId === "object" && data.branchId.name) ||
              "Unknown Branch",
            date: data.dateAt
              ? new Date(data.dateAt)
              : data.createdAt
              ? new Date(data.createdAt)
              : new Date(data.date || Date.now()),
            balance: balance,
            paymentCollected: paymentCollected,
            paymentCollectedTillNow: paymentCollected,
            paymentToBeCollected: paymentToBeCollected,
            status: "pending",
            ...data,
          });

          branchSet.add(
            data.branchName ||
              (data.branchId && typeof data.branchId === "object" && data.branchId.name) ||
              "Unknown Branch"
          );
        }
      });

      setBalanceData(balanceList);
      setBranches(Array.from(branchSet).sort());
    } catch (error) {
      console.error("Error fetching balance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...balanceData];

    if (selectedBranch) {
      filtered = filtered.filter((item) => item.branchName === selectedBranch);
    }

    if (selectedStatus) {
      filtered = filtered.filter((item) => item.status === selectedStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        const branchMatch = (item.branchName || "").toLowerCase().includes(q);
        const statusMatch = (item.status || "").toLowerCase().includes(q);
        const dateStr = formatDate(item.date).toLowerCase();
        const dateMatch = dateStr.includes(q);
        const balanceStr = (item.balance ?? "").toString();
        const collectedStr = (item.paymentCollectedTillNow ?? "").toString();
        const pendingStr = (item.paymentToBeCollected ?? "").toString();
        const amountMatch =
          balanceStr.includes(q) ||
          collectedStr.includes(q) ||
          pendingStr.includes(q);
        return branchMatch || statusMatch || dateMatch || amountMatch;
      });
    }

    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedBranch("");
    setSelectedStatus("");
    setSearchQuery("");
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
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

  const formatDate = (date) => {
    if (!date) return "N/A";
    const safeDate = date instanceof Date ? date : new Date(date);
    return safeDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  return (
    <div className="add-assets-page-container">
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
            Previous Balance{" "}
            <span className="highlight" style={{ color: "#059669" }}>
              Management
            </span>
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            Track and monitor pending branch receivables and collected payments.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #a7f3d0",
              padding: "8px 16px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#065f46",
              boxShadow: "0 1px 3px rgba(5, 150, 105, 0.08)",
            }}
          >
            <Wallet size={16} color="#059669" />
            <span>{filteredData.length.toLocaleString()} Records Found</span>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="add-assets-card">
        <div className="add-assets-card-header">
          <div className="add-assets-card-header-left">
            <div className="add-assets-card-icon">
              <Wallet size={18} color="#059669" />
            </div>
            <div>
              <h3 className="add-assets-card-title" style={{ fontSize: "18px", fontWeight: 700 }}>
                Balance Records Directory
              </h3>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "12.5px", color: "#64748b", fontWeight: 500 }}>
              Showing {filteredData.length === 0 ? 0 : indexOfFirstItem + 1}–
              {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length.toLocaleString()} entries
            </span>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div
          style={{
            padding: "16px 22px",
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
          <div style={{ minWidth: "180px" }}>
            <BranchSelect
              id="branch-filter"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              branches={branches}
              placeholder="All Branches"
              allowAll={true}
              allOptionLabel="All Branches"
              triggerStyle={{ height: "38px", fontSize: "13px" }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: "150px" }}>
            <div className="add-assets-input-wrap" style={{ height: "38px" }}>
              <Clock size={15} className="add-assets-input-icon" />
              <select
                id="status-filter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="add-assets-select"
                style={{ fontSize: "13px" }}
              >
                <option value="">Pending Collections</option>
              </select>
            </div>
          </div>

          {/* Search Input */}
          <div style={{ minWidth: "240px", flex: "1 1 260px", maxWidth: "380px" }}>
            <div className="add-assets-input-wrap" style={{ height: "38px", position: "relative" }}>
              <Search size={15} color="#059669" className="add-assets-input-icon" />
              <input
                type="text"
                placeholder="Search branch, date, or amount..."
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

          {(selectedBranch || selectedStatus || searchQuery) && (
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

        {/* Table Section */}
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
              <p style={{ margin: 0, fontSize: "13px" }}>Loading previous balance data...</p>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="add-assets-empty-state" style={{ padding: "54px 20px" }}>
              <Wallet size={40} color="#cbd5e1" />
              <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", margin: "8px 0 4px 0" }}>
                No balance records found
              </h4>
              <p style={{ margin: "0 0 16px 0", color: "#64748b", fontSize: "13px" }}>
                {searchQuery || selectedBranch || selectedStatus
                  ? "No previous balance records match your filter or search criteria."
                  : "There are currently no balance records in the database."}
              </p>
              {(searchQuery || selectedBranch || selectedStatus) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="add-assets-btn-secondary"
                  style={{ fontSize: "13px" }}
                >
                  <RotateCcw size={14} /> Reset Filters & Search
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="add-assets-table-wrap">
                <table className="add-assets-table balance-directory-table">
                  <thead>
                    <tr>
                      <th style={{ width: "65px", textAlign: "center" }}>S.No</th>
                      <th style={{ minWidth: "200px", textAlign: "left" }}>Branch Name</th>
                      <th style={{ width: "130px", textAlign: "center" }}>Date</th>
                      <th style={{ width: "160px", textAlign: "right" }}>Total Balance</th>
                      <th style={{ width: "170px", textAlign: "right" }}>Payment Collected</th>
                      <th style={{ width: "190px", textAlign: "right" }}>Payment To Be Collected</th>
                      <th style={{ width: "130px", textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((item, index) => {
                      const isFinished = item.status === "finished";
                      return (
                        <tr key={item.id}>
                          <td style={{ textAlign: "center" }}>
                            <span
                              style={{
                                color: "#64748b",
                                fontWeight: 600,
                                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                                fontSize: "12.5px",
                              }}
                            >
                              {indexOfFirstItem + index + 1}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                              <div
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "7px",
                                  background: "#ecfdf5",
                                  border: "1px solid #d1fae5",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <Building2 size={14} color="#059669" />
                              </div>
                              <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "13.5px" }}>
                                {item.branchName}
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              className="add-assets-id-badge"
                              style={{ fontSize: "12px", padding: "4px 9px" }}
                            >
                              {formatDate(item.date)}
                            </span>
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                              fontWeight: 700,
                              fontSize: "13.5px",
                              color: "#0f172a",
                            }}
                          >
                            {formatCurrency(item.balance)}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                              fontWeight: 700,
                              fontSize: "13.5px",
                              color: "#047857",
                            }}
                          >
                            {formatCurrency(item.paymentCollectedTillNow)}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                              fontWeight: 700,
                              fontSize: "13.5px",
                              color: item.paymentToBeCollected > 0 ? "#dc2626" : "#64748b",
                            }}
                          >
                            {formatCurrency(item.paymentToBeCollected)}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {isFinished ? (
                              <span className="balance-status-badge finished">
                                <CheckCircle2 size={12} /> Finished
                              </span>
                            ) : (
                              <span className="balance-status-badge pending">
                                <Clock size={12} /> Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Standard Pagination Controls */}
              <Pagination
                currentPage={currentPage}
                totalItems={filteredData.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                pageSizeOptions={[10, 20, 50, 100]}
                itemLabel="records"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviousBalanceList;