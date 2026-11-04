import React, { useState, useEffect } from "react";
import {
  X,
  Truck,
  CheckCircle,
  ShieldCheck,
  User,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Search,
  Lock,
  Package,
  CreditCard,
  Building,
} from "lucide-react";
import { toast } from "react-toastify";
import deliveryApi from "../api/deliveryApi";

export const CreateDeliveryOrderModal = ({ isOpen, onClose, job, onCreated, readOnly = false }) => {
  const isReadOnly = Boolean(readOnly || job?.readOnly);

  const [deliveryType, setDeliveryType] = useState("DELIVERY");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPersonName, setDeliveryPersonName] = useState("");
  const [deliveryPersonPhone, setDeliveryPersonPhone] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [instructions, setInstructions] = useState("Call customer before arrival");
  const [managerNotes, setManagerNotes] = useState("Quality check passed, approved for delivery");
  const [loading, setLoading] = useState(false);

  // Employee Staff Selection
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employeeFilterText, setEmployeeFilterText] = useState("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDeliveryStaff();
    }
  }, [isOpen]);

  const fetchDeliveryStaff = async () => {
    try {
      setLoadingEmployees(true);
      const res = await deliveryApi.getDeliveryStaff();
      const list = res?.data?.items || res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(list) && list.length > 0) {
        setEmployees(list);
      } else {
        setEmployees([
          { _id: "6ac74652f1faee851df1867e", name: "Priya Raman", employeeCode: "EMP-00002", mobile: "9876543210", role: "Driver / Staff" },
          { _id: "6ad0815a10a682720d97ad2e", name: "Vasu", employeeCode: "EMP-00006", mobile: "9876543210", role: "Delivery Rider" },
          { _id: "6ad09ec5a181c621aef0170a", name: "Guna", employeeCode: "EMP-00007", mobile: "9876548574", role: "Senior Dispatcher" },
        ]);
      }
    } catch (err) {
      console.warn("Could not load employee staff list:", err);
      setEmployees([
        { _id: "6ac74652f1faee851df1867e", name: "Priya Raman", employeeCode: "EMP-00002", mobile: "9876543210", role: "Driver / Staff" },
        { _id: "6ad0815a10a682720d97ad2e", name: "Vasu", employeeCode: "EMP-00006", mobile: "9876543210", role: "Delivery Rider" },
        { _id: "6ad09ec5a181c621aef0170a", name: "Guna", employeeCode: "EMP-00007", mobile: "9876548574", role: "Senior Dispatcher" },
      ]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    if (job) {
      const snap = job.customerSnapshot || job.customer || {};
      const doObj = job.deliveryOrder || {};

      setCustomerName(doObj.customerName || job.customerName || snap.name || "");
      setCustomerPhone(doObj.customerPhone || job.customerPhone || snap.mobile || snap.phone || "");
      setDeliveryAddress(
        doObj.deliveryAddress ||
        job.deliveryAddress ||
        snap.address ||
        (job.deliveryType === "COUNTER_PICKUP" ? "Counter Pickup - Main Branch" : "")
      );

      // The type follows the delivery method chosen on the job order; it is not picked here.
      const dType = doObj.deliveryType || job.deliveryType || "DELIVERY";
      setDeliveryType(dType === "COUNTER_PICKUP" ? "COUNTER_PICKUP" : "DELIVERY");

      if (doObj.expectedDeliveryDate) {
        setExpectedDeliveryDate(new Date(doObj.expectedDeliveryDate).toISOString().slice(0, 16));
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(14, 0, 0, 0);
        setExpectedDeliveryDate(tomorrow.toISOString().slice(0, 16));
      }

      setInstructions(doObj.instructions || "Call customer before arrival");
      setDeliveryPersonName(doObj.deliveryPersonName || doObj.driverName || "");
      setDeliveryPersonPhone(doObj.deliveryPersonPhone || doObj.driverPhone || "");
      setVehicle(doObj.vehicleNumber || doObj.vehicle || "");
      setManagerNotes(doObj.reviewNotes || doObj.managerNotes || "Quality check passed, approved for delivery");

      const empId = doObj.assignedEmployeeId?._id || doObj.assignedEmployeeId || "";
      setSelectedEmployeeId(empId ? String(empId) : "");
    }
  }, [job, isReadOnly]);

  if (!isOpen || !job) return null;

  const handleEmployeeSelect = (empId) => {
    setSelectedEmployeeId(empId);
    if (!empId || empId === "CUSTOM") {
      return;
    }
    const emp = employees.find((e) => String(e._id || e.id) === String(empId));
    if (emp) {
      setDeliveryPersonName(emp.name || "");
      setDeliveryPersonPhone(emp.mobile || emp.phone || "");
    }
  };

  const filteredEmployees = employees.filter((e) => {
    if (!employeeFilterText.trim()) return true;
    const term = employeeFilterText.toLowerCase();
    return (
      (e.name && e.name.toLowerCase().includes(term)) ||
      (e.employeeCode && e.employeeCode.toLowerCase().includes(term)) ||
      (e.mobile && e.mobile.includes(term))
    );
  });

  const handleCreateOrder = async (e) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!customerPhone.trim()) {
      toast.error("Customer contact phone is required");
      return;
    }
    if (!isPickup && !deliveryPersonName.trim()) {
      toast.error("Staff selection is compulsory! Please select or enter a delivery staff member.");
      return;
    }

    setLoading(true);
    try {
      // Auto-record manager quality review approval
      try {
        await deliveryApi.reviewJob(job._id || job.id, { notes: managerNotes });
      } catch {}

      const items = (job.items || []).map((it) => ({
        jobItemId: it._id || it.id || job._id,
        itemName: it.itemName || it.title || job.title || "Print Material",
        quantity: Number(it.quantity || job.quantity || 1),
        unit: it.unit || "pcs",
      }));

      if (items.length === 0) {
        items.push({
          jobItemId: job._id || job.id,
          itemName: job.title || job.productType || "Print Job Order",
          quantity: Number(job.quantity || 500),
          unit: "pcs",
        });
      }

      const payload = {
        jobOrderId: job._id || job.id,
        deliveryType,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: isPickup ? "" : deliveryAddress.trim(),
        deliveryPersonName: isPickup ? "" : deliveryPersonName.trim(),
        deliveryPersonPhone: isPickup ? "" : deliveryPersonPhone.trim(),
        vehicle: isPickup ? "" : vehicle.trim(),
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate).toISOString() : new Date().toISOString(),
        instructions: instructions.trim(),
        managerNotes: managerNotes.trim(),
        items,
      };

      if (!isPickup && selectedEmployeeId && selectedEmployeeId !== "CUSTOM" && /^[0-9a-fA-F]{24}$/.test(selectedEmployeeId)) {
        payload.assignedEmployeeId = selectedEmployeeId;
      }

      const res = await deliveryApi.createDeliveryOrder(payload);
      const createdDO = res?.data || res;
      toast.success(`Delivery Order ${createdDO.deliveryNo || "DO"} generated & staff assigned!`);
      if (onCreated) onCreated(createdDO);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create delivery order");
    } finally {
      setLoading(false);
    }
  };

  const deliveryOrderNo = job.deliveryOrder?.deliveryNo || job.deliveryNo;
  const balanceDue = Number(job.balanceDue !== undefined ? job.balanceDue : (job.grandTotal ? Math.max(0, job.grandTotal - (job.advancePaid || 0)) : 0));
  const isPickup = deliveryType === "COUNTER_PICKUP";
  // A counter pickup is collected by the customer, so only a dispatch needs a delivery person.
  const isStaffValid = isPickup || Boolean(deliveryPersonName.trim());

  return (
    <div
      className="jf-modal-overlay dlv-modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 99999,
        padding: "1rem",
        boxSizing: "border-box",
      }}
    >
      <div
        className="jf-modal jf-modal-lg dlv-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "800px",
          width: "95%",
          maxHeight: "92vh",
          margin: "auto",
          display: "flex",
          flexDirection: "column",
          borderRadius: "16px",
          overflow: "hidden",
          background: "#ffffff",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.15rem 1.5rem",
            background: "linear-gradient(135deg, #064e3b 0%, #047857 100%)",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Truck size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
                  {isReadOnly ? "View Delivery Order" : (job?.deliveryOrder ? "Assign Delivery Staff" : "Create Delivery Order (DO)")}
                </h3>
                {deliveryOrderNo && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      background: "rgba(255, 255, 255, 0.2)",
                      color: "#a7f3d0",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "9999px",
                      fontWeight: 700,
                    }}
                  >
                    {deliveryOrderNo}
                  </span>
                )}
                {isReadOnly && (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      background: "rgba(255, 255, 255, 0.2)",
                      color: "#ffffff",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "9999px",
                    }}
                  >
                    <Lock size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                    Read Only
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: "0.82rem", opacity: 0.9 }}>
                Job Order: <strong style={{ color: "#a7f3d0" }}>{job.jobNo}</strong> &bull; Customer: <strong>{job.customerName || customerName || "Customer"}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "none",
              color: "#ffffff",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreateOrder} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
            
            {/* QC Release Banner */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: "10px",
                padding: "0.75rem 1rem",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ShieldCheck size={20} color="#059669" />
                <div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#065f46" }}>
                    QC Verification Passed & Approved for Dispatch
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#047857" }}>
                    Production complete • Ready for staff assignment and customer delivery
                  </div>
                </div>
              </div>
              {balanceDue > 0 ? (
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    padding: "0.25rem 0.65rem",
                    borderRadius: "9999px",
                    background: "#fef2f2",
                    color: "#dc2626",
                    border: "1px solid #fecaca",
                  }}
                >
                  Balance Due: ₹{balanceDue.toFixed(2)}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    padding: "0.25rem 0.65rem",
                    borderRadius: "9999px",
                    background: "#d1fae5",
                    color: "#065f46",
                  }}
                >
                  ✓ 100% Fully Paid
                </span>
              )}
            </div>

            {/* Grid 1: Delivery Mode & Schedule */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="jf-form-group">
                <label className="jf-label jf-label-required" style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
                  Delivery Method *
                </label>
                <input
                  type="text"
                  className="jf-input"
                  readOnly
                  disabled
                  value={isPickup ? "Branch Counter Self-Pickup" : "Local Dispatch / Delivery"}
                  title="Set by the customer's delivery method on the job order"
                  style={{ height: "40px", fontWeight: 600 }}
                />
                <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 4 }}>
                  Chosen on the job order{job.deliveryMethod ? ` (${job.deliveryMethod})` : ""} - cannot be changed here.
                </div>
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required" style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
                  Expected Delivery Date & Time *
                </label>
                <input
                  type="datetime-local"
                  className="jf-input"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  disabled={isReadOnly}
                  required
                  style={{ height: "40px" }}
                />
              </div>
            </div>

            {/* Grid 2: Customer Contact & Address */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="jf-form-group">
                <label className="jf-label jf-label-required" style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
                  Recipient Name *
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className="jf-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    disabled={isReadOnly}
                    required
                    style={{ height: "40px", paddingRight: "35px" }}
                  />
                  <User size={16} style={{ position: "absolute", right: 12, top: 12, color: "#94a3b8" }} />
                </div>
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required" style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
                  Contact Mobile *
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className="jf-input"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    disabled={isReadOnly}
                    required
                    style={{ height: "40px", paddingRight: "35px" }}
                  />
                  <Phone size={16} style={{ position: "absolute", right: 12, top: 12, color: "#94a3b8" }} />
                </div>
              </div>
            </div>

            {/* Delivery Address (Hidden if Counter Pickup) */}
            {deliveryType !== "COUNTER_PICKUP" && (
              <div className="jf-form-group">
                <label className="jf-label jf-label-required" style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
                  Delivery Destination Address *
                </label>
                <div style={{ position: "relative" }}>
                  <textarea
                    className="jf-textarea"
                    rows={2}
                    placeholder="Complete building, street, landmark & PIN code"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    disabled={isReadOnly}
                    required={deliveryType !== "COUNTER_PICKUP"}
                    style={{ paddingRight: "35px", resize: "none" }}
                  />
                  <MapPin size={16} style={{ position: "absolute", right: 12, top: 12, color: "#94a3b8" }} />
                </div>
              </div>
            )}

            {/* ── Staff Assignment Card (dispatch only) ── */}
            {!isPickup && (
            <div
              style={{
                background: isStaffValid ? "#f0fdf4" : "#fff1f2",
                border: `1.5px solid ${isStaffValid ? "#86efac" : "#fca5a5"}`,
                borderRadius: "12px",
                padding: "1rem 1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <User size={18} color={isStaffValid ? "#059669" : "#dc2626"} />
                  <strong style={{ fontSize: "0.9rem", color: isStaffValid ? "#065f46" : "#991b1b" }}>
                    Assign Delivery Staff Member <span style={{ color: "#dc2626" }}>*</span>
                  </strong>
                </div>

                {isStaffValid ? (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      background: "#059669",
                      color: "#ffffff",
                      padding: "0.2rem 0.65rem",
                      borderRadius: "9999px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    <CheckCircle size={12} /> Staff Assigned
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      background: "#fee2e2",
                      color: "#b91c1c",
                      padding: "0.2rem 0.65rem",
                      borderRadius: "9999px",
                    }}
                  >
                    Required to Generate DO *
                  </span>
                )}
              </div>

              {/* Staff Select Box */}
              <div style={{ display: "grid", gridTemplateColumns: isReadOnly ? "1fr" : "1.1fr 1fr", gap: "0.6rem" }}>
                <select
                  className="jf-select"
                  value={selectedEmployeeId}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                  disabled={isReadOnly}
                  style={{
                    height: "40px",
                    fontWeight: 600,
                    borderColor: isStaffValid ? "#86efac" : "#f87171",
                  }}
                  required
                >
                  <option value="">-- Choose Staff Member (Compulsory) --</option>
                  {filteredEmployees.map((emp) => (
                    <option key={emp._id || emp.id} value={emp._id || emp.id}>
                      {emp.name} ({emp.employeeCode || "EMP"}) • {emp.mobile || "N/A"}
                    </option>
                  ))}
                  <option value="CUSTOM">-- Manual / External Staff --</option>
                </select>

                {!isReadOnly && (
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      className="jf-input"
                      placeholder="Filter by name or code..."
                      value={employeeFilterText}
                      onChange={(e) => setEmployeeFilterText(e.target.value)}
                      disabled={isReadOnly}
                      style={{ height: "40px", paddingLeft: "32px", fontSize: "0.85rem" }}
                    />
                    <Search size={14} style={{ position: "absolute", left: 10, top: 13, color: "#94a3b8" }} />
                  </div>
                )}
              </div>

              {/* 3 Inline Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "3px" }}>
                    Staff Name *
                  </label>
                  <input
                    type="text"
                    className="jf-input"
                    placeholder="e.g. Ramesh"
                    value={deliveryPersonName}
                    onChange={(e) => setDeliveryPersonName(e.target.value)}
                    disabled={isReadOnly}
                    required
                    style={{ height: "36px", fontSize: "0.83rem", borderColor: isStaffValid ? "#cbd5e1" : "#f87171" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "3px" }}>
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    className="jf-input"
                    placeholder="e.g. 9876500000"
                    value={deliveryPersonPhone}
                    onChange={(e) => setDeliveryPersonPhone(e.target.value)}
                    disabled={isReadOnly}
                    style={{ height: "36px", fontSize: "0.83rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "3px" }}>
                    Vehicle / Desk Info
                  </label>
                  <input
                    type="text"
                    className="jf-input"
                    placeholder="e.g. TN 01 AB 1234 / Desk 1"
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    disabled={isReadOnly}
                    style={{ height: "36px", fontSize: "0.83rem" }}
                  />
                </div>
              </div>
            </div>
            )}

            {isPickup && (
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "0.75rem 1rem", fontSize: "0.85rem", color: "#1e40af" }}>
                Counter pickup: no delivery person or address is needed. Pack the order, then hand it over to the customer at the branch counter once the balance is settled.
              </div>
            )}

            {/* Special Instructions & Items in Compact Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1rem" }}>
              <div className="jf-form-group">
                <label className="jf-label" style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>
                  Delivery Instructions
                </label>
                <input
                  type="text"
                  className="jf-input"
                  placeholder="e.g. Call before arrival, handover at reception"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  disabled={isReadOnly}
                  style={{ height: "38px", fontSize: "0.85rem" }}
                />
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "0.6rem 0.85rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  Items Ready for Dispatch
                </div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a", marginTop: "2px" }}>
                  {job.title || job.productType || "Print Order"} — <strong>{job.quantity || 500}</strong> pcs
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "1rem 1.5rem",
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: isReadOnly ? "flex-end" : "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            {isReadOnly ? (
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                onClick={onClose}
                style={{ padding: "0.55rem 1.5rem" }}
              >
                Close
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary"
                  onClick={onClose}
                  disabled={loading}
                  style={{ padding: "0.55rem 1.25rem" }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="jf-btn jf-btn-primary"
                  disabled={loading || !isStaffValid}
                  style={{
                    background: isStaffValid ? "#059669" : "#94a3b8",
                    borderColor: isStaffValid ? "#059669" : "#94a3b8",
                    cursor: isStaffValid ? "pointer" : "not-allowed",
                    fontWeight: 700,
                    padding: "0.6rem 1.5rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    boxShadow: isStaffValid ? "0 4px 12px rgba(5, 150, 105, 0.25)" : "none",
                  }}
                  title={isStaffValid ? "Generate Delivery Order & move to Assigned" : "Select a staff member above to proceed"}
                >
                  {loading ? (
                    "Generating DO..."
                  ) : isStaffValid ? (
                    <>
                      <Truck size={16} /> {isPickup ? "Generate Pickup Order" : "Generate Delivery Order & Assign"}
                    </>
                  ) : (
                    "Assign Staff to Generate DO"
                  )}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDeliveryOrderModal;
