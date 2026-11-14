import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  FileText,
  ArrowUp,
  Users,
} from "lucide-react";
import attendanceApi from "../api/attendanceApi";
import CreatePolicyModal from "../components/CreatePolicyModal";
import AddHolidayModal from "../components/AddHolidayModal";
import BranchSelect from "../../../../shared/ui/selects/BranchSelect";
import DataTable from "../../../../shared/ui/DataTable/DataTable";
import SelectField from "../../../../shared/ui/selects/SelectField";
import "../styles/attendance.css";

export default function AttendanceSetupPage() {
  const [activeTab, setActiveTab] = useState("policies"); // "policies" | "calendars"
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Policies State & Pagination
  const [policies, setPolicies] = useState([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [policyPage, setPolicyPage] = useState(1);
  const [policyPageSize, setPolicyPageSize] = useState(10);

  // Holiday Calendars State & Pagination
  const [calendars, setCalendars] = useState([]);
  const [calendarsLoading, setCalendarsLoading] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [holidayPage, setHolidayPage] = useState(1);
  const [holidayPageSize, setHolidayPageSize] = useState(10);

  // Notification / error
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (activeTab === "policies") {
      loadPolicies();
    } else {
      loadCalendars();
    }
  }, [activeTab, selectedBranchId, selectedYear]);

  const loadBranches = async () => {
    try {
      const data = await attendanceApi.getBranches();
      setBranches(data);
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  };

  const loadPolicies = async () => {
    try {
      setPoliciesLoading(true);
      setError("");
      const params = {};
      if (selectedBranchId) params.branchId = selectedBranchId;
      const res = await attendanceApi.getPolicies(params);
      const payload = res?.data || res || [];
      const list = Array.isArray(payload) ? payload : payload?.policies || res?.items || [];
      setPolicies(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load policies.");
    } finally {
      setPoliciesLoading(false);
    }
  };

  const loadCalendars = async () => {
    try {
      setCalendarsLoading(true);
      setError("");
      const params = { year: selectedYear };
      if (selectedBranchId) params.branchId = selectedBranchId;
      const res = await attendanceApi.getHolidayCalendars(params);
      const payload = res?.data || res || [];
      const list = Array.isArray(payload) ? payload : payload?.calendars || res?.items || [];
      setCalendars(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load holiday calendars.");
    } finally {
      setCalendarsLoading(false);
    }
  };

  const handleTogglePolicyStatus = async (policyId, currentStatus) => {
    try {
      await attendanceApi.updatePolicyStatus(policyId, !currentStatus);
      loadPolicies();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update policy status.");
    }
  };

  const handleDeletePolicy = async (policyId) => {
    if (!window.confirm("Are you sure you want to delete this policy?")) return;
    try {
      await attendanceApi.deletePolicy(policyId);
      loadPolicies();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete policy.");
    }
  };

  const handleDeleteHoliday = async (calendarId, holidayDate) => {
    if (!window.confirm("Are you sure you want to delete this holiday?")) return;
    try {
      const cal = calendars.find((c) => c._id === calendarId);
      if (!cal) return;
      const updatedHolidays = (cal.holidays || []).filter((h) => h.date !== holidayDate);
      await attendanceApi.updateHolidayCalendar(calendarId, { holidays: updatedHolidays });
      loadCalendars();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete holiday.");
    }
  };

  // Flattened holidays list from active calendars
  const flattenedHolidays = [];
  calendars.forEach((cal) => {
    (cal.holidays || []).forEach((h) => {
      const dayName = new Date(h.date).toLocaleDateString("en-US", { weekday: "short" });
      flattenedHolidays.push({
        ...h,
        day: dayName,
        calendarId: cal._id,
        calendarName: cal.name,
        branchId: cal.branchId,
        branchName: cal.branchId
          ? cal.branchId.name ||
            branches.find((b) => String(b._id) === String(cal.branchId._id || cal.branchId))?.name ||
            ""
          : "All Branches",
        scope: cal.branchId ? "Branch" : "Organization",
        calendarActive: cal.isActive,
      });
    });
  });
  flattenedHolidays.sort((a, b) => a.date.localeCompare(b.date));

  useEffect(() => {
    setPolicyPage(1);
  }, [selectedBranchId]);

  useEffect(() => {
    setHolidayPage(1);
  }, [selectedYear, selectedBranchId]);

  const paginatedPolicies = useMemo(() => {
    const start = (policyPage - 1) * policyPageSize;
    return policies.slice(start, start + policyPageSize);
  }, [policies, policyPage, policyPageSize]);

  const paginatedHolidays = useMemo(() => {
    const start = (holidayPage - 1) * holidayPageSize;
    return flattenedHolidays.slice(start, start + holidayPageSize);
  }, [flattenedHolidays, holidayPage, holidayPageSize]);

  // Derived KPI metrics for Policies
  const activePoliciesCount = useMemo(() => {
    return policies.filter((p) => p.isActive).length;
  }, [policies]);

  const defaultPolicy = useMemo(() => {
    return policies.find((p) => p.isDefault) || null;
  }, [policies]);

  const branchesWithPolicyCount = useMemo(() => {
    const s = new Set();
    policies.forEach((p) => {
      const bId = p.branchId?._id || p.branchId;
      if (bId) s.add(String(bId));
    });
    return s.size;
  }, [policies]);

  // Derived KPI metrics for Holiday Calendars
  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingHolidaysCount = useMemo(() => {
    return flattenedHolidays.filter((h) => h.date >= todayStr).length;
  }, [flattenedHolidays, todayStr]);

  const orgHolidaysCount = useMemo(() => {
    return flattenedHolidays.filter((h) => h.scope === "Organization").length;
  }, [flattenedHolidays]);

  const branchHolidaysCount = useMemo(() => {
    return flattenedHolidays.filter((h) => h.scope === "Branch").length;
  }, [flattenedHolidays]);

  return (
    <div className="attendance-page-container">
      {/* ─── Header Row ──────────────────────────────────────────────── */}
      <div className="attendance-header-row">
        <div className="attendance-title-area">
          <h1>Attendance Setup</h1>
          
        </div>

        <div className="attendance-header-actions">
          {/* Year Selector (Holiday Calendars tab only) */}
          {activeTab === "calendars" && (
            <div className="attendance-year-wrap">
              <SelectField
                searchable={false}
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                options={[2026, 2025, 2024]}
              />
            </div>
          )}

          {/* Branch Pill Selector */}
          <div className="attendance-branch-wrap">
            <BranchSelect
              valueKey="id"
              allowAll
              allOptionLabel="All Branches"
              allOptionValue=""
              branches={branches}
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
            />
          </div>

          {activeTab === "policies" ? (
            <button
              type="button"
              className="btn-printz-primary"
              onClick={() => {
                setEditingPolicy(null);
                setIsPolicyModalOpen(true);
              }}
            >
              <Plus size={16} />
              <span>Create Policy</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-printz-primary"
              onClick={() => {
                setEditingHoliday(null);
                setIsHolidayModalOpen(true);
              }}
            >
              <Plus size={16} />
              <span>Add Holiday</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Tabs Navigation ─────────────────────────────────────────── */}
      <div className="attendance-tabs-nav">
        <button
          type="button"
          className={`attendance-tab-btn ${activeTab === "policies" ? "active" : ""}`}
          onClick={() => setActiveTab("policies")}
        >
          Attendance Policies
        </button>
        <button
          type="button"
          className={`attendance-tab-btn ${activeTab === "calendars" ? "active" : ""}`}
          onClick={() => setActiveTab("calendars")}
        >
          Holiday Calendars
        </button>
      </div>


      {error && (
        <div style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "10px 18px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {/* ─── Tab 1: Attendance Policies ──────────────────────────────── */}
      {activeTab === "policies" && (
        <DataTable
          mobileCards
          searchable={false}
          loading={policiesLoading}
          data={policies}
          pageSize={10}
          emptyMessage={'No attendance policies configured. Click "+ Create Policy" to add one.'}
          columns={[
            { key: "sno", label: "#", width: "40px", className: "printz-cell-hide-mobile", render: (p, idx) => idx + 1 },
            {
              key: "name",
              label: "Policy Name",
              className: "printz-cell-lead",
              render: (p) => (
                <>
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>{p.name}</div>
                  <div style={{ fontSize: "11px", color: "#1e293b" }}>{p.code}</div>
                </>
              ),
            },
            { key: "branch", label: "Branch", render: (p) => p.branchId?.name || (p.branchId ? "Branch" : "All Branches") },
            { key: "shift", label: "Shift Time", render: (p) => `${p.shiftStartTime || "09:00"} - ${p.shiftEndTime || "18:00"}` },
            { key: "workingHoursPerDay", label: "Working Hours", render: (p) => `${p.workingHoursPerDay || 8}h` },
            {
              key: "isActive",
              label: "Status",
              render: (p) => (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={Boolean(p.isActive)}
                      onChange={() => handleTogglePolicyStatus(p._id, p.isActive)}
                    />
                    <span className="slider"></span>
                  </label>
                  {!p.isActive && <span style={{ fontSize: "12px", color: "#1e293b" }}>Inactive</span>}
                </div>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              align: "right",
              className: "printz-cell-actions",
              render: (p) => (
                <div className="action-icon-group" style={{ justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="icon-btn view"
                    title="View Policy"
                    onClick={() => {
                      setEditingPolicy(p);
                      setIsPolicyModalOpen(true);
                    }}
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn edit"
                    title="Edit Policy"
                    onClick={() => {
                      setEditingPolicy(p);
                      setIsPolicyModalOpen(true);
                    }}
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn delete"
                    title="Delete Policy"
                    onClick={() => handleDeletePolicy(p._id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* ─── Tab 2: Holiday Calendars ────────────────────────────────── */}
      {activeTab === "calendars" && (
        <>
          <DataTable
            mobileCards
            searchable={false}
            loading={calendarsLoading}
            data={flattenedHolidays}
            pageSize={10}
            emptyMessage={`No holidays found for year ${selectedYear}. Click "+ Add Holiday" to configure.`}
            columns={[
              { key: "sno", label: "#", width: "40px", className: "printz-cell-hide-mobile", render: (h, idx) => idx + 1 },
              { key: "date", label: "Date", className: "printz-cell-lead", render: (h) => <span style={{ fontWeight: 600 }}>{h.date}</span> },
              { key: "day", label: "Day", render: (h) => <span style={{ color: "#1e293b" }}>{h.day}</span> },
              { key: "name", label: "Holiday Name", render: (h) => <span style={{ fontWeight: 600, color: "#0f172a" }}>{h.name}</span> },
              {
                key: "type",
                label: "Type",
                render: (h) => <span className={`status-badge ${(h.type || "public").toLowerCase()}`}>{h.type || "PUBLIC"}</span>,
              },
              { key: "branchName", label: "Branch", render: (h) => <span style={{ fontWeight: 600, color: "#0f172a" }}>{h.branchName || "-"}</span> },
              {
                key: "calendarActive",
                label: "Status",
                render: (h) => (
                  <label className="switch">
                    <input type="checkbox" checked={Boolean(h.calendarActive)} readOnly />
                    <span className="slider"></span>
                  </label>
                ),
              },
              {
                key: "actions",
                label: "Actions",
                align: "right",
                className: "printz-cell-actions",
                render: (h) => (
                  <div className="action-icon-group" style={{ justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="icon-btn edit"
                      title="Edit Holiday"
                      onClick={() => {
                        setEditingHoliday(h);
                        setIsHolidayModalOpen(true);
                      }}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn delete"
                      title="Delete Holiday"
                      onClick={() => handleDeleteHoliday(h.calendarId, h.date)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </>
      )}

      {/* ─── Modals ─────────────────────────────────────────────────── */}
      <CreatePolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        onSave={() => loadPolicies()}
        branches={branches}
        editingPolicy={editingPolicy}
      />

      <AddHolidayModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        onSave={() => loadCalendars()}
        branches={branches}
        selectedBranchId={selectedBranchId}
        selectedYear={selectedYear}
        editingHoliday={editingHoliday}
      />
    </div>
  );
}
