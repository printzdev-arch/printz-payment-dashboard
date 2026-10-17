import api from "../../../../services/api";

export const posApi = {
  // ── Sale Receipts Management ──
  getSaleReceipts: async (params = {}) => {
    const res = await api.get("/sale-receipts", { params });
    return res.data;
  },

  getReceiptById: async (id) => {
    const res = await api.get(`/sale-receipts/${id}`);
    return res.data;
  },

  calculateTotals: async (items) => {
    const res = await api.post("/sale-receipts/calculate", { items });
    return res.data;
  },

  checkout: async (payload) => {
    const res = await api.post("/sale-receipts/checkout", payload);
    return res.data;
  },

  createDraft: async (payload) => {
    const res = await api.post("/sale-receipts", payload);
    return res.data;
  },

  completeSale: async (id, payload = {}) => {
    const res = await api.post(`/sale-receipts/${id}/complete`, payload);
    return res.data;
  },

  voidSale: async (id, reason) => {
    const res = await api.post(`/sale-receipts/${id}/void`, { reason });
    return res.data;
  },

  recordPayment: async (id, paymentData) => {
    const res = await api.post(`/sale-receipts/${id}/payments`, paymentData);
    return res.data;
  },

  getPrintReceipt: async (id, format = "thermal") => {
    const res = await api.get(`/sale-receipts/${id}/print`, { params: { format } });
    return res.data;
  },

  shareReceipt: async (id, channels = { whatsapp: true }) => {
    const res = await api.post(`/sale-receipts/${id}/share`, channels);
    return res.data;
  },

  // ── Supporting Data (Inventory Items, Stocks & Customers) ──
  getInventoryItems: async (params = {}) => {
    try {
      const res = await api.get("/inventory/items", { params: { limit: 100, ...params } });
      return res.data?.records || res.data?.items || res.data?.data || res.data || [];
    } catch (_) {
      try {
        const res2 = await api.get("/inventory-items", { params: { limit: 100, ...params } });
        return res2.data?.records || res2.data?.items || res2.data?.data || res2.data || [];
      } catch (err) {
        return [];
      }
    }
  },

  getStockItems: async (params = {}) => {
    try {
      const res = await api.get("/stocks/items", { params });
      return res.data?.data || res.data?.items || res.data?.records || (Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn("Failed to fetch stocks items:", err.message);
      return [];
    }
  },

  getUnifiedCatalog: async (params = {}) => {
    try {
      const [invItems, stockItems] = await Promise.all([
        posApi.getInventoryItems(params).catch(() => []),
        posApi.getStockItems(params).catch(() => []),
      ]);

      const normalizedInv = (invItems || []).map((it) => ({
        _id: it._id,
        name: it.name || it.itemName || "Item",
        itemCode: it.itemCode || it.code || "INV",
        saleRate: Number(it.saleRate || it.price || 0),
        taxRate: Number(it.taxRate || 0),
        unit: it.unit || "PCS",
        category: it.category || "Inventory",
        currentStock: Number(it.currentStock !== undefined ? it.currentStock : it.availableQuantity || 999),
        source: "INVENTORY",
        isStockTracked: it.isStockTracked !== false,
      }));

      const normalizedStocks = (stockItems || []).map((st) => ({
        _id: st._id,
        name: st.itemName || st.name || "Stock Item",
        itemCode: st.stockId || st.itemCode || "STOCK",
        saleRate: Number(st.rate || st.unitPrice || st.amount || 0),
        taxRate: Number(st.taxRate || 0),
        unit: st.unit || "PCS",
        category: st.category || "Stocks",
        currentStock: Number(st.currentStock !== undefined ? st.currentStock : (st.quantity || st.qty || 0)),
        source: "STOCK",
        isStockTracked: true,
      }));

      // Combine both lists, avoiding duplicate IDs if any
      const seen = new Set();
      const combined = [];
      for (const item of [...normalizedStocks, ...normalizedInv]) {
        if (!seen.has(String(item._id))) {
          seen.add(String(item._id));
          combined.push(item);
        }
      }
      return combined;
    } catch (err) {
      console.error("Unified catalog error:", err);
      return [];
    }
  },

  createCustomer: async (customerData) => {
    const res = await api.post("/customers", customerData);
    return res.data?.data || res.data?.customer || res.data;
  },

  getCustomers: async (q = "") => {
    try {
      const res = await api.get("/customers", { params: { q, limit: 50 } });
      return res.data?.items || res.data?.data || (Array.isArray(res.data) ? res.data : []);
    } catch (_) {
      return [];
    }
  },

  getBranches: async () => {
    try {
      const res = await api.get("/branches");
      return res.data?.data || res.data?.items || res.data || [];
    } catch (_) {
      return [];
    }
  },
};

export default posApi;
