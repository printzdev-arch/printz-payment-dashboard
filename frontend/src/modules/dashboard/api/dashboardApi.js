import api from "../../../shared/services/api";

export const dashboardApi = {
  /**
   * Fetch company-wide Admin dashboard
   */
  async getAdminDashboard(params = {}) {
    const response = await api.get("/dashboards/admin", { params });
    return response.data?.data || response.data;
  },

  /**
   * Fetch branch-scoped Manager dashboard
   */
  async getManagerDashboard(params = {}) {
    const response = await api.get("/dashboards/manager", { params });
    return response.data?.data || response.data;
  },

  /**
   * Fetch personal Designer dashboard
   */
  async getDesignerDashboard(params = {}) {
    const response = await api.get("/dashboards/designer", { params });
    return response.data?.data || response.data;
  },

  /**
   * Fetch list of available branches for the dropdown
   */
  async getBranches() {
    try {
      const response = await api.get("/branches");
      const list = response.data?.data || response.data || [];
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.warn("Notice loading branches:", err.message);
      return [];
    }
  },

  /**
   * Discover available dashboards for the logged-in user
   */
  async getAvailableDashboards() {
    const response = await api.get("/dashboards/me");
    return response.data?.data || response.data;
  },
};

export const dashboardService = dashboardApi;
export default dashboardApi;

