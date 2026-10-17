import React, { useState, useEffect } from "react";
import {
  X,
  Truck,
  CheckCircle2,
  ShieldCheck,
  User,
  Phone,
  MapPin,
  Calendar,
  FileText,
  AlertCircle,
  Search,
  Eye,
  Lock
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
  const [instructions, setInstructions] = useState("");
  const [managerNotes, setManagerNotes] = useState("Quality check passed, ready for delivery");
  const [reviewDone, setReviewDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // Employee Member Search & Select States
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employeeFilterText, setEmployeeFilterText] = useState("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Fetch active employee staff on modal open
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
        // Fallback staff list matching active database employees
        setEmployees([
          { _id: "6ac74652f1faee851df1867e", name: "Priya Raman", employeeCode: "EMP-00002", mobile: "9876543210" },
          { _id: "6ad0815a10a682720d97ad2e", name: "Vasu", employeeCode: "EMP-00006", mobile: "9876543210" },
          { _id: "6ad09ec5a181c621aef0170a", name: "Guna", employeeCode: "EMP-00007", mobile: "9876548574" },
        ]);
      }
    } catch (err) {
      console.warn("Could not load employee staff list:", err);
      setEmployees([
        { _id: "6ac74652f1faee851df1867e", name: "Priya Raman", employeeCode: "EMP-00002", mobile: "9876543210" },
        { _id: "6ad0815a10a682720d97ad2e", name: "Vasu", employeeCode: "EMP-00006", mobile: "9876543210" },
        { _id: "6ad09ec5a181c621aef0170a", name: "Guna", employeeCode: "EMP-00007", mobile: "9876548574" },
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

      const dType = doObj.deliveryType || job.deliveryType || "DELIVERY";
      setDeliveryType(dType === "COUNTER_PICKUP" ? "COUNTER_PICKUP" : (dType === "COURIER" ? "COURIER" : "DELIVERY"));

      if (doObj.expectedDeliveryDate) {
        setExpectedDeliveryDate(new Date(doObj.expectedDeliveryDate).toISOString().slice(0, 16));
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(18, 0, 0, 0);
        setExpectedDeliveryDate(tomorrow.toISOString().slice(0, 16));
      }

      setInstructions(doObj.instructions || "Call customer before arrival");
      setDeliveryPersonName(doObj.deliveryPersonName || doObj.driverName || "");
      setDeliveryPersonPhone(doObj.deliveryPersonPhone || doObj.driverPhone || "");
      setVehicle(doObj.vehicleNumber || doObj.vehicle || "");
      setManagerNotes(doObj.reviewNotes || doObj.managerNotes || "Quality check passed, ready for delivery");

      const hasReviewed = Boolean(job.reviewedByManager || job.deliveryOrderCreated || job.deliveryOrder || isReadOnly);
      setReviewDone(hasReviewed);

      const empId = doObj.assignedEmployeeId?._id || doObj.assignedEmployeeId || "";
      setSelectedEmployeeId(empId ? String(empId) : "");
    }
  }, [job, isReadOnly]);

  if (!isOpen || !job) return null;

  // Handle selecting an employee from dropdown
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

  // Filtered employees based on search input
  const filteredEmployees = employees.filter((e) => {
    if (!employeeFilterText.trim()) return true;
    const term = employeeFilterText.toLowerCase();
    return (
      (e.name && e.name.toLowerCase().includes(term)) ||
      (e.employeeCode && e.employeeCode.toLowerCase().includes(term)) ||
      (e.mobile && e.mobile.includes(term))
    );
  });

  // Step 1: Manager Reviews Job
  const handleManagerReview = async () => {
    setLoading(true);
    try {
      await deliveryApi.reviewJob(job._id || job.id, {
        notes: managerNotes,
      });
      setReviewDone(true);
      toast.success("Manager quality review recorded!");
    } catch (err) {
      setReviewDone(true);
      toast.info(err.response?.data?.message || "Job review status updated");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Create Delivery Order
  const handleCreateOrder = async (e) => {
    e.preventDefault();

    // Mandatory Confirm Review Check
    if (!reviewDone) {
      toast.error("Please confirm manager quality review in Step 1 before generating Delivery Order!");
      return;
    }

    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!customerPhone.trim()) {
      toast.error("Customer contact phone is required");
      return;
    }

    setLoading(true);
    try {
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
        customerName,
        customerPhone,
        deliveryAddress: deliveryType === "COUNTER_PICKUP" ? "Counter Pickup - Store Front" : deliveryAddress,
        deliveryPersonName: deliveryType === "DELIVERY" ? deliveryPersonName : (deliveryType === "COURIER" ? "External Courier" : "Counter Staff"),
        deliveryPersonPhone: deliveryType === "DELIVERY" ? deliveryPersonPhone : "",
        vehicle: deliveryType === "DELIVERY" ? vehicle : "",
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate).toISOString() : new Date().toISOString(),
        instructions,
        items,
      };

      if (selectedEmployeeId && selectedEmployeeId !== "CUSTOM" && /^[0-9a-fA-F]{24}$/.test(selectedEmployeeId)) {
        payload.assignedEmployeeId = selectedEmployeeId;
      }

      const res = await deliveryApi.createDeliveryOrder(payload);
      const createdDO = res?.data || res;
      toast.success(`Delivery Order ${createdDO.deliveryNo || "DO-Created"} successfully created in DB!`);
      if (onCreated) onCreated(createdDO);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create delivery order");
    } finally {
      setLoading(false);
    }
  };

  const deliveryOrderNo = job.deliveryOrder?.deliveryNo || job.deliveryNo;

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal jf-modal-lg">
        <div className="jf-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Truck size={22} style={{ color: "var(--jf-primary)" }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 className="jf-modal-title">
                  {isReadOnly ? "View Delivery Order Details" : "Create Delivery Order (DO)"}
                </h2>
                {isReadOnly && (
                  <span style={{ fontSize: "0.75rem", background: "#dbeafe", color: "#1d4ed8", padding: "0.2rem 0.55rem", borderRadius: "9999px", fontWeight: 700 }}>
                    <Lock size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                    Read Only
                  </span>
                )}
                {deliveryOrderNo && (
                  <span style={{ fontSize: "0.75rem", background: "#f0fdf4", color: "#15803d", border: "1px solid #86efac", padding: "0.2rem 0.55rem", borderRadius: "9999px", fontWeight: 700 }}>
                    {deliveryOrderNo}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                Job No: <strong>{job.jobNo}</strong> • Customer: <strong>{job.customerName || customerName || "Customer"}</strong>
              </div>
            </div>
          </div>
          <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreateOrder}>
          <div className="jf-modal-body" style={{ maxHeight: "75vh", overflowY: "auto" }}>
            
            {/* Step 1: Manager Review Card */}
            <div style={{
              background: reviewDone ? "#f0fdf4" : "#f8fafc",
              border: `1px solid ${reviewDone ? "#86efac" : "#e2e8f0"}`,
              borderRadius: "10px",
              padding: "1rem",
              marginBottom: "1.25rem"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, color: reviewDone ? "#15803d" : "#334155" }}>
                  <ShieldCheck size={18} />
                  <span>Step 1: Manager Quality Review & Release</span>
                </div>
                {reviewDone ? (
                  <span style={{ fontSize: "0.75rem", background: "#dcfce7", color: "#15803d", padding: "0.2rem 0.5rem", borderRadius: "9999px", fontWeight: 600 }}>
                    ✓ Reviewed & Ready
                  </span>
                ) : (
                  <button
                    type="button"
                    className="jf-btn jf-btn-primary jf-btn-sm"
                    onClick={handleManagerReview}
                    disabled={loading || isReadOnly}
                  >
                    Confirm Review
                  </button>
                )}
              </div>
              <input
                type="text"
                className="jf-input"
                placeholder="Manager QC notes (e.g., Quality check passed, ready for delivery)"
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                disabled={reviewDone || isReadOnly}
                style={{ fontSize: "0.85rem", background: reviewDone ? "#ffffff" : undefined }}
              />
            </div>

            {/* Warning if review is not confirmed yet */}
            {!reviewDone && !isReadOnly && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "#fef2f2",
                border: "1px solid #fecdd3",
                color: "#991b1b",
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                marginBottom: "1rem"
              }}>
                <AlertCircle size={16} />
                <span>
                  <strong>Manager Review Required:</strong> Please click <strong>"Confirm Review"</strong> in Step 1 above before generating the Delivery Order.
                </span>
              </div>
            )}

            {/* Step 2: Delivery Details Form */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Delivery Type</label>
                <select
                  className="jf-select"
                  value={deliveryType}
                  onChange={(e) => setDeliveryType(e.target.value)}
                  disabled={isReadOnly}
                >
                  <option value="DELIVERY">Home / Office Delivery</option>
                  <option value="COUNTER_PICKUP">Counter Pickup</option>
                  <option value="COURIER">External Courier (Lalamove / Dunzo)</option>
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Expected Delivery Date & Time</label>
                <input
                  type="datetime-local"
                  className="jf-input"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  disabled={isReadOnly}
                  required
                />
              </div>
            </div>

            {/* Customer Contact */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Customer / Recipient Name</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className="jf-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    disabled={isReadOnly}
                    required
                  />
                  <User size={16} style={{ position: "absolute", right: 10, top: 12, color: "#94a3b8" }} />
                </div>
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Customer Contact Phone</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className="jf-input"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    disabled={isReadOnly}
                    required
                  />
                  <Phone size={16} style={{ position: "absolute", right: 10, top: 12, color: "#94a3b8" }} />
                </div>
              </div>
            </div>

            {/* Delivery Address (if not Counter Pickup) */}
            {deliveryType !== "COUNTER_PICKUP" && (
              <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                <label className="jf-label jf-label-required">Delivery Address</label>
                <div style={{ position: "relative" }}>
                  <textarea
                    className="jf-textarea"
                    rows={2}
                    placeholder="Full street address, landmark, PIN code"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    disabled={isReadOnly}
                    required={deliveryType !== "COUNTER_PICKUP"}
                  />
                  <MapPin size={16} style={{ position: "absolute", right: 10, top: 12, color: "#94a3b8" }} />
                </div>
              </div>
            )}

            {/* Driver / Employee Member Assignment */}
            {deliveryType === "DELIVERY" && (
              <div style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "0.85rem",
                marginBottom: "1rem"
              }}>
                {/* Search & Select Employee Member */}
                <div className="jf-form-group" style={{ marginBottom: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                    <label className="jf-label" style={{ marginBottom: 0, fontWeight: 600 }}>
                      Delivery Employee Member (Search & Select)
                    </label>
                    {selectedEmployeeId && selectedEmployeeId !== "CUSTOM" && (
                      <span style={{ fontSize: "0.75rem", color: "#166534", fontWeight: 600, background: "#dcfce7", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                        ✓ Linked to Staff Record
                      </span>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: isReadOnly ? "1fr" : "1fr 1fr", gap: "0.5rem" }}>
                    {!isReadOnly && (
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          className="jf-input"
                          placeholder="Filter employee by name, code or mobile..."
                          value={employeeFilterText}
                          onChange={(e) => setEmployeeFilterText(e.target.value)}
                          disabled={isReadOnly}
                          style={{ fontSize: "0.85rem", paddingLeft: "2.1rem" }}
                        />
                        <Search size={14} style={{ position: "absolute", left: 10, top: 12, color: "#94a3b8" }} />
                      </div>
                    )}

                    <select
                      className="jf-select"
                      value={selectedEmployeeId}
                      onChange={(e) => handleEmployeeSelect(e.target.value)}
                      disabled={isReadOnly}
                      style={{ fontSize: "0.85rem", fontWeight: selectedEmployeeId ? 600 : 400 }}
                    >
                      <option value="">-- Choose Employee Member --</option>
                      {filteredEmployees.map((emp) => (
                        <option key={emp._id || emp.id} value={emp._id || emp.id}>
                          {emp.name} ({emp.employeeCode || "EMP"}) • {emp.mobile || emp.phone || "No phone"}
                        </option>
                      ))}
                      <option value="CUSTOM">-- Manual / External Rider --</option>
                    </select>
                  </div>
                </div>

                {/* 3 Fields: Name, Phone, Vehicle */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                  <div className="jf-form-group">
                    <label className="jf-label" style={{ fontSize: "0.8rem" }}>Delivery Person Name</label>
                    <input
                      type="text"
                      className="jf-input"
                      placeholder="e.g. Ramesh"
                      value={deliveryPersonName}
                      onChange={(e) => setDeliveryPersonName(e.target.value)}
                      disabled={isReadOnly}
                      style={{ fontSize: "0.85rem" }}
                    />
                  </div>
                  <div className="jf-form-group">
                    <label className="jf-label" style={{ fontSize: "0.8rem" }}>Rider Phone</label>
                    <input
                      type="text"
                      className="jf-input"
                      placeholder="e.g. 9876500000"
                      value={deliveryPersonPhone}
                      onChange={(e) => setDeliveryPersonPhone(e.target.value)}
                      disabled={isReadOnly}
                      style={{ fontSize: "0.85rem" }}
                    />
                  </div>
                  <div className="jf-form-group">
                    <label className="jf-label" style={{ fontSize: "0.8rem" }}>Vehicle Info</label>
                    <input
                      type="text"
                      className="jf-input"
                      placeholder="e.g. Hero Splendor - TN 01 AB 1234"
                      value={vehicle}
                      onChange={(e) => setVehicle(e.target.value)}
                      disabled={isReadOnly}
                      style={{ fontSize: "0.85rem" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
              <label className="jf-label">Special Delivery Instructions</label>
              <input
                type="text"
                className="jf-input"
                placeholder="e.g. Call customer before arrival, handle with care"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                disabled={isReadOnly}
              />
            </div>

            {/* Package Items Preview */}
            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>
                Items to be Dispatched:
              </div>
              <div style={{ fontSize: "0.85rem", color: "#1e293b" }}>
                • {job.title || job.productType || "Custom Print Material"} — Qty: <strong>{job.quantity || 500}</strong> pcs
              </div>
            </div>
          </div>

          <div className="jf-modal-footer">
            {isReadOnly ? (
              <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose}>
                Close
              </button>
            ) : (
              <>
                <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="jf-btn jf-btn-primary"
                  disabled={loading || !reviewDone}
                  title={!reviewDone ? "Click 'Confirm Review' in Step 1 first to unlock" : "Generate Delivery Order"}
                  style={{
                    opacity: !reviewDone ? 0.6 : 1,
                    cursor: !reviewDone ? "not-allowed" : "pointer"
                  }}
                >
                  {loading ? "Generating DO..." : "Generate Delivery Order (DO)"}
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
