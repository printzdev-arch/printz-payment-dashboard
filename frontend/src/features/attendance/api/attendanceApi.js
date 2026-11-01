import api from "../../../services/api";

export const attendanceApi = {
  // ─── Attendance Policies ──────────────────────────────────────────────────
  getPolicies: async (params = {}) => {
    const res = await api.get("/attendance-policies", { params });
    return res.data;
  },

  getPolicyById: async (id) => {
    const res = await api.get(`/attendance-policies/${id}`);
    return res.data;
  },

  createPolicy: async (data) => {
    const res = await api.post("/attendance-policies", data);
    return res.data;
  },

  updatePolicy: async (id, data) => {
    const res = await api.put(`/attendance-policies/${id}`, data);
    return res.data;
  },

  updatePolicyStatus: async (id, isActive) => {
    const res = await api.put(`/attendance-policies/${id}/status`, { isActive });
    return res.data;
  },

  deletePolicy: async (id) => {
    const res = await api.delete(`/attendance-policies/${id}`);
    return res.data;
  },

  // ─── Holiday Calendars ────────────────────────────────────────────────────
  getHolidayCalendars: async (params = {}) => {
    const res = await api.get("/holiday-calendars", { params });
    return res.data;
  },

  getHolidayCalendarById: async (id) => {
    const res = await api.get(`/holiday-calendars/${id}`);
    return res.data;
  },

  createHolidayCalendar: async (data) => {
    const res = await api.post("/holiday-calendars", data);
    return res.data;
  },

  updateHolidayCalendar: async (id, data) => {
    const res = await api.put(`/holiday-calendars/${id}`, data);
    return res.data;
  },

  updateHolidayCalendarStatus: async (id, isActive) => {
    const res = await api.put(`/holiday-calendars/${id}/status`, { isActive });
    return res.data;
  },

  deleteHolidayCalendar: async (id) => {
    const res = await api.delete(`/holiday-calendars/${id}`);
    return res.data;
  },

  // ─── Daily Attendance ─────────────────────────────────────────────────────
  getDailyAttendance: async (params = {}) => {
    const res = await api.get("/attendance", { params });
    return res.data;
  },

  getAttendanceById: async (id) => {
    const res = await api.get(`/attendance/${id}`);
    return res.data;
  },

  getAttendanceSummary: async (params = {}) => {
    const res = await api.get("/attendance/summary", { params });
    return res.data;
  },

  getEmployeesForDate: async (params = {}) => {
    const res = await api.get("/attendance/employees-for-date", { params });
    return res.data;
  },

  getMissingAttendance: async (params = {}) => {
    const res = await api.get("/attendance/missing", { params });
    return res.data;
  },

  recordCheckIn: async (data) => {
    const res = await api.post("/attendance/check-in", data);
    return res.data;
  },

  recordCheckOut: async (data) => {
    const res = await api.post("/attendance/check-out", data);
    return res.data;
  },

  batchPunch: async (data) => {
    const res = await api.post("/attendance/batch-punch", data);
    return res.data;
  },

  reconcileAttendance: async (data) => {
    const res = await api.post("/attendance/reconcile", data);
    return res.data;
  },

  finalizeAttendance: async (data) => {
    const res = await api.post("/attendance/finalize", data);
    return res.data;
  },

  reopenAttendance: async (data) => {
    const res = await api.post("/attendance/reopen", data);
    return res.data;
  },

  generateHolidayRecords: async (data) => {
    const res = await api.post("/attendance/generate-holidays", data);
    return res.data;
  },

  createAttendance: async (data) => {
    const res = await api.post("/attendance", data);
    return res.data;
  },

  updateAttendance: async (id, data) => {
    const res = await api.put(`/attendance/${id}`, data);
    return res.data;
  },

  deleteAttendance: async (id) => {
    const res = await api.delete(`/attendance/${id}`);
    return res.data;
  },

  // ─── Attendance Permissions ───────────────────────────────────────────────
  getPermissions: async (params = {}) => {
    const res = await api.get("/attendance/permissions", { params });
    return res.data;
  },

  getPermissionById: async (id) => {
    const res = await api.get(`/attendance/permissions/${id}`);
    return res.data;
  },

  getEmployeePermissionBalance: async (employeeId, params = {}) => {
    const res = await api.get(`/attendance/permissions/balance/${employeeId}`, { params });
    return res.data;
  },

  createPermission: async (data) => {
    const res = await api.post("/attendance/permissions", data);
    return res.data;
  },

  updatePermission: async (id, data) => {
    const res = await api.put(`/attendance/permissions/${id}`, data);
    return res.data;
  },

  deletePermission: async (id) => {
    const res = await api.delete(`/attendance/permissions/${id}`);
    return res.data;
  },

  // ─── Helper Lists (Branches, Departments, Employees) ──────────────────────
  getBranches: async () => {
    try {
      const res = await api.get("/branches");
      const raw = res.data;
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.data)) return raw.data;
      if (Array.isArray(raw?.items)) return raw.items;
      if (Array.isArray(raw?.branches)) return raw.branches;
      return [];
    } catch {
      return [];
    }
  },

  getDepartments: async (params = {}) => {
    try {
      const res = await api.get("/departments", { params });
      const raw = res.data;
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.data)) return raw.data;
      if (Array.isArray(raw?.items)) return raw.items;
      if (Array.isArray(raw?.departments)) return raw.departments;
      return [];
    } catch {
      return [];
    }
  },

  getEmployees: async (params = {}) => {
    try {
      const res = await api.get("/employees", { params });
      const raw = res.data;
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.items)) return raw.items;
      if (Array.isArray(raw?.data?.items)) return raw.data.items;
      if (Array.isArray(raw?.data)) return raw.data;
      if (Array.isArray(raw?.data?.employees)) return raw.data.employees;
      if (Array.isArray(raw?.employees)) return raw.employees;
      return [];
    } catch {
      return [];
    }
  },

  getDefaultBranchId: (branches = []) => {
    if (!Array.isArray(branches) || branches.length === 0) return "";
    try {
      const rawUser = localStorage.getItem("user");
      const storedUser = rawUser ? JSON.parse(rawUser) : {};
      const userBranchId = storedUser.branchId?._id || storedUser.branchId;
      const userBranchName =
        storedUser.branchName ||
        storedUser.branch ||
        localStorage.getItem("userBranchName");

      if (userBranchId && branches.some((b) => String(b._id) === String(userBranchId))) {
        return String(userBranchId);
      }
      if (userBranchName) {
        const match = branches.find(
          (b) =>
            b.name?.toLowerCase().trim() === userBranchName.toLowerCase().trim() ||
            b.name?.toLowerCase().includes(userBranchName.toLowerCase().trim())
        );
        if (match) return String(match._id);
      }
    } catch (_) {}
    return String(branches[0]?._id || "");
  },
};

export const getDefaultBranchId = attendanceApi.getDefaultBranchId;
export default attendanceApi;
