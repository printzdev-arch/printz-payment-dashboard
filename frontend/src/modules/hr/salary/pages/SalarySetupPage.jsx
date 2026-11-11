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
import SalaryPagination from "../components/SalaryPagination";
import SalaryMaintenanceBanner from "../components/SalaryMaintenanceBanner";
import { useSalaryMaintenance } from "../utils/salaryGuards";
import { ageAt, formatDob } from "../utils/salaryExcel";
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
          <select
            className="salary-branch-pill-select"
            disabled={!!salaryApi.getLockedBranchId()}
            value={selectedBranchId}
            onChange={(e) => {
              setSelectedBranchId(e.target.value);
              setPage(1);
            }}
          >
            {!salaryApi.getLockedBranchId() && <option value="">All Branches</option>}
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>

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

      {/* ── KPI Summary Cards ─────────────────────────────────────────── */}
      {activeTab === "structures" && (
        <div className="salary-kpi-grid">
          <div className="salary-kpi-card">
            <div className="salary-kpi-icon-box green">
              <Users size={22} />
            </div>
            <div className="salary-kpi-details">
              <span className="salary-kpi-value">{totalEmployeesCount}</span>
              <span className="salary-kpi-label">Total Employees</span>
            </div>
          </div>

          <div className="salary-kpi-card">
            <div className="salary-kpi-icon-box blue">
              <FileText size={22} />
            </div>
            <div className="salary-kpi-details">
              <span className="salary-kpi-value">{withStructureCount}</span>
              <span className="salary-kpi-label">With Salary Structure</span>
            </div>
          </div>

          <div className="salary-kpi-card">
            <div className="salary-kpi-icon-box amber">
              <AlertCircle size={22} />
            </div>
            <div className="salary-kpi-details">
              <span className="salary-kpi-value">{withoutStructureCount}</span>
              <span className="salary-kpi-label">Without Structure</span>
            </div>
          </div>

          <div className="salary-kpi-card">
            <div className="salary-kpi-icon-box purple">
              <XCircle size={22} />
            </div>
            <div className="salary-kpi-details">
              <span className="salary-kpi-value">{inactiveStructuresCount}</span>
              <span className="salary-kpi-label">Inactive Structures</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "components" && (
        <div className="salary-kpi-grid">
          {[
            { label: "Total Components", value: components.length, tone: "green", Icon: FileText },
            { label: "Earning Components", value: earningComponents, tone: "blue", Icon: CheckCircle },
            { label: "Deduction Components", value: deductionComponents, tone: "amber", Icon: AlertCircle },
            { label: "Active Components", value: activeComponents, tone: "purple", Icon: CheckCircle },
          ].map(({ label, value, tone, Icon }) => (
            <div className="salary-kpi-card" key={label}>
              <div className={`salary-kpi-icon-box ${tone}`}>
                <Icon size={22} />
              </div>
              <div className="salary-kpi-details">
                <span className="salary-kpi-value">{value}</span>
                <span className="salary-kpi-label">{label}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Table Card ───────────────────────────────────────────────── */}
      <div className="salary-table-card">
        {error && (
          <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px 16px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <div className="salary-table-responsive">
          {activeTab === "structures" ? (
            <table className="salary-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Employee Name</th>
                  <th>DOB</th>
                  <th>Age</th>
                  <th>Monthly Salary</th>
                  <th>Effective From</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                      Loading salary structures...
                    </td>
                  </tr>
                ) : filteredStructures.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                      No salary structures found. Click <strong>"+ Assign Salary Structure"</strong> to setup an employee.
                    </td>
                  </tr>
                ) : (
                  paginatedStructures.map((s, index) => {
                    const emp = s.employeeId || {};
                    const empName = emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || s.employeeName || "Employee";
                    const empCode = emp.employeeCode || s.employeeCode || "—";
                    const effectiveDate = s.effectiveFrom
                      ? new Date(s.effectiveFrom).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                      : "—";
                    const isActive = s.isActive !== false;
                    const unassigned = Boolean(s.noStructure);
                    const empId = String(emp._id || emp.id || (typeof s.employeeId === "string" ? s.employeeId : "") || "");
                    const dobText = formatDob(emp.dateOfBirth);
                    const ageValue = ageAt(emp.dateOfBirth);

                    return (
                      <tr key={s._id || index}>
                        <td>
                          <strong>{empCode}</strong>
                        </td>
                        <td>{empName}</td>
                        <td>{dobText || "—"}</td>
                        <td>{ageValue ?? "—"}</td>
                        <td style={{ fontWeight: 600 }}>
                          {unassigned ? "—" : `₹ ${Number(s.monthlySalary || 0).toLocaleString("en-IN")}`}
                        </td>
                        <td>{unassigned ? "—" : effectiveDate}</td>
                        <td>
                          <span className={`badge-salary-status ${unassigned ? "draft" : isActive ? "active" : "inactive"}`}>
                            {unassigned ? "Not assigned" : isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
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
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="salary-table">
              <thead>
                <tr>
                  <th>Component Code</th>
                  <th>Component Name</th>
                  <th>Type</th>
                  <th>Calculation Type</th>
                  <th>Default Amount / %</th>
                  <th>Taxable</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                      Loading salary components...
                    </td>
                  </tr>
                ) : filteredComponents.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                      No salary components found. Click <strong>"+ Add Component"</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  filteredComponents.map((c, index) => (
                    <tr key={c._id || index}>
                      <td>
                        <strong>{c.code}</strong>
                      </td>
                      <td>{c.name}</td>
                      <td>
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
                      </td>
                      <td>{c.calculationType}</td>
                      <td>
                        {c.calculationType === "PERCENTAGE"
                          ? `${c.defaultAmount ?? 0}% of ${(c.percentageOf || "BASIC").replace("_", " ").toLowerCase()}`
                          : `₹ ${Number(c.defaultAmount || 0).toLocaleString("en-IN")}`}
                      </td>
                      <td>{c.isTaxable ? "Yes" : "No"}</td>
                      <td>
                        <span className={`badge-salary-status ${c.isActive !== false ? "active" : "inactive"}`}>
                          {c.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination Bar ─────────────────────────────────────────── */}
        <SalaryPagination
          total={filteredStructures.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
          hidden={activeTab !== "structures"}
        />
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
