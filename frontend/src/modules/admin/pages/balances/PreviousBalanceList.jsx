import React, { useState, useEffect, useRef } from "react";
import { getPayments, getBranches } from "../../api";
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
import "../../../../shared/styles/printzTheme.css";
import "../../../../shared/styles/addAssets.css";
import DataTable from "../../../../shared/ui/DataTable/DataTable";
import BranchSelect from "../../../../shared/ui/selects/BranchSelect.jsx";

const PreviousBalanceList = () => {
  // Only the rows of the current page are loaded; the server filters, searches and pages them
  const [balanceData, setBalanceData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);

  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  // The search box value that is actually sent to the server (waits until typing pauses)
  const [appliedSearch, setAppliedSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  // Only the newest response may update the screen (older, slower ones are ignored)
  const latestRequestId = useRef(0);

  useEffect(() => {
    fetchBranchNames();
  }, []);

  // Load the page again whenever the page, page size, branch or the applied search change
  useEffect(() => {
    fetchBalanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, selectedBranch, appliedSearch]);

  // Wait until typing pauses before searching, and start every new search from page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== appliedSearch) {
        setAppliedSearch(searchQuery);
        setCurrentPage(1);
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // The branch filter lists every branch, not only the ones on the current page
  const fetchBranchNames = async () => {
    try {
      const res = await getBranches();
      const records = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      const names = records
        .map((b) => (typeof b === "string" ? b : b.name || b.code))
        .filter(Boolean);
      setBranches(Array.from(new Set(names)).sort((x, y) => x.localeCompare(y)));
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchBalanceData = async () => {
    const requestId = ++latestRequestId.current;
    try {
      setLoading(true);
      // outstanding=true: only balances that are still to be collected, filtered, searched and paged by the server
      const params = { outstanding: true, page: currentPage, limit: itemsPerPage };
      if (selectedBranch) params.branch = selectedBranch;
      if (appliedSearch.trim()) params.search = appliedSearch.trim();

      const res = await getPayments({ params });
      if (requestId !== latestRequestId.current) return; // a newer request replaced this one
      const records = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      // The total number of matching records (all pages) comes back in a response header
      const headerTotal = Number.parseInt(res.headers?.["x-total-count"], 10);
      const total = Number.isFinite(headerTotal) ? headerTotal : records.length;

      // The page is past the end (for example the last balance on the last page was just collected): go back
      if (records.length === 0 && total > 0 && currentPage > 1) {
        setCurrentPage(Math.max(1, Math.ceil(total / itemsPerPage)));
        return;
      }

      const balanceList = records.map((data) => {
        const balance = Number(data.balance || 0);
        const paymentCollected = Number(
          data.paymentCollectedTillNow !== undefined ? data.paymentCollectedTillNow : data.paymentCollected || 0
        );
        const paymentToBeCollected = Number(
          data.paymentToBeCollected !== undefined ? data.paymentToBeCollected : balance - paymentCollected
        );
        return {
          id: data.id || data._id,
          branchName: data.branchName || "Unknown Branch",
          date: data.date || data.dateAt || data.createdAt,
          balance,
          paymentCollected,
          paymentCollectedTillNow: paymentCollected,
          paymentToBeCollected,
          status: "pending",
        };
      });

      setBalanceData(balanceList);
      setTotalCount(total);
    } catch (error) {
      console.error("Error fetching balance data:", error);
    } finally {
      if (requestId === latestRequestId.current) setLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedBranch("");
    setSelectedStatus("");
    setSearchQuery("");
    setAppliedSearch("");
    setCurrentPage(1);
  };

  // The balance list already holds just the current page, so these only describe where that page sits
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  const indexOfLastItem = indexOfFirstItem + balanceData.length;
  const currentItems = balanceData;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

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
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setCurrentPage(1);
              }}
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
                color: "#475569",
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
              <p style={{ margin: "0 0 16px 0", color: "#475569", fontSize: "13px" }}>
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
            <DataTable
              searchable={false}
              data={currentItems}
              serverPagination={{
                page: currentPage,
                pageSize: itemsPerPage,
                total: totalCount,
                onPageChange: setCurrentPage,
                onPageSizeChange: (size) => {
                  setItemsPerPage(size);
                  setCurrentPage(1);
                },
              }}
              columns={[
                {
                  key: "sno",
                  label: "S.No",
                  width: "65px",
                  align: "center",
                  render: (item, index) => (
                    <span
                      style={{
                        color: "#475569",
                        fontWeight: 600,
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: "12.5px",
                      }}
                    >
                      {index + 1}
                    </span>
                  ),
                },
                {
                  key: "branchName",
                  label: "Branch Name",
                  width: "200px",
                  render: (item) => (
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
                  ),
                },
                {
                  key: "date",
                  label: "Date",
                  width: "130px",
                  align: "center",
                  render: (item) => (
                    <span className="add-assets-id-badge" style={{ fontSize: "12px", padding: "4px 9px" }}>
                      {formatDate(item.date)}
                    </span>
                  ),
                },
                {
                  key: "balance",
                  label: "Total Balance",
                  width: "160px",
                  align: "right",
                  render: (item) => (
                    <span
                      style={{
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 700,
                        fontSize: "13.5px",
                        color: "#0f172a",
                      }}
                    >
                      {formatCurrency(item.balance)}
                    </span>
                  ),
                },
                {
                  key: "paymentCollectedTillNow",
                  label: "Payment Collected",
                  width: "170px",
                  align: "right",
                  render: (item) => (
                    <span
                      style={{
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 700,
                        fontSize: "13.5px",
                        color: "#047857",
                      }}
                    >
                      {formatCurrency(item.paymentCollectedTillNow)}
                    </span>
                  ),
                },
                {
                  key: "paymentToBeCollected",
                  label: "Payment To Be Collected",
                  width: "190px",
                  align: "right",
                  render: (item) => (
                    <span
                      style={{
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 700,
                        fontSize: "13.5px",
                        color: item.paymentToBeCollected > 0 ? "#dc2626" : "#64748b",
                      }}
                    >
                      {formatCurrency(item.paymentToBeCollected)}
                    </span>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  width: "130px",
                  align: "center",
                  render: (item) =>
                    item.status === "finished" ? (
                      <span className="balance-status-badge finished">
                        <CheckCircle2 size={12} /> Finished
                      </span>
                    ) : (
                      <span className="balance-status-badge pending">
                        <Clock size={12} /> Pending
                      </span>
                    ),
                },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviousBalanceList;