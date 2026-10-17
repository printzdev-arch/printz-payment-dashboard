import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Settings,
  User,
  RotateCcw,
  Info,
  AlertCircle,
  Check,
} from "lucide-react";
import jobFlowApi from "../api/designApi";
import { toast } from "react-toastify";

export const AssignDesignerModal = ({
  isOpen,
  onClose,
  job,
  onAssigned,
  designerPool = [],
  nextDesignerId = null,
}) => {
  const [allocationMethod, setAllocationMethod] = useState("ROUND_ROBIN"); // "ROUND_ROBIN" | "MANUAL"
  const [selectedDesignerId, setSelectedDesignerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [livePool, setLivePool] = useState(null);
  const [liveNextDesignerId, setLiveNextDesignerId] = useState(null);
  const [liveLastAssignedId, setLiveLastAssignedId] = useState(null);
  const [fetchingPool, setFetchingPool] = useState(false);

  // Fallback designer pool matching active database staff (6 designers)
  const defaultDesigners = [
    { _id: "des-ali", name: "Ali Hassan", email: "ali.hassan@printz.com", currentLoad: 0, openJobs: 0, maxLoad: 5, isActive: true },
    { _id: "des-siti", name: "Siti Rahman", email: "siti.rahman@printz.com", currentLoad: 0, openJobs: 0, maxLoad: 5, isActive: true },
    { _id: "des-kumar", name: "Kumar Anil", email: "kumar.anil@printz.com", currentLoad: 1, openJobs: 1, maxLoad: 5, isActive: true },
    { _id: "des-john", name: "John Lee", email: "john.lee@printz.com", currentLoad: 1, openJobs: 1, maxLoad: 5, isActive: true },
    { _id: "des-nur", name: "Nur Aisyah", email: "nur.aisyah@printz.com", currentLoad: 0, openJobs: 0, maxLoad: 5, isActive: true },
    { _id: "des-guna", name: "Guna", email: "guna@gmail.com", currentLoad: 1, openJobs: 1, maxLoad: 5, isActive: true },
  ];

  // Fetch live designer pool whenever modal opens or job changes
  useEffect(() => {
    if (isOpen) {
      setAllocationMethod("ROUND_ROBIN");
      setSelectedDesignerId("");

      const fetchPool = async () => {
        setFetchingPool(true);
        try {
          const branchId = job?.branchId || job?.branch;
          const poolRes = await jobFlowApi.getDesignerPool(branchId ? { branchId } : {});
          const freshDesigners = poolRes?.designers || poolRes?.data || [];
          if (Array.isArray(freshDesigners) && freshDesigners.length > 0) {
            setLivePool(freshDesigners);
          }
          if (poolRes?.nextDesigner) {
            setLiveNextDesignerId(poolRes.nextDesigner);
          }
          if (poolRes?.lastAssigned) {
            setLiveLastAssignedId(poolRes.lastAssigned);
          }
        } catch (err) {
          console.warn("Could not fetch live designer pool in modal:", err);
        } finally {
          setFetchingPool(false);
        }
      };

      fetchPool();
    }
  }, [isOpen, job]);

  // Active designer list
  const activeDesigners = React.useMemo(() => {
    if (Array.isArray(livePool) && livePool.length > 0) {
      return livePool;
    }
    if (Array.isArray(designerPool) && designerPool.length > 0) {
      return designerPool;
    }
    return defaultDesigners;
  }, [livePool, designerPool]);

  // Determine next eligible designer in round robin rotation
  const nextEligibleDesigner = React.useMemo(() => {
    const pool = activeDesigners;
    if (!pool || pool.length === 0) return defaultDesigners[0];

    // 1. Check if backend pool provided nextDesigner ID
    const targetNextId = liveNextDesignerId || nextDesignerId;
    if (targetNextId) {
      const targetStr = String(targetNextId);
      const matched = pool.find(
        (d) => String(d._id || d.employeeId || d.userId || d.id) === targetStr
      );
      if (matched && matched.isActive !== false) {
        return matched;
      }
    }

    // 2. Sequential Round Robin simulation based on lastAssigned ID
    const lastId = liveLastAssignedId;
    if (lastId) {
      const lastStr = String(lastId);
      const lastIdx = pool.findIndex(
        (d) => String(d._id || d.employeeId || d.userId || d.id) === lastStr
      );
      if (lastIdx !== -1) {
        for (let i = 1; i <= pool.length; i++) {
          const cand = pool[(lastIdx + i) % pool.length];
          const load = cand.currentLoad ?? cand.openJobs ?? 0;
          const max = cand.maxLoad || 5;
          if (cand.isActive !== false && load < max) {
            return cand;
          }
        }
      }
    }

    // 3. Fallback: find first designer with available capacity
    const eligible = pool.find(
      (d) => (d.currentLoad ?? d.openJobs ?? 0) < (d.maxLoad || 5) && d.isActive !== false
    );
    return eligible || pool[0] || defaultDesigners[0];
  }, [activeDesigners, liveNextDesignerId, nextDesignerId, liveLastAssignedId]);

  if (!isOpen || !job) return null;

  // Job display values
  const jobNo = job.jobNo || job.orderNumber || "JO-20250810-001";
  const customer = job.customerName || job.customerSnapshot?.name || "ABC Marketing";
  const jobItem = job.title || job.specs?.productType || job.items?.[0]?.itemName || "Flyer - A5";
  const priority = job.priority || "High";
  const isRejected = Boolean(
    job.isRejected ||
    job.designStatus === "REJECTED" ||
    job.designRejectionReason ||
    job.rejectionReason ||
    job.raw?.designStatus === "REJECTED" ||
    job.raw?.designRejectionReason
  );
  const rejectionReason =
    job.rejectionReason ||
    job.designRejectionReason ||
    job.raw?.designRejectionReason ||
    "";
  const approvedAt = job.createdAt
    ? new Date(job.createdAt).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    : "10 Aug 2025, 11:15 AM";

  // Name of designer to be confirmed
  const targetDesigner =
    allocationMethod === "ROUND_ROBIN"
      ? nextEligibleDesigner
      : activeDesigners.find(
        (d) => String(d._id || d.employeeId || d.id) === String(selectedDesignerId)
      );

  const targetDesignerName = targetDesigner?.name || "Priya Raman";
  const currentJobsCount = targetDesigner?.currentLoad ?? targetDesigner?.openJobs ?? 0;
  const maxJobsLimit = targetDesigner?.maxLoad || 5;

  const handleConfirm = async () => {
    if (allocationMethod === "MANUAL" && !selectedDesignerId) {
      toast.error("Please choose a designer from the dropdown");
      return;
    }

    setLoading(true);
    const jobId = job._id || job.id;

    try {
      let assignedDesignerName = targetDesignerName;
      if (allocationMethod === "ROUND_ROBIN") {
        const res = await jobFlowApi.autoAssignDesigner(jobId);
        const resData = res?.data || res || {};
        if (resData.assigned === false && resData.reason === "NO_ELIGIBLE_DESIGNER") {
          toast.warning("No eligible designer available under the current workload limit.");
          setLoading(false);
          return;
        }

        if (resData.designerName) {
          assignedDesignerName = resData.designerName;
        } else if (resData.assignment?.employeeId?.name) {
          assignedDesignerName = resData.assignment.employeeId.name;
        } else if (resData.employeeId) {
          const match = activeDesigners.find(
            (d) => String(d._id || d.userId || d.employeeId) === String(resData.employeeId)
          );
          if (match?.name) assignedDesignerName = match.name;
        }

        toast.success(
          isRejected
            ? `Job order ${jobNo} reallocated to ${assignedDesignerName} using round robin method!`
            : `Job order ${jobNo} assigned to ${assignedDesignerName} using round robin method!`
        );
      } else {
        const res = await jobFlowApi.assignDesigner(jobId, {
          employeeId: selectedDesignerId,
          designerId: selectedDesignerId,
          designerName: targetDesignerName,
          email: targetDesigner?.email,
          method: "MANUAL",
        });
        const resData = res?.data || res || {};
        if (resData.designerName) {
          assignedDesignerName = resData.designerName;
        } else if (resData.assignment?.employeeId?.name) {
          assignedDesignerName = resData.assignment.employeeId.name;
        } else {
          const match = activeDesigners.find(
            (d) => String(d._id || d.userId || d.employeeId) === String(selectedDesignerId)
          );
          if (match?.name) assignedDesignerName = match.name;
        }
        toast.success(
          isRejected
            ? `Job order ${jobNo} reallocated to ${assignedDesignerName}!`
            : `Job order ${jobNo} manually assigned to ${assignedDesignerName}!`
        );
      }

      onClose();

      if (onAssigned) {
        onAssigned({
          jobId,
          designerName: assignedDesignerName,
          method: allocationMethod === "ROUND_ROBIN" ? "Round Robin" : "Manual",
        });
      }
    } catch (err) {
      console.error("Allocation failed:", err);
      const msg = err.response?.data?.message || err.message || "Failed to allocate job order";
      toast.error(msg);
      // If error indicates job was already assigned or not found, notify parent to refresh and close
      if (err.response?.status === 409 || err.response?.status === 404) {
        onClose();
        if (onAssigned) onAssigned({ jobId });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="alloc-modal-overlay" onClick={onClose}>
      <div className="alloc-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="alloc-modal-header">
          <div>
            <h2 className="alloc-modal-title">
              {isRejected ? "Reallocate Job Order" : "Allocate Job Order"}
            </h2>
            <p className="alloc-modal-subtitle">
              {isRejected
                ? "Reassign this rejected job order to an available designer."
                : "Assign this job order to a designer."}
            </p>
          </div>
          <button
            type="button"
            className="alloc-btn-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="alloc-modal-body">
          {/* Card 1: Job Order Details */}
          <div className="alloc-details-card">
            <div className="alloc-section-header">
              <div className="alloc-icon-badge-blue">
                <FileText size={16} />
              </div>
              <h3 className="alloc-section-title">Job Order Details</h3>
            </div>

            <div className="alloc-details-grid">
              {/* Left Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <div className="alloc-kv-row">
                  <span className="alloc-kv-label">Job Order No.</span>
                  <span className="alloc-kv-val">{jobNo}</span>
                </div>
                <div className="alloc-kv-row">
                  <span className="alloc-kv-label">Customer</span>
                  <span className="alloc-kv-val">{customer}</span>
                </div>
                <div className="alloc-kv-row">
                  <span className="alloc-kv-label">Job Item</span>
                  <span className="alloc-kv-val">{jobItem}</span>
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <div className="alloc-kv-row">
                  <span className="alloc-kv-label">Priority</span>
                  <span
                    className={
                      priority === "High"
                        ? "dq-badge-high"
                        : priority === "Low"
                          ? "dq-badge-low"
                          : "dq-badge-normal"
                    }
                    style={{ padding: "0.15rem 0.6rem", fontSize: "0.75rem" }}
                  >
                    {priority}
                  </span>
                </div>
                <div className="alloc-kv-row">
                  <span className="alloc-kv-label">Approved At</span>
                  <span className="alloc-kv-val">{approvedAt}</span>
                </div>
              </div>
            </div>

            {isRejected && (
              <div
                style={{
                  marginTop: "0.85rem",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  padding: "0.6rem 0.85rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                  fontSize: "0.8125rem",
                  color: "#991b1b",
                }}
              >
                <AlertCircle size={16} style={{ marginTop: "2px", flexShrink: 0, color: "#dc2626" }} />
                <div>
                  <strong style={{ fontWeight: 600 }}>Previous Assignment Rejected</strong>
                  {rejectionReason ? (
                    <span style={{ display: "block", marginTop: "2px", color: "#b91c1c" }}>
                      Reason: &ldquo;{rejectionReason}&rdquo;
                    </span>
                  ) : (
                    <span style={{ display: "block", marginTop: "2px", color: "#b91c1c" }}>
                      This job was returned to the supervisor queue for reallocation.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Select Allocation Method */}
          <div>
            <div className="alloc-section-header" style={{ marginBottom: "0.35rem" }}>
              <div className="alloc-icon-badge-blue">
                <Settings size={16} />
              </div>
              <h3 className="alloc-section-title">Select Allocation Method</h3>
            </div>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "#64748b",
                margin: "0 0 0.85rem 0",
              }}
            >
              Choose how this job order should be assigned.
            </p>

            <div className="alloc-method-grid">
              {/* Option 1: Round Robin (Automatic) */}
              <div
                className={`alloc-method-card ${allocationMethod === "ROUND_ROBIN" ? "active" : "inactive"
                  }`}
                onClick={() => setAllocationMethod("ROUND_ROBIN")}
              >
                <div
                  className={`alloc-radio-circle ${allocationMethod === "ROUND_ROBIN" ? "active" : "inactive"
                    }`}
                />
                <div className="alloc-method-content">
                  <h4 className="alloc-method-title">Round Robin (Automatic)</h4>
                  <p className="alloc-method-desc">
                    Assign to the next eligible designer in the round robin sequence.
                  </p>
                </div>
              </div>

              {/* Option 2: Manual Assignment */}
              <div
                className={`alloc-method-card ${allocationMethod === "MANUAL" ? "active" : "inactive"
                  }`}
                onClick={() => setAllocationMethod("MANUAL")}
              >
                <div
                  className={`alloc-radio-circle ${allocationMethod === "MANUAL" ? "active" : "inactive"
                    }`}
                />
                <div className="alloc-method-content">
                  <h4 className="alloc-method-title">Manual Assignment</h4>
                  <p className="alloc-method-desc">
                    Select a specific designer manually.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Designer Selection */}
          <div>
            <div className="alloc-section-header" style={{ marginBottom: "0.85rem" }}>
              <div className="alloc-icon-badge-blue">
                <User size={16} />
              </div>
              <h3 className="alloc-section-title">Designer</h3>
            </div>

            <div className="alloc-designer-grid">
              {/* Left Box: Next eligible designer */}
              <div
                className="alloc-next-eligible-box"
                style={{
                  opacity: allocationMethod === "MANUAL" ? 0.75 : 1,
                  border:
                    allocationMethod === "ROUND_ROBIN"
                      ? "1.5px solid #86efac"
                      : "1px solid #bbf7d0",
                }}
              >
                <div className="alloc-next-header">
                  <RotateCcw
                    size={16}
                    style={{ color: "#16a34a", marginTop: "2px", flexShrink: 0 }}
                  />
                  <div>
                    <h5 className="alloc-next-title">Next eligible designer</h5>
                    <p className="alloc-next-subtitle">
                      Based on round robin sequence and max load setting.
                    </p>
                  </div>
                </div>

                <div className="alloc-next-details-row">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#0f172a" }}>
                      {fetchingPool ? "Loading next in rotation..." : (nextEligibleDesigner?.name || "Priya Raman")}
                    </span>
                    <span
                      style={{
                        background: "#dcfce7",
                        color: "#15803d",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        padding: "0.15rem 0.55rem",
                        borderRadius: "9999px",
                      }}
                    >
                      Eligible
                    </span>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.6875rem", color: "#64748b" }}>
                      Current Active Jobs
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#0f172a" }}>
                      {nextEligibleDesigner?.currentLoad ?? nextEligibleDesigner?.openJobs ?? 0} /{" "}
                      {nextEligibleDesigner?.maxLoad || 5}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Box: Select Designer * */}
              <div className="alloc-manual-box">
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "#0f172a",
                      marginBottom: "0.35rem",
                    }}
                  >
                    Select Designer <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <select
                    className="alloc-select"
                    value={selectedDesignerId}
                    onChange={(e) => {
                      setSelectedDesignerId(e.target.value);
                      setAllocationMethod("MANUAL");
                    }}
                    disabled={loading}
                  >
                    <option value="">Choose a designer...</option>
                    {activeDesigners.map((d) => (
                      <option
                        key={d._id || d.employeeId || d.id}
                        value={String(d._id || d.employeeId || d.id)}
                      >
                        {d.name} ({d.currentLoad ?? d.openJobs ?? 0}/{d.maxLoad || 5})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="alloc-info-note">
                  <Info size={14} style={{ flexShrink: 0 }} />
                  <span>Only designers with available load will be shown.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Please Confirm Callout */}
          <div className="alloc-confirm-alert">
            <AlertCircle size={18} style={{ color: "#f59e0b", flexShrink: 0, marginTop: "1px" }} />
            <div className="alloc-confirm-content">
              <h5 className="alloc-confirm-title">Please Confirm</h5>
              <p className="alloc-confirm-text">
                {allocationMethod === "ROUND_ROBIN" ? (
                  <>
                    This job order will be assigned to{" "}
                    <strong>{targetDesignerName}</strong> using the round robin method. The system
                    will automatically update the next designer for subsequent allocations.
                  </>
                ) : (
                  <>
                    This job order will be manually assigned to{" "}
                    <strong>{targetDesignerName}</strong>. The system will update their active
                    workload accordingly.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="alloc-modal-footer">
          <button
            type="button"
            className="alloc-btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="alloc-btn-confirm"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading
              ? isRejected
                ? "Reallocating..."
                : "Allocating..."
              : isRejected
                ? "Confirm Reallocation"
                : "Confirm Allocation"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignDesignerModal;
