import api from "../../../../shared/services/api";

export const masterSettingsApi = {
  getAllSettings: async () => {
    const res = await api.get("/master-settings");
    return res.data;
  },

  getCategory: async (category) => {
    const res = await api.get(`/master-settings/${category}`);
    return res.data;
  },

  addItem: async (category, itemData) => {
    const res = await api.post(`/master-settings/${category}/items`, itemData);
    return res.data;
  },

  updateItem: async (category, itemId, itemData) => {
    const res = await api.put(`/master-settings/${category}/items/${itemId}`, itemData);
    return res.data;
  },

  deleteItem: async (category, itemId) => {
    const res = await api.delete(`/master-settings/${category}/items/${itemId}`);
    return res.data;
  },

  resetCategory: async (category) => {
    const res = await api.post(`/master-settings/${category}/reset`);
    return res.data;
  },

  resetAll: async () => {
    const res = await api.post("/master-settings/reset-all");
    return res.data;
  },
};

export default masterSettingsApi;
