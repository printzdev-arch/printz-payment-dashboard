import api from "../../../shared/services/api";

const unwrapList = (raw) => (Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.items) ? raw.items : []);

// Manufacturing unit calls. Order list/detail/approval reuse the shared sale-order API.
export const mfgApi = {
  dashboard: async () => {
    const res = await api.get("/mfg/dashboard");
    return res.data?.data;
  },

  queue: async () => {
    const res = await api.get("/mfg/queue");
    return unwrapList(res.data);
  },

  // Take an order from the queue; it moves straight into design
  take: async (orderId) => {
    const res = await api.post(`/sale-orders/${orderId}/take`);
    return res.data?.data;
  },

  uploadDesign: async (orderId, { preview, printFile, designerNotes }) => {
    const form = new FormData();
    form.append("preview", preview);
    if (printFile) form.append("printFile", printFile);
    if (designerNotes) form.append("designerNotes", designerNotes);
    const res = await api.post(`/sale-orders/${orderId}/designs`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    });
    return res.data?.data;
  },

  sendDesign: async (orderId, versionNo) => {
    const res = await api.post(`/sale-orders/${orderId}/designs/${versionNo}/send`);
    return res.data?.data;
  },

  startPrint: async (orderId) => {
    const res = await api.post(`/sale-orders/${orderId}/print/start`);
    return res.data?.data;
  },

  finishPrint: async (orderId, body) => {
    const res = await api.post(`/sale-orders/${orderId}/print/finish`, body);
    return res.data?.data;
  },

  dispatch: async (orderId, body) => {
    const res = await api.post(`/sale-orders/${orderId}/dispatch`, body);
    return res.data?.data;
  },

  // The print file needs the login token, so it is fetched and saved rather than opened as a plain link
  downloadPrintFile: async (orderId, versionNo) => {
    const res = await api.get(`/sale-orders/${orderId}/designs/${versionNo}/print-file`, { responseType: "blob" });
    const disposition = res.headers?.["content-disposition"] || "";
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = match ? decodeURIComponent(match[1]) : `order-${orderId}-v${versionNo}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

export default mfgApi;
