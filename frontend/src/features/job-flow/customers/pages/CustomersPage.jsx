import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  RotateCcw,
  Eye,
  Edit2,
  Trash2,
  PlusCircle,
  Users,
  User,
  Building,
  QrCode,
  ExternalLink,
} from "lucide-react";
import JobFlowLayout from "../../shared/components/JobFlowLayout";
import StatusBadge from "../../shared/components/StatusBadge";
import CustomerModal from "../components/CustomerModal";
import CustomerDetailsModal from "../components/CustomerDetailsModal";
import BranchQrModal from "../components/BranchQrModal";
import JobFlowDataTable from "../../shared/components/JobFlowDataTable";
import jobFlowApi from "../api/customersApi";
import "../styles/customers.css";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export const CustomersPage = () => {
  const navigate = useNavigate();

  // Active Main Tab: 'both' | 'walkin' | 'qr'
  const [activeTab, setActiveTab] = useState("both");

  // Tab counts
  const [counts, setCounts] = useState({
    both: 0,
    walkin: 0,
    qr: 0,
  });

  // ── Customer Directory State ──
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    // Load active branches
    jobFlowApi.getBranches()
      .then((res) => {
        const bList = res?.data || res?.items || (Array.isArray(res) ? res : []);
        if (Array.isArray(bList)) setBranches(bList);
      })
      .catch(() => {});

    fetchTabCounts();
  }, []);

  const fetchTabCounts = async () => {
    try {
      const [bothRes, walkinRes, qrRes] = await Promise.all([
        jobFlowApi.getCustomers({ limit: 1 }),
        jobFlowApi.getCustomers({ customerType: "WALK_IN", limit: 1 }),
        jobFlowApi.getCustomers({ customerType: "QR", limit: 1 }),
      ]);

      const bothTotal = bothRes?.meta?.total || bothRes?.data?.total || bothRes?.total || 0;
      const walkinTotal = walkinRes?.meta?.total || walkinRes?.data?.total || walkinRes?.total || 0;
      const qrTotal = qrRes?.meta?.total || qrRes?.data?.total || qrRes?.total || 0;

      setCounts({
        both: bothTotal,
        walkin: walkinTotal,
        qr: qrTotal,
      });
    } catch (e) {
      console.warn("Could not load tab counts:", e);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [activeTab, searchQuery, typeFilter, statusFilter, branchFilter]);

  const fetchCustomers = async (search = searchQuery) => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      if (branchFilter !== "all") params.branch = branchFilter;

      // Filter by active tab list
      if (activeTab === "walkin") {
        params.customerType = "WALK_IN";
      } else if (activeTab === "qr") {
        params.customerType = "QR";
      }

      const res = await jobFlowApi.getCustomers(params);
      let list = [];
      let total = 0;
      if (res?.data?.items && Array.isArray(res.data.items)) {
        list = res.data.items;
        total = res.data.total || list.length;
      } else if (res?.data && Array.isArray(res.data)) {
        list = res.data;
        total = res.meta?.total || list.length;
      } else if (Array.isArray(res)) {
        list = res;
        total = list.length;
      }

      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setCustomers(list);
      setTotalCount(total);

      // Update current tab count
      setCounts((prev) => ({
        ...prev,
        [activeTab]: total,
      }));
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSaved = (savedCust, isNew = false) => {
    if (savedCust && (savedCust._id || savedCust.id)) {
      const custId = savedCust._id || savedCust.id;
      setCustomers((prev) => {
        const exists = prev.some((c) => (c._id || c.id) === custId);
        if (exists) {
          return prev.map((c) => ((c._id || c.id) === custId ? { ...c, ...savedCust } : c));
        } else {
          return [savedCust, ...prev];
        }
      });
      setTotalCount((prev) => prev + (isNew ? 1 : 0));
    }
    fetchTabCounts();
    fetchCustomers();
  };

  const handleDeleteCustomer = async (cust) => {
    const custId = cust?._id || cust?.id;
    if (!custId) return;
    const custName = cust.name || cust.companyName || cust.customerCode || "this customer";

    const confirmDelete = window.confirm(
      `Are you sure you want to delete customer "${custName}"? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      await jobFlowApi.deleteCustomer(custId);
      toast.success(`Customer "${custName}" deleted successfully`);
      setCustomers((prev) => prev.filter((c) => (c._id || c.id) !== custId));
      setTotalCount((prev) => Math.max(0, prev - 1));
      fetchTabCounts();
    } catch (err) {
      console.error("Failed to delete customer:", err);
      toast.error(err.response?.data?.message || "Failed to delete customer");
    }
  };

  return (
    <JobFlowLayout
      title="Customer Directory & Enquiries"
      actions={
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="jf-btn jf-btn-secondary"
            onClick={() => setIsQrModalOpen(true)}
            title="View & Print Scannable Branch Counter Stand"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <QrCode size={16} /> Branch QR Stand
          </button>
          <button
            type="button"
            className="jf-btn jf-btn-secondary"
            onClick={() => navigate("/jobflow/qr-request")}
            title="Open Self-Service Branch QR Form"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <ExternalLink size={16} /> Open QR Form
          </button>
          <button
            type="button"
            className="jf-btn jf-btn-primary"
            onClick={() => {
              setSelectedCustomer(null);
              setIsAddModalOpen(true);
            }}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <Plus size={16} /> Add Customer
          </button>
        </div>
      }
    >
      {/* ── Main Tab Switcher: Three Tabs for Three Lists ── */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>
        <button
          type="button"
          onClick={() => setActiveTab("both")}
          className="jf-btn"
          style={{
            backgroundColor: activeTab === "both" ? "var(--jf-primary)" : "#f8fafc",
            color: activeTab === "both" ? "#ffffff" : "#475569",
            fontWeight: 600,
            border: activeTab === "both" ? "none" : "1px solid #e2e8f0",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Users size={16} /> Both Walk-in & QR ({counts.both})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("walkin")}
          className="jf-btn"
          style={{
            backgroundColor: activeTab === "walkin" ? "var(--jf-primary)" : "#f8fafc",
            color: activeTab === "walkin" ? "#ffffff" : "#475569",
            fontWeight: 600,
            border: activeTab === "walkin" ? "none" : "1px solid #e2e8f0",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <User size={16} /> Walk-in ({counts.walkin})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("qr")}
          className="jf-btn"
          style={{
            backgroundColor: activeTab === "qr" ? "var(--jf-primary)" : "#f8fafc",
            color: activeTab === "qr" ? "#ffffff" : "#475569",
            fontWeight: 600,
            border: activeTab === "qr" ? "none" : "1px solid #e2e8f0",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <QrCode size={16} /> QR ({counts.qr})
        </button>
      </div>

      {/* Search & Filters */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          fetchCustomers(searchQuery);
        }}
        className="jf-filter-bar"
      >
        <div className="jf-search-input-wrap">
          <Search size={16} className="jf-search-icon" />
          <input
            type="text"
            className="jf-search-input"
            placeholder="Search by name, phone, email, code or GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="jf-select"
          style={{width:"150px"}}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Sources</option>
          <option value="individual">Individual</option>
          <option value="company">Company (B2B)</option>
        </select>

        <select
          className="jf-select"
          style={{width:"150px"}}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        

        {/* <button
          type="button"
          className="jf-btn jf-btn-secondary jf-btn-sm"
          onClick={() => {
            setSearchQuery("");
            setTypeFilter("all");
            setStatusFilter("all");
            setBranchFilter("all");
            fetchCustomers("");
          }}
        >
          <RotateCcw size={14} /> Reset
        </button> */}

        {/* <button type="submit" className="jf-btn jf-btn-primary jf-btn-sm">
          <Search size={14} /> Search
        </button> */}
      </form>

      {/* Customer Directory Table */}
      <JobFlowDataTable
        sortable={false}
        columns={[
          {
            key: "customerCode",
            label: "Customer Code",
            sortable: false,
            width: "140px",
            render: (val, row, idx) => (
              <strong style={{ color: "var(--jf-primary-dark)" }}>
                {val || row.code || `CUST-00${120 + idx}`}
              </strong>
            ),
          },
          {
            key: "name",
            label: "Name",
            sortable: false,
            render: (val, row) => (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {row.customerSource === "COMPANY" || row.company || row.companyName ? (
                  <Building size={16} style={{ color: "#2563eb", flexShrink: 0 }} />
                ) : (
                  <User size={16} style={{ color: "var(--jf-primary)", flexShrink: 0 }} />
                )}
                <div>
                  <div style={{ fontWeight: 600 }}>{val || row.companyName}</div>
                  {row.companyName && row.companyName !== val && (
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{row.companyName}</div>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: "phone",
            label: "Phone",
            sortable: false,
            render: (val, row) => val || row.mobile || "N/A",
          },
          // {
          //   key: "email",
          //   label: "Email",
          //   sortable: false,
          //   render: (val) => val || "N/A",
          // },
          {
            key: "customerType",
            label: "Type",
            sortable: false,
            width: "120px",
            render: (val) => {
              const isQr = val === "QR" || val === "qr" || val === "QR_CODE";
              return isQr ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.2rem 0.55rem", borderRadius: "12px", backgroundColor: "#ecfdf5", color: "#065f46", fontSize: "0.75rem", fontWeight: 700 }}>
                  <QrCode size={12} /> QR
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.2rem 0.55rem", borderRadius: "12px", backgroundColor: "#f1f5f9", color: "#475569", fontSize: "0.75rem", fontWeight: 600 }}>
                  <User size={12} /> Walk-in
                </span>
              );
            },
          },
          {
            key: "customerSource",
            label: "Source",
            sortable: false,
            width: "120px",
            render: (val, row) => {
              const isCompany = val === "COMPANY" || Boolean(row.company || row.companyName);
              return isCompany ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.2rem 0.55rem", borderRadius: "12px", backgroundColor: "#eff6ff", color: "#1e40af", fontSize: "0.75rem", fontWeight: 600 }}>
                  <Building size={12} /> Company
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.2rem 0.55rem", borderRadius: "12px", backgroundColor: "#f8fafc", color: "#64748b", fontSize: "0.75rem", fontWeight: 600 }}>
                  <User size={12} /> Individual
                </span>
              );
            },
          },
          // {
          //   key: "gstin",
          //   label: "GSTIN",
          //   sortable: false,
          //   render: (val) => val ? <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#475569" }}>{val}</span> : "—",
          // },
          {
            key: "status",
            label: "Status",
            sortable: false,
            render: (val) => <StatusBadge status={val || "Active"} />,
          },
          {
            key: "actions",
            label: "Actions",
            sortable: false,
            align: "right",
            width: "170px",
            render: (_, row) => (
              <div style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
                <button
                  type="button"
                  className="jf-btn jf-btn-primary jf-btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/jobflow/jobs/new?customerId=${row._id || row.id}`);
                  }}
                  title="Create Job Order (+Job)"
                  aria-label="Create Job Order"
                  style={{ padding: "0.35rem 0.5rem" }}
                >
                  <PlusCircle size={15} />
                </button>
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/jobflow/customers/${row._id || row.id || row.customerCode || row.code}`);
                  }}
                  title="View Customer Profile"
                  aria-label="View Customer Profile"
                  style={{ padding: "0.35rem 0.5rem" }}
                >
                  <Eye size={15} />
                </button>
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCustomer(row);
                    setIsAddModalOpen(true);
                  }}
                  title="Edit Customer"
                  aria-label="Edit Customer"
                  style={{ padding: "0.35rem 0.5rem" }}
                >
                  <Edit2 size={15} />
                </button>
                <button
                  type="button"
                  className="jf-btn jf-btn-danger-outline jf-btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCustomer(row);
                  }}
                  title="Delete Customer"
                  aria-label="Delete Customer"
                  style={{ padding: "0.35rem 0.5rem" }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ),
          },
        ]}
        data={customers}
        loading={loading}
        searchable={false}
        initialPageSize={10}
        pageSizeOptions={[5, 10, 25, 50]}
        emptyMessage={`No ${activeTab === "walkin" ? "walk-in" : activeTab === "qr" ? "QR" : ""} customers found matching search criteria.`}
        onRowClick={(row) => {
          navigate(`/jobflow/customers/${row._id || row.id || row.customerCode || row.code}`);
        }}
      />

      {/* Customer Modals */}
      {isAddModalOpen && (
        <CustomerModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          customer={selectedCustomer}
          onSaved={handleCustomerSaved}
        />
      )}

      {isDetailsModalOpen && selectedCustomer && (
        <CustomerDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
        />
      )}

      {isQrModalOpen && (
        <BranchQrModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
        />
      )}
    </JobFlowLayout>
  );
};

export default CustomersPage;
