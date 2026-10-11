import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  RotateCcw,
  Eye,
  Edit2,
  Trash2,
  Users,
  Building,
  UserCheck,
} from "lucide-react";
import JobFlowLayout from "../components/JobFlowLayout";
import StatusBadge from "../components/StatusBadge";
import CustomerModal from "../components/CustomerModal";
import CustomerDetailsModal from "../components/CustomerDetailsModal";
import JobFlowDataTable from "../components/JobFlowDataTable";
import jobFlowApi from "../api/jobFlowApi";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export const CustomersPage = () => {
  const navigate = useNavigate();
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
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    // Load active branches for the filter dropdown
    jobFlowApi.getBranches()
      .then((res) => {
        const bList = res?.data || res?.items || (Array.isArray(res) ? res : []);
        if (Array.isArray(bList)) setBranches(bList);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, typeFilter, statusFilter, branchFilter]);

  const fetchCustomers = async (search = searchQuery) => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      if (branchFilter !== "all") params.branch = branchFilter;

      const res = await jobFlowApi.getCustomers(params);
      let list = [];
      if (res?.data?.items && Array.isArray(res.data.items)) {
        list = res.data.items;
        setTotalCount(res.data.total || list.length);
      } else if (res?.data && Array.isArray(res.data)) {
        list = res.data;
        setTotalCount(res.meta?.total || list.length);
      } else if (Array.isArray(res)) {
        list = res;
        setTotalCount(list.length);
      }

      // Ensure newest customers are at the top
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setCustomers(list);
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
    // Re-sync with backend database
    fetchCustomers();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers(searchQuery);
  };

  const handleReset = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
    setBranchFilter("all");
    fetchCustomers("");
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to deactivate or remove customer "${name}"?`)) {
      try {
        await jobFlowApi.deleteCustomer(id);
        toast.success("Customer removed successfully");
        fetchCustomers();
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to delete customer");
      }
    }
  };

  return (
    <JobFlowLayout
      title="Customers"
      subtitle="Search, view and manage customer profiles (Staff-assisted registration & QR matching)"
      actions={
        <button
          type="button"
          className="jf-btn jf-btn-primary"
          onClick={() => {
            setSelectedCustomer(null);
            setIsAddModalOpen(true);
          }}
        >
          <Plus size={16} /> Add Customer
        </button>
      }
    >
      {/* Search & Filters Filter Bar (Image 1 Screen 1) */}
      <form onSubmit={handleSearchSubmit} className="jf-filter-bar">
        <div className="jf-search-input-wrap">
          <Search size={16} className="jf-search-icon" />
          <input
            type="text"
            className="jf-search-input"
            placeholder="Search by name, phone, email, customer code or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="jf-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="individual">Individual</option>
          <option value="company">Company</option>
        </select>

        <select
          className="jf-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          className="jf-select"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
        >
          <option value="all">All Branches</option>
          {branches.map((b) => (
            <option key={b._id || b.id} value={b._id || b.id}>
              {b.name || b.branchName}
            </option>
          ))}
        </select>

        <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={handleReset}>
          <RotateCcw size={14} /> Reset
        </button>

        <button type="submit" className="jf-btn jf-btn-primary jf-btn-sm">
          <Search size={14} /> Search
        </button>
      </form>

      {/* Common Reusable JobFlowDataTable with Search, Sorting, Rows Per Page & Pagination */}
      <JobFlowDataTable
        columns={[
          {
            key: "customerCode",
            label: "Customer Code",
            sortable: true,
            width: "140px",
            render: (val, row, idx) => (
              <strong style={{ color: "var(--jf-primary-dark)" }}>
                {val || row.code || `CUST-00${120 + idx}`}
              </strong>
            ),
          },
          {
            key: "name",
            label: "Name / Company",
            sortable: true,
            render: (val, row) => (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {row.customerType === "Company" || row.type === "company" ? (
                  <Building size={16} style={{ color: "#2563eb", flexShrink: 0 }} />
                ) : (
                  <Users size={16} style={{ color: "var(--jf-primary)", flexShrink: 0 }} />
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
            sortable: true,
            render: (val, row) => val || row.mobile || "N/A",
          },
          {
            key: "email",
            label: "Email",
            sortable: true,
            render: (val) => val || "N/A",
          },
          {
            key: "customerType",
            label: "Type",
            sortable: true,
            render: (val, row) => val || (row.type === "company" ? "Company" : "Individual"),
          },
          {
            key: "status",
            label: "Status",
            sortable: true,
            render: (val) => <StatusBadge status={val || "Active"} />,
          },
          {
            key: "actions",
            label: "Actions",
            sortable: false,
            align: "right",
            render: (_, row) => (
              <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/jobflow/customers/${row._id || row.id || row.customerCode || row.code}`);
                  }}
                  title="View Customer Profile & Job Orders"
                >
                  <Eye size={14} /> View
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
                >
                  <Edit2 size={14} />
                </button>
                <button
                  type="button"
                  className="jf-btn jf-btn-primary jf-btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/jobflow/jobs/new?customerId=${row._id || row.id}`);
                  }}
                  title="Create Job Order"
                >
                  + Job
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
        emptyMessage="No customers found matching the search criteria."
        onRowClick={(row) => {
          navigate(`/jobflow/customers/${row._id || row.id || row.customerCode || row.code}`);
        }}
      />

      {/* Add / Edit Modal */}
      <CustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        customer={selectedCustomer}
        onSaved={handleCustomerSaved}
      />

      {/* Customer Details Modal */}
      <CustomerDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        customer={selectedCustomer}
        onEdit={(cust) => {
          setSelectedCustomer(cust);
          setIsAddModalOpen(true);
        }}
        onCreateJob={(cust) => {
          navigate(`/jobflow/jobs/new?customerId=${cust._id || cust.id}`);
        }}
      />
    </JobFlowLayout>
  );
};

export default CustomersPage;
