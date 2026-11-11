import api from "../../../shared/services/api";

const dayEndApi = {
  /**
   * Close the day for the logged-in manager's branch.
   * The server builds the day-end PDF and emails it to the admin.
   * Resolves with { sentTo, delivered, filename, businessDate, summary }.
   */
  closeDay: async () => {
    const res = await api.post("/day-end/close");
    return res.data?.data || res.data || {};
  },
};

export default dayEndApi;
