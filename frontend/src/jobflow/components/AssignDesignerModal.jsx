import React, { useState, useEffect } from "react";
import { X, UserCheck } from "lucide-react";
import jobFlowApi from "../api/jobFlowApi";
import { toast } from "react-toastify";

export const AssignDesignerModal = ({ isOpen, onClose, job, onAssigned }) => {
  const [designerId, setDesignerId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [assignmentNote, setAssignmentNote] = useState("");
  const [designers, setDesigners] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const branchId = job?.branchId || job?.branch || undefined;
      jobFlowApi.getDesignerPool({ branchId })
        .then((res) => {
          let list = res?.data || res?.designers || (Array.isArray(res) ? res : []);
          if (Array.isArray(list) && list.length > 0) {
            // User requirement: Keep only one designer (Priya Raman)
            const priya = list.find((d) => (d.name || "").toLowerCase().includes("priya")) || list[0] || {
              _id: "6ac74652f1faee851df1867e",
              employeeId: "6ac74652f1faee851df1867e",
              name: "Priya Raman",
              code: "EMP-00002",
              activeJobs: 1,
            };
            const pId = String(priya.employeeId || priya._id || priya.userId || priya.id || "6ac74652f1faee851df1867e");
            setDesigners([{ ...priya, _id: pId, employeeId: pId }]);
            setDesignerId(pId);
          } else {
            setDesigners([{ _id: "6ac74652f1faee851df1867e", employeeId: "6ac74652f1faee851df1867e", name: "Priya Raman", code: "EMP-00002", activeJobs: 1 }]);
            setDesignerId("6ac74652f1faee851df1867e");
          }
        })
        .catch(() => {
          setDesigners([{ _id: "6ac74652f1faee851df1867e", employeeId: "6ac74652f1faee851df1867e", name: "Priya Raman", code: "EMP-00002", activeJobs: 1 }]);
          setDesignerId("6ac74652f1faee851df1867e");
        });
    }
  }, [isOpen, job]);

  if (!isOpen || !job) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!designerId) {
      toast.error("Please select a designer");
      return;
    }

    setLoading(true);
    try {
      await jobFlowApi.assignDesigner(job._id || job.id, {
        designerId,
        expectedCompletionDate: expectedDate,
        assignmentNote,
      });
      toast.success("Job assigned to designer successfully");
      if (onAssigned) onAssigned();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign designer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal" style={{ maxWidth: "520px" }}>
        <div className="jf-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <UserCheck size={20} style={{ color: "var(--jf-primary)" }} />
            <h2 className="jf-modal-title">Assign Designer</h2>
          </div>
          <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="jf-modal-body">
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: 0 }}>
              Assigning Job <strong>{job.jobNo || job.orderNumber || "Job Order"}</strong> •{" "}
              {job.title || job.jobTitle || "Artwork"}
            </p>

            <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
              <label className="jf-label jf-label-required">Select Designer</label>
              <select
                className="jf-select"
                value={designerId}
                onChange={(e) => setDesignerId(e.target.value)}
                required
              >
                {designers.map((d) => (
                  <option key={d._id || d.id} value={d._id || d.id}>
                    {d.name || d.username} ({d.code || "DES"}) - {d.activeJobs || 0} active jobs
                  </option>
                ))}
              </select>
            </div>

            <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
              <label className="jf-label">Expected Completion Date</label>
              <input
                type="date"
                className="jf-input"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>

            <div className="jf-form-group">
              <label className="jf-label">Assignment Note (Optional)</label>
              <textarea
                className="jf-textarea"
                placeholder="Create modern and professional design matching branding guidelines..."
                value={assignmentNote}
                onChange={(e) => setAssignmentNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="jf-modal-footer">
            <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="jf-btn jf-btn-primary" disabled={loading}>
              {loading ? "Assigning..." : "Assign Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignDesignerModal;
