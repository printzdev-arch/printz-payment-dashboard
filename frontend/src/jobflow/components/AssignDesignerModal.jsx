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
      setExpectedDate(new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0]);
      jobFlowApi.getDesignerPool()
        .then((res) => {
          if (res?.data && Array.isArray(res.data)) {
            setDesigners(res.data);
            if (res.data.length > 0) {
              setDesignerId(res.data[0]._id || res.data[0].id);
            }
          } else {
            // Default list if empty
            setDesigners([
              { _id: "des-01", name: "Karthik", code: "DES-01", activeJobs: 2 },
              { _id: "des-02", name: "Priya", code: "DES-02", activeJobs: 1 },
              { _id: "des-03", name: "Logan", code: "DES-03", activeJobs: 3 },
            ]);
            setDesignerId("des-01");
          }
        })
        .catch(() => {
          setDesigners([
            { _id: "des-01", name: "Karthik", code: "DES-01", activeJobs: 2 },
            { _id: "des-02", name: "Priya", code: "DES-02", activeJobs: 1 },
          ]);
          setDesignerId("des-01");
        });
    }
  }, [isOpen]);

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
