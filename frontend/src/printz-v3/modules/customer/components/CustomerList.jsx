import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Phone,
  Building,
  ArrowRight,
  RefreshCw,
  Plus
} from "lucide-react";
import Badge from "../../../shared/components/Badge";
import DataTable from "../../../shared/components/DataTable";
import { getCustomers } from "../api/customerApi";
import "../styles/customerV3.css";

export default function CustomerList({
  branchName = "Banaswadi",
  onSelectCustomer,
  onAddNewCustomer,
  refreshTrigger = 0,
  className = ""
}) {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const fetchCustomersList = async () => {
    setIsLoading(true);
    try {
      const data = await getCustomers({ branch: branchName });
      setCustomers(data);
      setFilteredCustomers(data);
    } catch (err) {
      console.error("Failed to load customer list:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomersList();
  }, [branchName, refreshTrigger]);

  useEffect(() => {
    let result = [...customers];

    if (typeFilter !== "ALL") {
      result = result.filter((c) => c.customerType?.toUpperCase() === typeFilter);
    }

    if (sourceFilter !== "ALL") {
      result = result.filter((c) => c.source?.toUpperCase() === sourceFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(q) ||
          (c.mobile || "").includes(q) ||
          (c.customerCode || "").toLowerCase().includes(q) ||
          (c.companyName || "").toLowerCase().includes(q)
      );
    }

    setFilteredCustomers(result);
    setCurrentPage(1); // Reset to first page on filter change
  }, [searchQuery, typeFilter, sourceFilter, customers]);

  // Paginated slice
  const paginatedData = filteredCustomers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Define Columns for DataTable with comfortable readable typography
  const columns = [
    {
      key: "customerCode",
      label: "Customer Code",
      width: "140px",
      render: (val, row) => (
        <strong style={{ fontFamily: "monospace", color: "#047857", fontSize: "13.5px" }}>
          {val || row.id || "CUS-000184"}
        </strong>
      )
    },
    {
      key: "name",
      label: "Customer Name & Company",
      render: (val, row) => (
        <div>
          <strong style={{ color: "#0f172a", display: "block", fontSize: "14.5px", fontWeight: 800 }}>
            {val}
          </strong>
          {row.companyName && (
            <span style={{ fontSize: "12.5px", color: "#64748b", display: "flex", alignItems: "center", gap: "5px", marginTop: "3px" }}>
              <Building size={13} color="#94a3b8" />
              {row.companyName}
            </span>
          )}
        </div>
      )
    },
    {
      key: "mobile",
      label: "Mobile Number",
      width: "160px",
      render: (val) => (
        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1e293b", fontSize: "13.5px", display: "flex", alignItems: "center", gap: "5px" }}>
          <Phone size={13} color="#047857" />
          {val}
        </span>
      )
    },
    {
      key: "customerType",
      label: "Type",
      width: "130px",
      render: (val) => (
        <span
          style={{
            fontSize: "12px",
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: "6px",
            backgroundColor: val === "BUSINESS" ? "#eff6ff" : "#faf5ff",
            color: val === "BUSINESS" ? "#1d4ed8" : "#7e22ce",
            border: `1px solid ${val === "BUSINESS" ? "#bfdbfe" : "#e9d5ff"}`
          }}
        >
          {val === "BUSINESS" ? "Business (B2B)" : "Individual (B2C)"}
        </span>
      )
    },
    {
      key: "source",
      label: "Source",
      width: "120px",
      render: (val) => (
        <span
          style={{
            fontSize: "12px",
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: "6px",
            backgroundColor: val === "QR" ? "#fffbeb" : "#f0fdf4",
            color: val === "QR" ? "#b45309" : "#15803d",
            border: `1px solid ${val === "QR" ? "#fde68a" : "#bbf7d0"}`
          }}
        >
          {val === "QR" ? "QR Scan" : "Walk-in"}
        </span>
      )
    },
    {
      key: "branchName",
      label: "Branch",
      width: "130px",
      render: (val) => (
        <span style={{ color: "#334155", fontWeight: 700, fontSize: "13.5px" }}>
          {val || branchName}
        </span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      width: "140px",
      render: (_, row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectCustomer) onSelectCustomer(row);
          }}
          style={{
            padding: "6px 14px",
            borderRadius: "6px",
            backgroundColor: "#ecfdf5",
            color: "#047857",
            border: "1px solid #a7f3d0",
            fontSize: "12.5px",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            transition: "all 0.15s ease"
          }}
        >
          <span>View Profile</span>
          <ArrowRight size={13} />
        </button>
      )
    }
  ];

  return (
    <div className={`v3-card ${className}`} style={{ padding: 0, overflow: "hidden" }}>
      {/* Header & Controls */}
      <div className="v3-card-header" style={{ padding: "16px 20px" }}>
        <div className="v3-card-header-left">
          <div className="v3-card-icon" style={{ width: "34px", height: "34px" }}>
            <Users size={20} />
          </div>
          <div>
            <h3 className="v3-card-title" style={{ fontSize: "16.5px", fontWeight: 800 }}>
              Registered Customer Directory
            </h3>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={fetchCustomersList}
            title="Refresh List"
            style={{
              padding: "7px 12px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              cursor: "pointer",
              color: "#64748b"
            }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          padding: "12px 20px",
          backgroundColor: "#f8fafc",
          borderBottom: "1px solid #f1f5f9",
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        <div style={{ position: "relative", flex: "1", maxWidth: "380px" }}>
          <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Filter by name, mobile, code, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 12px 7px 36px",
              fontSize: "13px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              outline: "none",
              backgroundColor: "#ffffff",
              boxSizing: "border-box"
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Customer Type Pills */}
          <div style={{ display: "inline-flex", background: "#ffffff", padding: "3px", borderRadius: "8px", border: "1px solid #cbd5e1", gap: "2px" }}>
            {["ALL", "BUSINESS", "INDIVIDUAL"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(type)}
                style={{
                  padding: "5px 12px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  borderRadius: "6px",
                  backgroundColor: typeFilter === type ? "#047857" : "transparent",
                  color: typeFilter === type ? "#ffffff" : "#475569",
                  transition: "all 0.15s ease"
                }}
              >
                {type === "ALL" ? "All Types" : type === "BUSINESS" ? "B2B" : "Individual"}
              </button>
            ))}
          </div>

          {/* Source Pills */}
          <div style={{ display: "inline-flex", background: "#ffffff", padding: "3px", borderRadius: "8px", border: "1px solid #cbd5e1", gap: "2px" }}>
            {["ALL", "WALK_IN", "QR"].map((source) => (
              <button
                key={source}
                type="button"
                onClick={() => setSourceFilter(source)}
                style={{
                  padding: "5px 12px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  borderRadius: "6px",
                  backgroundColor: sourceFilter === source ? "#047857" : "transparent",
                  color: sourceFilter === source ? "#ffffff" : "#475569",
                  transition: "all 0.15s ease"
                }}
              >
                {source === "ALL" ? "All Sources" : source === "WALK_IN" ? "Walk-in" : "QR"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reusable Enterprise DataTable with Pagination */}
      <DataTable
        columns={columns}
        data={paginatedData}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No customers found matching the filter criteria."
        onRowClick={(row) => onSelectCustomer && onSelectCustomer(row)}
        rowHeight={56}
        pagination={{
          currentPage,
          pageSize,
          totalItems: filteredCustomers.length,
          onPageChange: (page) => setCurrentPage(page),
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          },
          pageSizeOptions: [5, 10, 20, 50],
          showPageSizeSelector: true,
          showTotalCount: true
        }}
        style={{ border: "none", borderRadius: 0, boxShadow: "none" }}
      />
    </div>
  );
}
