import api from "../../../../shared/services/api";

// Temporary employee branch shifting (Admin only).
// Backend: /api/employees/:id/shifts, /api/employees/shifts, ...
export const branchShiftApi = {
  createShift: async (employeeId, data) => {
    const res = await api.post(`/employees/${employeeId}/shifts`, data);
    return res.data;
  },

  getShifts: async (params = {}) => {
    const res = await api.get("/employees/shifts", { params });
    return res.data;
  },

  getEmployeeShifts: async (employeeId, params = {}) => {
    const res = await api.get(`/employees/${employeeId}/shifts`, { params });
    return res.data;
  },

  cancelShift: async (shiftId, reason = "") => {
    const res = await api.post(`/employees/shifts/${shiftId}/cancel`, { reason });
    return res.data;
  },

  endShiftEarly: async (shiftId, effectiveDate) => {
    const res = await api.post(`/employees/shifts/${shiftId}/end-early`, { effectiveDate });
    return res.data;
  },

  // Server-side employee search for the picker (name, code, email or mobile).
  searchActiveEmployees: async (query = "", limit = 20) => {
    try {
      const res = await api.get("/employees", {
        params: { status: "ACTIVE", search: query || undefined, limit, page: 1 },
      });
      const body = res.data?.data || res.data || {};
      return body.items || body.employees || (Array.isArray(body) ? body : []);
    } catch {
      return [];
    }
  },
};

export default branchShiftApi;
