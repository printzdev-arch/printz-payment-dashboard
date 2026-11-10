import api from "../../../shared/services/api";

// Reads the signed-in user from localStorage (same keys the rest of the app uses)
const readUser = () => {
  try {
    const raw = localStorage.getItem("user") || localStorage.getItem("printz_user");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const unwrapList = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.items)) return raw.items;
  return [];
};

export const saleOrderApi = {
  // ─── Orders ───────────────────────────────────────────────────────────────
  list: async (params = {}) => {
    const res = await api.get("/sale-orders", { params });
    return res.data; // { data: [...], meta: { total, page, limit, totalPages } }
  },

  count: async (params = {}) => {
    const res = await api.get("/sale-orders", { params: { ...params, page: 1, limit: 1 } });
    return Number(res.data?.meta?.total ?? res.data?.total ?? 0);
  },

  get: async (id) => {
    const res = await api.get(`/sale-orders/${id}`);
    return res.data?.data;
  },

  timeline: async (id) => {
    const res = await api.get(`/sale-orders/${id}/timeline`);
    return unwrapList(res.data);
  },

  create: async (body) => {
    const res = await api.post("/sale-orders", body);
    return res.data?.data;
  },

  update: async (id, body) => {
    const res = await api.patch(`/sale-orders/${id}`, body);
    return res.data?.data;
  },

  uploadReferenceFiles: async (id, files) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    const res = await api.post(`/sale-orders/${id}/reference-files`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data;
  },

  // Idempotency-Key makes a double click safe: the payment is only taken once
  place: async (id, body, idempotencyKey) => {
    const res = await api.post(`/sale-orders/${id}/place`, body, {
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    });
    return res.data?.data;
  },

  recordApproval: async (id, body) => {
    const res = await api.post(`/sale-orders/${id}/approval`, body);
    return res.data?.data;
  },

  receive: async (id, body) => {
    const res = await api.post(`/sale-orders/${id}/receive`, body);
    return res.data?.data;
  },

  // Idempotency-Key: the final payment is only taken once, even on a double click
  deliver: async (id, body, idempotencyKey) => {
    const res = await api.post(`/sale-orders/${id}/deliver`, body, {
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    });
    return res.data?.data;
  },

  cancel: async (id, body) => {
    const res = await api.post(`/sale-orders/${id}/cancel`, body);
    return res.data?.data;
  },

  lookupCustomer: async (mobile) => {
    const res = await api.get("/sale-orders/customer-lookup", { params: { mobile } });
    return res.data?.data;
  },

  // ─── Lookups ──────────────────────────────────────────────────────────────
  getBranches: async () => {
    try {
      const res = await api.get("/branches");
      return unwrapList(res.data);
    } catch {
      return [];
    }
  },

  // Branch staff are locked to their own branch; admins can pick any branch.
  getUserScope: () => {
    const u = readUser();
    const role = String(u.role || localStorage.getItem("userRole") || "").toLowerCase();
    const isAdmin = role === "admin" || role === "super_admin";
    const branchId = u.branchId?._id || u.branchId || "";
    return {
      role,
      isAdmin,
      userId: String(u._id || u.id || ""),
      branchId: isAdmin ? "" : String(branchId || ""),
      name: u.name || "",
    };
  },
};

export default saleOrderApi;
