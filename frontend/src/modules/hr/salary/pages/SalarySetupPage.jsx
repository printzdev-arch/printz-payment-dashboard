import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Users,
  FileText,
  AlertCircle,
  XCircle,
  Search,
  Building2,
  CheckCircle,
} from "lucide-react";
import salaryApi from "../api/salaryApi";
import AssignSalaryStructureModal from "../components/AssignSalaryStructureModal";
import CreateComponentModal from "../components/CreateComponentModal";
import { useAuth } from "../../../../app/providers/AuthContext";
import DataTable from "../../../../shared/ui/DataTable/DataTable";
import SalaryMaintenanceBanner from "../components/SalaryMaintenanceBanner";
import { useSalaryMaintenance } from "../utils/salaryGuards";
import { ageAt, formatDob } from "../utils/salaryExcel";
import BranchSelect from "../../../../shared/ui/selects/BranchSelect";
import "../styles/salary.css";

export default function SalarySetupPage() {
  const maintenance = useSalaryMaintenance();
  const { hasPermission } = useAuth();
  const canConfigure = hasPermission("hr.salary.configure");
  const [activeTab, setActiveTab] = useState("structures"); // "components" | "structures"
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(() => salaryApi.getLockedBranchId());
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Structures & Components State
  const [structures, setStructures] = useState([]);
  const [components, setComponents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    if (activeTab === "structures") {
      loadStructures();
    } else {
      loadComponents();
    }
  }, [activeTab, selectedBranchId]);

  // Tab badges and component KPIs need both lists regardless of the open tab.
  useEffect(() => {
    if (activeTab === "structures" && components.length === 0) loadComponents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadLookups = async () => {
    try {
      const [branchList, empList] = await Promise.all([
        salaryApi.getBranches(),
        salaryApi.getEmployees({ limit: 300 }),
      ]);
      setBranches(branchList);
      setEmployees(empList);
      setSelectedBranchId(salaryApi.getLockedBranchId());
    } catch (err) {
      console.error("Failed to load lookups:", err);
    }
  };

  const loadStructures = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { limit: 200 };
      if (selectedBranchId) params.branchId = selectedBranchId;
      const res = await salaryApi.listStructures(params);
      const list = res?.data || res?.items || (Array.isArray(res) ? res : []);
      setStructures(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load salary structures.");
    } finally {
      setLoading(false);
    }
  };

  const loadComponents = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await salaryApi.listComponents(selectedBranchId ? { branchId: selectedBranchId } : {});
      const list = res?.data || res?.items || (Array.isArray(res) ? res : []);
      setComponents(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load components.");
    } finally {
      setLoading(false);
    }
  };

  // KPIs (real data only; employees are limited to the selected branch)
  const branchEmployees = useMemo(
    () =>
      employees.filter((e) => {
        if (!selectedBranchId) return true;
        const b = e.branchId?._id || e.branchId;
        return !b || String(b) === String(selectedBranchId);
      }),
    [employees, selectedBranchId]
  );
  const totalEmployeesCount = branchEmployees.length;
  const employeeIdsWithActive = new Set(
    structures.filter((s) => s.isActive !== false).map((s) => String(s.employeeId?._id || s.employeeId))
  );
  const withStructureCount = employeeIdsWithActive.size;
  const withoutStructureCount = branchEmployees.filter(
    (e) => !employeeIdsWithActive.has(String(e._id || e.id))
  ).length;
  const inactiveStructuresCount = structures.filter((s) => s.isActive === false).length;

  const earningComponents = components.filter((c) => c.componentType === "EARNING").length;
  const deductionComponents = components.filter((c) => c.componentType === "DEDUCTION").length;
  const activeComponents = components.filter((c) => c.isActive !== false).length;

  // Employees of the branch with no active structure appear as "Not assigned"
  // rows so the table agrees with the KPI cards above.
  const structureRows = useMemo(() => {
    const missing = branchEmployees
      .filter((e) => !employeeIdsWithActive.has(String(e._id || e.id)))
      .map((e) => ({ _id: `none-${e._id || e.id}`, noStructure: true, employeeId: e, isActive: null }));
    // One current row per employee: an older active record for the same employee (left over from
    // assigning more than once) is hidden. The list arrives newest first.
    const seen = new Set();
    const current = structures.filter((st) => {
      if (st.isActive === false) return true;
      const key = String(st.employeeId?._id || st.employeeId);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return [...current, ...missing];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structures, branchEmployees]);

  // Filtered Structures
  const filteredStructures = useMemo(() => {
    return structureRows.filter((s) => {
      if (selectedStatus === "NONE") return Boolean(s.noStructure);
      if ((selectedStatus === "ACTIVE" || selectedStatus === "INACTIVE") && s.noStructure) return false;
      const emp = s.employeeId || {};
      const empName = (emp.name || "").toLowerCase();
      const empCode = (emp.employeeCode || "").toLowerCase();
      if (selectedStatus === "ACTIVE" && s.isActive === false) return false;
      if (selectedStatus === "INACTIVE" && s.isActive !== false) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = empName.includes(q);
        const matchCode = empCode.includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [structureRows, selectedStatus, searchQuery]);

  // Filtered Components
  const filteredComponents = useMemo(() => {
    return components.filter((c) => {
      if (selectedType !== "ALL" && c.componentType !== selectedType) return false;
      if (selectedStatus === "ACTIVE" && c.isActive === false) return false;
      if (selectedStatus === "INACTIVE" && c.isActive !== false) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (c.name || "").toLowerCase().includes(q);
        const matchCode = (c.code || "").toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [components, searchQuery, selectedType, selectedStatus]);

  // Pagination slice
  const paginatedStructures = filteredStructures.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="salary-page-container">
      <SalaryMaintenanceBanner />
      {/* ── Top Header Row ─────────────────────────────────────────────── */}
      <div className="salary-header-row">
        <div className="salary-title-area">
          <h1>Salary Setup</h1>
          
        </div>

        <div className="salary-header-actions">
          {/* Branch Selector */}
          <BranchSelect
            valueKey="id"
            lockToUserBranch
            allowAll
            allOptionLabel="All Branches"
            allOptionValue=""
            branches={branches}
            value={selectedBranchId}
            onChange={(e) => {
              setSelectedBranchId(e.target.value);
              setPage(1);
            }}
            style={{ minWidth: "210px" }}
            triggerStyle={{ height: "38px", fontSize: "13px" }}
          />

          {!canConfigure ? null : activeTab === "structures" ? (
            <button
              type="button"
              className="btn-salary-primary"
              disabled={maintenance}
              onClick={() => {
                setAssignEmployeeId("");
                setIsAssignModalOpen(true);
              }}
            >
              <Plus size={16} /> Assign Salary Structure
            </button>
          ) : (
            <button
              type="button"
              className="btn-salary-primary"
              disabled={maintenance}
              onClick={() => setIsComponentModalOpen(true)}
            >
              <Plus size={16} /> Add Component
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs Bar ─────────────────────────────────────────────────── */}
      <div className="salary-tabs-bar">
        <button
          type="button"
          className={`salary-tab-btn ${activeTab === "components" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("components");
            setPage(1);
          }}
        >
          Salary Components
          <span className="salary-tab-badge">{components.length}</span>
        </button>

        <button
          type="button"
          className={`salary-tab-btn ${activeTab === "structures" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("structures");
            setPage(1);
          }}
        >
          Employee Salary Structures
          <span className="salary-tab-badge">{structures.length}</span>
        </button>
      </div>

      {/* ── Filters Row Card ──────────────────────────────────────────── */}
      <div className="salary-filters-card">
        {activeTab === "components" && (
          <select
            className="salary-filter-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="EARNING">Earning</option>
            <option value="DEDUCTION">Deduction</option>
          </select>
        )}

        <select
          className="salary-filter-select"
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          {activeTab === "structures" && <option value="NONE">Not assigned</option>}
        </select>

        <div className="salary-search-wrapper">
          <Search size={16} className="salary-search-icon" />
          <input
            type="text"
            className="salary-search-input"
            placeholder={
              activeTab === "structures"
                ? "Search employee by name or ID..."
                : "Search component by name or code..."
            }
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>



      {/* ── Table Card ───────────────────────────────────────────────── */}
      <div className="salary-table-card">
        {error && (
          <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px 16px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        {activeTab === "structures" ? (
          <DataTable
            searchable={false}
            loading={loading}
            data={filteredStructures}
            pageSize={10}
            emptyMessage={<>No salary structures found. Click <strong>"+ Assign Salary Structure"</strong> to setup an employee.</>}
            columns={[
              {
                key: "employeeCode",
                label: "Employee ID",
                render: (s) => {
                  const emp = s.employeeId || {};
                  return <strong>{emp.employeeCode || s.employeeCode || "—"}</strong>;
                },
              },
              {
                key: "employeeName",
                label: "Employee Name",
                render: (s) => {
                  const emp = s.employeeId || {};
                  return emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || s.employeeName || "Employee";
                },
              },
              { key: "dob", label: "DOB", render: (s) => formatDob((s.employeeId || {}).dateOfBirth) || "—" },
              { key: "age", label: "Age", render: (s) => ageAt((s.employeeId || {}).dateOfBirth) ?? "—" },
              {
                key: "monthlySalary",
                label: "Monthly Salary",
                render: (s) => (
                  <span style={{ fontWeight: 600 }}>
                    {s.noStructure ? "—" : `₹ ${Number(s.monthlySalary || 0).toLocaleString("en-IN")}`}
                  </span>
                ),
              },
              {
                key: "effectiveFrom",
                label: "Effective From",
                render: (s) =>
                  s.noStructure
                    ? "—"
                    : s.effectiveFrom
                      ? new Date(s.effectiveFrom).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                      : "—",
              },
              {
                key: "status",
                label: "Status",
                render: (s) => {
                  const unassigned = Boolean(s.noStructure);
                  const isActive = s.isActive !== false;
                  return (
                    <span className={`badge-salary-status ${unassigned ? "draft" : isActive ? "active" : "inactive"}`}>
                      {unassigned ? "Not assigned" : isActive ? "Active" : "Inactive"}
                    </span>
                  );
                },
              },
              {
                key: "actions",
                label: "Actions",
                align: "right",
                render: (s) => {
                  const emp = s.employeeId || {};
                  const unassigned = Boolean(s.noStructure);
                  return (
                    <div className="salary-action-group" style={{ justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="salary-icon-btn primary"
                        title={unassigned ? "Assign a salary structure" : "Assign a revised structure with a new effective date"}
                        disabled={maintenance || !canConfigure}
                        onClick={() => {
                          setAssignEmployeeId(String(emp._id || emp.id || s.employeeId || ""));
                          setIsAssignModalOpen(true);
                        }}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  );
                },
              },
            ]}
          />
        ) : (
          <DataTable
            searchable={false}
            pagination={false}
            loading={loading}
            data={filteredComponents}
            emptyMessage={<>No salary components found. Click <strong>"+ Add Component"</strong> to create one.</>}
            columns={[
              { key: "code", label: "Component Code", render: (c) => <strong>{c.code}</strong> },
              { key: "name", label: "Component Name", render: (c) => c.name },
              {
                key: "componentType",
                label: "Type",
                render: (c) => (
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      background: c.componentType === "EARNING" ? "#dcfce7" : "#fee2e2",
                      color: c.componentType === "EARNING" ? "#15803d" : "#b91c1c",
                    }}
                  >
                    {c.componentType}
                  </span>
                ),
              },
              { key: "calculationType", label: "Calculation Type", render: (c) => c.calculationType },
              {
                key: "defaultAmount",
                label: "Default Amount / %",
                render: (c) =>
                  c.calculationType === "PERCENTAGE"
                    ? `${c.defaultAmount ?? 0}% of ${(c.percentageOf || "BASIC").replace("_", " ").toLowerCase()}`
                    : `₹ ${Number(c.defaultAmount || 0).toLocaleString("en-IN")}`,
              },
              { key: "isTaxable", label: "Taxable", render: (c) => (c.isTaxable ? "Yes" : "No") },
              {
                key: "isActive",
                label: "Status",
                render: (c) => (
                  <span className={`badge-salary-status ${c.isActive !== false ? "active" : "inactive"}`}>
                    {c.isActive !== false ? "Active" : "Inactive"}
                  </span>
                ),
              },
            ]}
          />
        )}
      </div>

      {/* ── Popups ───────────────────────────────────────────────────── */}
      <AssignSalaryStructureModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onSuccess={loadStructures}
        branches={branches}
        initialBranchId={selectedBranchId}
        initialEmployeeId={assignEmployeeId}
      />

      <CreateComponentModal
        isOpen={isComponentModalOpen}
        onClose={() => setIsComponentModalOpen(false)}
        onSuccess={loadComponents}
        branchId={selectedBranchId}
        branchName={branches.find((b) => String(b._id) === String(selectedBranchId))?.name || ""}
      />
    </div>
  );
}
