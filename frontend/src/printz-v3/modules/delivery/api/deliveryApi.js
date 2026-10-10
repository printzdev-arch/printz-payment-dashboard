/**
 * PrintZ V3 - Module 09 Delivery & Handover API (Step 6 & 7)
 * Aligned with backend /delivery-orders lifecycle endpoints:
 * pack -> dispatch -> deliver
 */
import api from "../../../../services/api";

export const getDeliveryOrders = async (params = {}) => {
  try {
    const res = await api.get("/delivery-orders", { params });
    const data = res.data?.data || res.data || [];
    return Array.isArray(data) ? data : (data.orders || []);
  } catch (err) {
    console.error("Failed to fetch delivery orders:", err);
    return [];
  }
};

export const getDeliveryOrderById = async (orderId) => {
  try {
    const res = await api.get(`/delivery-orders/${orderId}`);
    return res.data?.data || res.data?.order || res.data;
  } catch (err) {
    console.error(`Failed to fetch delivery order ${orderId}:`, err);
    throw err;
  }
};

export const packDeliveryOrder = async (orderId, data = {}) => {
  try {
    const res = await api.post(`/delivery-orders/${orderId}/pack`, data);
    return res.data?.data || res.data;
  } catch (err) {
    console.error(`Failed to pack delivery order ${orderId}:`, err);
    throw err;
  }
};

export const dispatchDeliveryOrder = async (orderId, data = {}) => {
  try {
    const res = await api.post(`/delivery-orders/${orderId}/dispatch`, data);
    return res.data?.data || res.data;
  } catch (err) {
    console.error(`Failed to dispatch delivery order ${orderId}:`, err);
    throw err;
  }
};

export const deliverOrder = async (orderId, handoverData = {}) => {
  try {
    const res = await api.post(`/delivery-orders/${orderId}/deliver`, handoverData);
    return res.data?.data || res.data;
  } catch (err) {
    console.error(`Failed to mark delivery order ${orderId} as delivered:`, err);
    throw err;
  }
};

export const updateDeliveryStatus = async (orderId, statusData) => {
  try {
    const res = await api.patch(`/delivery-orders/${orderId}`, statusData);
    return res.data?.data || res.data;
  } catch (err) {
    console.error("Failed to update delivery status:", err);
    throw err;
  }
};

export default {
  getDeliveryOrders,
  getDeliveryOrderById,
  packDeliveryOrder,
  dispatchDeliveryOrder,
  deliverOrder,
  updateDeliveryStatus,
};
