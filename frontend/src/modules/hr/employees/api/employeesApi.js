import api from "../../../../shared/services/api";

/**
 * Employees API.
 * An Employee is a person who works for the company. A User is a login. They are separate:
 * an employee can exist without a login, and a login is created from an employee.
 */

// Responses come wrapped in { success, data } and some lists are nested one level deeper
const pickArray = (raw, ...keys) => {
  if (Array.isArray(raw)) return raw;
  for (const key of keys) {
    if (Array.isArray(raw?.[key])) return raw[key];
    if (Array.isArray(raw?.data?.[key])) return raw.data[key];
  }
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== null && v !== undefined));

export const employeesApi = {
  /** One page of employees. Returns { employees, total, page, pages }. */
  list: async (params = {}) => {
    const res = await api.get("/employees", { params: clean(params) });
    const body = res.data?.data || res.data || {};
    return {
      employees: pickArray(body, "employees", "items"),
      total: Number(body.total) || 0,
      page: Number(body.page) || 1,
      pages: Number(body.pages) || 1,
    };
  },

  /** Every employee matching the filters (the endpoint serves at most 100 per page). */
  listAll: async (params = {}) => {
    const all = [];
    for (let page = 1; page <= 20; page += 1) {
      const result = await employeesApi.list({ ...params, page, limit: 100 });
      all.push(...result.employees);
      if (page >= result.pages || result.employees.length === 0) break;
    }
    return all;
  },

  getById: async (id) => {
    const res = await api.get(`/employees/${id}`);
    return res.data?.data || res.data;
  },

  create: async (payload) => {
    const res = await api.post("/employees", payload);
    return res.data?.data || res.data;
  },

  update: async (id, payload) => {
    const res = await api.patch(`/employees/${id}`, payload);
    return res.data?.data || res.data;
  },

  deactivate: async (id, { reason = "", leftCompany = false } = {}) => {
    const res = await api.post(`/employees/${id}/deactivate`, { reason, leftCompany });
    return res.data?.data || res.data;
  },

  /** Sets a new password on the employee's login. */
  resetPassword: async (id, password) => {
    const res = await api.post(`/employees/${id}/password`, { password });
    return res.data;
  },

  /**
   * Gives an existing employee a login. Email defaults to the employee's email and the
   * role and branch come from the employee, so only a password is needed.
   */
  createLogin: async ({ employeeId, email, password }) => {
    const res = await api.post("/users", { employeeId, email, password });
    return res.data?.data || res.data;
  },

  // ─── Lookups for the form and filters ─────────────────────────────────────
  // Each one returns [] on failure so a missing permission never breaks the screen.
  getBranches: async () => {
    try {
      const res = await api.get("/branches");
      return pickArray(res.data, "branches", "items");
    } catch {
      return [];
    }
  },

  /**
   * Roles an employee can be given: the "Employee Roles" list in Master Defaults.
   * Each has requiresLogin (false for operators). Admin-level roles are only returned to admins.
   * Shaped like the other lookups ({ _id, name }) so dropdowns can treat them alike.
   */
  getRoleOptions: async () => {
    try {
      const res = await api.get("/employees/roles");
      return pickArray(res.data, "roles", "items").map((r) => ({
        _id: r.roleId,
        id: r.roleId,
        code: r.code,
        name: r.name,
        requiresLogin: r.requiresLogin !== false,
      }));
    } catch {
      return [];
    }
  },

  /** Branch a non-admin user is limited to, or "" when any branch may be chosen. */
  getLockedBranchId: () => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      const role = String(u.role || localStorage.getItem("userRole") || "");
      if (role.toLowerCase() === "admin" || role.toUpperCase() === "SUPER_ADMIN") return "";
      return u.branchId?._id || u.branchId || "";
    } catch {
      return "";
    }
  },
};

export default employeesApi;
