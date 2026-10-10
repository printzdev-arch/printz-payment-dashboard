import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  RefreshCw,
  Layers,
  Sparkles,
  History,
  FileCheck,
  Plus,
  Trash2,
  Cpu,
  User,
  AlertCircle
} from "lucide-react";
import {
  getQcProductionOrderDetails,
  submitQualityCheck
} from "../api/qualityApi";
import QualityPassConfirmModal from "./QualityPassConfirmModal";
import QualityIssueConfirmModal from "./QualityIssueConfirmModal";
import QcHistoryTimelineModal from "./QcHistoryTimelineModal";

export default function QualityControlDetailView({
  productionOrderId,
  onBack,
  onNavigateToReprints,
  currentUser = { name: "Lakshmi P", role: "qc_inspector" },
  branchName = "Kothanur"
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inspection Form State
  const [quantityChecked, setQuantityChecked] = useState(1000);
  const [acceptedQty, setAcceptedQty] = useState(1000);
  const [rejectedQty, setRejectedQty] = useState(0);
  const [result, setResult] = useState("PASS"); // "PASS" | "ISSUE"
  const [correctiveAction, setCorrectiveAction] = useState("NONE"); // "NONE" | "REWORK" | "REPRINT"
  const [restartOperation, setRestartOperation] = useState("PRINTING");
  const [issueDetails, setIssueDetails] = useState("");
  const [comments, setComments] = useState("");
  const [checklist, setChecklist] = useState([]);
  const [defects, setDefects] = useState([]);

  // Modals
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getQcProductionOrderDetails(productionOrderId);
      const po = (res && res.productionOrder) ? res.productionOrder : (res || {});
      setData({
        productionOrder: po,
        checklistTemplate: res.checklistTemplate || [],
        defectCatalogue: res.defectCatalogue || [],
        qcHistory: res.qcHistory || [],
        ...res
      });
      const produced = po.producedQty || po.actualQty || po.goodQty || po.plannedQty || 1000;
      setQuantityChecked(produced);
      setAcceptedQty(produced);
      setRejectedQty(0);
      setResult("PASS");
      setCorrectiveAction("NONE");

      // Initialize checklist from template
      if (res.checklistTemplate && res.checklistTemplate.length > 0) {
        setChecklist(
          res.checklistTemplate.map((item) => ({
            id: item.id,
            item: item.item,
            result: item.defaultResult || "PASS",
            notes: ""
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load QC details:", err);
      setError(err.response?.data?.message || "Failed to load Quality Control details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productionOrderId) {
      fetchDetails();
    }
  }, [productionOrderId]);

  // Quantity updates handler
  const handleQuantityCheckedChange = (val) => {
    const num = Math.max(0, Number(val));
    setQuantityChecked(num);
    // Keep accepted in sync if result is PASS
    if (result === "PASS") {
      setAcceptedQty(num);
      setRejectedQty(0);
    } else {
      setAcceptedQty(Math.max(0, num - rejectedQty));
    }
  };

  const handleAcceptedQtyChange = (val) => {
    const num = Math.max(0, Number(val));
    setAcceptedQty(num);
    const newRejected = Math.max(0, Number(quantityChecked) - num);
    setRejectedQty(newRejected);
    if (newRejected > 0 && result === "PASS") {
      setResult("ISSUE");
      setCorrectiveAction("REWORK");
    } else if (newRejected === 0 && result === "ISSUE") {
      setResult("PASS");
      setCorrectiveAction("NONE");
    }
  };

  const handleRejectedQtyChange = (val) => {
    const num = Math.max(0, Number(val));
    setRejectedQty(num);
    const newAccepted = Math.max(0, Number(quantityChecked) - num);
    setAcceptedQty(newAccepted);
    if (num > 0 && result === "PASS") {
      setResult("ISSUE");
      setCorrectiveAction("REWORK");
    } else if (num === 0 && result === "ISSUE") {
      setResult("PASS");
      setCorrectiveAction("NONE");
    }
  };

  const handleResultChange = (newResult) => {
    setResult(newResult);
    if (newResult === "PASS") {
      setAcceptedQty(quantityChecked);
      setRejectedQty(0);
      setCorrectiveAction("NONE");
    } else {
      if (rejectedQty === 0) {
        setRejectedQty(10);
        setAcceptedQty(Math.max(0, quantityChecked - 10));
      }
      setCorrectiveAction("REWORK");
    }
  };

  const handleChecklistResultToggle = (idx, res) => {
    const updated = [...checklist];
    updated[idx].result = res;
    setChecklist(updated);

    // If any item fails, suggest ISSUE
    const anyFailed = updated.some((c) => c.result === "FAIL");
    if (anyFailed && result === "PASS") {
      handleResultChange("ISSUE");
    }
  };

  const handleChecklistNotesChange = (idx, notes) => {
    const updated = [...checklist];
    updated[idx].notes = notes;
    setChecklist(updated);
  };

  // Defects array handling
  const handleAddDefect = () => {
    const newDefect = {
      code: "COLOR_MISMATCH",
      severity: "MEDIUM",
      quantity: rejectedQty > 0 ? rejectedQty : 10,
      description: "Color variation observed against proof"
    };
    setDefects([...defects, newDefect]);
  };

  const handleUpdateDefect = (index, field, value) => {
    const updated = [...defects];
    updated[index][field] = value;
    setDefects(updated);
  };

  const handleRemoveDefect = (index) => {
    setDefects(defects.filter((_, i) => i !== index));
  };

  // Submit flow
  const handleFormSubmit = (e) => {
    e.preventDefault();

    // Client-side validations
    if (Number(acceptedQty) + Number(rejectedQty) !== Number(quantityChecked)) {
      alert(`Quantity Mismatch: Accepted (${acceptedQty}) + Rejected (${rejectedQty}) must equal Total Checked (${quantityChecked}).`);
      return;
    }

    if (result === "PASS") {
      setIsPassModalOpen(true);
    } else {
      if (defects.length === 0) {
        handleAddDefect();
      }
      setIsIssueModalOpen(true);
    }
  };

  const handleExecutePass = async () => {
    setIsSubmitting(true);
    try {
      await submitQualityCheck(productionOrderId, {
        quantityChecked: Number(quantityChecked),
        acceptedQty: Number(acceptedQty),
        rejectedQty: 0,
        result: "PASS",
        correctiveAction: "NONE",
        checklist,
        comments,
        checkedBy: currentUser?.name || "Lakshmi P"
      });
      setIsPassModalOpen(false);
      await fetchDetails();
    } catch (err) {
      console.error("Failed to submit QC pass:", err);
      alert(err.response?.data?.message || "Failed to submit Quality Check PASS.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteIssue = async (issuePayload) => {
    setIsSubmitting(true);
    try {
      await submitQualityCheck(productionOrderId, {
        quantityChecked: Number(quantityChecked),
        acceptedQty: Number(acceptedQty),
        rejectedQty: Number(rejectedQty),
        result: "ISSUE",
        correctiveAction: issuePayload.correctiveAction,
        restartFromOperationCode: issuePayload.restartFromOperationCode,
        checklist,
        defects: defects.length > 0 ? defects : [
          {
            code: "GENERAL_DEFECT",
            severity: "MEDIUM",
            quantity: Number(rejectedQty),
            description: issueDetails || comments || "Defects detected during inspection"
          }
        ],
        issueDetails: issueDetails || comments,
        comments,
        checkedBy: currentUser?.name || "Lakshmi P"
      });
      setIsIssueModalOpen(false);
      await fetchDetails();
    } catch (err) {
      console.error("Failed to submit QC issue:", err);
      alert(err.response?.data?.message || "Failed to submit Quality Control issue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="qc-container" style={{ textAlign: "center", padding: "80px 20px" }}>
        <ShieldCheck size={32} className="prod-spin" style={{ margin: "0 auto 12px auto", color: "#047857" }} />
        <h3 style={{ color: "#0f172a", fontSize: "16px" }}>Loading Quality Control Inspection Form...</h3>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="qc-container" style={{ textAlign: "center", padding: "80px 20px" }}>
        <AlertCircle size={32} color="#dc2626" style={{ margin: "0 auto 12px auto" }} />
        <h3 style={{ color: "#0f172a", fontSize: "16px" }}>{error || "Quality Control record not found."}</h3>
        <button type="button" onClick={onBack} className="qc-btn-primary" style={{ marginTop: "16px" }}>
          <ArrowLeft size={14} /> Back to QC Queue
        </button>
      </div>
    );
  }

  const productionOrder = data.productionOrder || data || {};
  const { qcHistory = [], reprintRequests = [], defectCatalogue = [] } = data;
  const isAlreadyPassed = productionOrder.status === "QC_PASSED" || productionOrder.status === "COMPLETED";
  const operations = productionOrder.operations || [];

  return (
    <div className="qc-container">
      {/* Header Bar */}
      <div className="qc-header-bar">
        <div className="qc-title-group">
          <div className="qc-breadcrumb">
            <span className="qc-breadcrumb-link" onClick={onBack}>
              Quality Control Queue
            </span>
            <span>/</span>
            <span style={{ color: "#0f172a", fontWeight: 700 }}>{productionOrder.productionNo}</span>
          </div>
          <h1 className="qc-title">
            <ShieldCheck size={22} color="#047857" />
            Quality Control Inspection • {productionOrder.productionNo}
          </h1>
          <p className="qc-subtitle">
            Job Ref: <strong>{productionOrder.jobNo}</strong> • Customer: <strong>{productionOrder.customerName}</strong> • Inspector: <strong>{currentUser?.name || "Lakshmi P"}</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button type="button" onClick={onBack} className="qc-btn-secondary">
            <ArrowLeft size={14} /> Back to Queue
          </button>
          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="qc-btn-secondary"
            title="View Lifecycle Timeline"
          >
            <History size={14} /> QC History ({qcHistory.length})
          </button>
        </div>
      </div>

      {/* Stepper Progress Bar matching PrintZ ERP Reference */}
      <div className="prod-stepper-container" style={{ marginBottom: "20px" }}>
        <div className="prod-stepper-track">
          <div className="prod-step-item prod-step-completed">
            <div className="prod-step-icon-wrap">✓</div>
            <span className="prod-step-label">Enquiry</span>
            <span className="prod-step-sub">15 Sep</span>
          </div>
          <div className="prod-step-item prod-step-completed">
            <div className="prod-step-icon-wrap">✓</div>
            <span className="prod-step-label">Estimation</span>
            <span className="prod-step-sub">16 Sep</span>
          </div>
          <div className="prod-step-item prod-step-completed">
            <div className="prod-step-icon-wrap">✓</div>
            <span className="prod-step-label">Design</span>
            <span className="prod-step-sub">17 Sep</span>
          </div>
          <div className="prod-step-item prod-step-completed">
            <div className="prod-step-icon-wrap">✓</div>
            <span className="prod-step-label">Sample Approval</span>
            <span className="prod-step-sub">18 Sep</span>
          </div>
          <div className="prod-step-item prod-step-completed">
            <div className="prod-step-icon-wrap">✓</div>
            <span className="prod-step-label">Printing</span>
            <span className="prod-step-sub">Done</span>
          </div>
          <div className="prod-step-item prod-step-completed">
            <div className="prod-step-icon-wrap">✓</div>
            <span className="prod-step-label">Finishing</span>
            <span className="prod-step-sub">Done</span>
          </div>
          <div className="prod-step-item prod-step-completed">
            <div className="prod-step-icon-wrap">✓</div>
            <span className="prod-step-label">Packing</span>
            <span className="prod-step-sub">Done</span>
          </div>
          <div className="prod-step-item prod-step-active">
            <div className="prod-step-icon-wrap">8</div>
            <span className="prod-step-label">QC</span>
            <span className="prod-step-sub">{isAlreadyPassed ? "Passed" : "Inspection"}</span>
          </div>
          <div className="prod-step-item">
            <div className="prod-step-icon-wrap">9</div>
            <span className="prod-step-label">Ready</span>
            <span className="prod-step-sub">Upcoming</span>
          </div>
          <div className="prod-step-item">
            <div className="prod-step-icon-wrap">10</div>
            <span className="prod-step-label">Delivered</span>
            <span className="prod-step-sub">Pending</span>
          </div>
          <div className="prod-step-item">
            <div className="prod-step-icon-wrap">11</div>
            <span className="prod-step-label">Invoiced</span>
            <span className="prod-step-sub">Pending</span>
          </div>
        </div>
      </div>

      {/* 12-Column Layout (8 cols Main / 4 cols Sidebar) */}
      <div className="qc-layout-12">
        {/* LEFT COLUMN: Production Summary, Proof Preview, Operation History, Inspection Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Production Summary Card */}
          <div className="qc-card" style={{ marginBottom: 0 }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
              <Layers size={16} color="#047857" />
              Production Output Summary
            </h3>

            <div className="qc-kpi-grid">
              <div className="qc-kpi-card">
                <div className="qc-kpi-title">Required Qty</div>
                <div className="qc-kpi-value">{(productionOrder.requiredQty || 1000).toLocaleString()} pcs</div>
                <div className="qc-kpi-sub">Target ordered units</div>
              </div>

              <div className="qc-kpi-card">
                <div className="qc-kpi-title" style={{ color: "#047857" }}>Produced Qty</div>
                <div className="qc-kpi-value" style={{ color: "#047857" }}>{(productionOrder.producedQty || 1012).toLocaleString()} pcs</div>
                <div className="qc-kpi-sub">Received from packaging</div>
              </div>

              <div className="qc-kpi-card">
                <div className="qc-kpi-title" style={{ color: "#16a34a" }}>Accepted Qty</div>
                <div className="qc-kpi-value" style={{ color: "#16a34a" }}>{Number(acceptedQty || 0).toLocaleString()} pcs</div>
                <div className="qc-kpi-sub">Verified good pieces</div>
              </div>

              <div className="qc-kpi-card">
                <div className="qc-kpi-title" style={{ color: Number(rejectedQty) > 0 ? "#dc2626" : "#64748b" }}>Rejected Qty</div>
                <div className="qc-kpi-value" style={{ color: Number(rejectedQty) > 0 ? "#dc2626" : "#0f172a" }}>{Number(rejectedQty || 0).toLocaleString()} pcs</div>
                <div className="qc-kpi-sub">Quality defect scrap</div>
              </div>
            </div>
          </div>

          {/* Approved Customer Design Sample (Read-Only Reference) */}
          <div className="qc-card" style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={16} color="#d97706" />
                Approved Sample Proof (Read-Only QC Standard)
              </h3>
              <span style={{ fontSize: "11px", color: "#047857", background: "#dcfce7", padding: "3px 8px", borderRadius: "12px", fontWeight: 600 }}>
                Customer Approved Proof v2
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "16px", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{
                height: "110px",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                borderRadius: "6px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#f8fafc",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
              }}>
                <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1px", color: "#fbbf24" }}>
                  ABC PRINTERS
                </div>
                <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px" }}>
                  LUXURY VISITING CARD
                </div>
                <div style={{ position: "absolute", bottom: "4px", right: "6px", fontSize: "8.5px", background: "rgba(0,0,0,0.6)", padding: "1px 4px", borderRadius: "3px", color: "#34d399" }}>
                  PROOF v2.0
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "#334155", display: "flex", flexDirection: "column", justifyContent: "center", gap: "4px" }}>
                <div><strong>Proof File:</strong> {productionOrder.approvedSample?.fileName || "abc-visiting-card-v2.pdf"}</div>
                <div><strong>Paper Stock:</strong> Art Card 300 GSM (SRA3) • Double Side CMYK</div>
                <div><strong>Customer Remarks:</strong> "{productionOrder.approvedSample?.comments || "Looks good. Please go ahead with printing. Make sure colours match the screen."}"</div>
                <div style={{ color: "#dc2626", fontSize: "11px", marginTop: "2px", fontWeight: 600 }}>
                  * QC Inspector must verify color registration and cutting boundaries against this approved reference.
                </div>
              </div>
            </div>
          </div>

          {/* Operation Routing History */}
          <div className="qc-card" style={{ padding: 0, overflow: "hidden", marginBottom: 0 }}>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                <FileCheck size={16} color="#047857" />
                Completed Production Operations ({operations.length} Steps)
              </h3>
              <span style={{ fontSize: "11px", color: "#64748b" }}>Order: <strong>{productionOrder.productionNo}</strong></span>
            </div>

            <table className="prod-table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: "40px", textAlign: "center" }}>#</th>
                  <th>Operation Name</th>
                  <th>Station / Machine</th>
                  <th>Operator</th>
                  <th style={{ textAlign: "center" }}>Output Qty</th>
                  <th style={{ textAlign: "center" }}>Wastage</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op) => (
                  <tr key={op.operationId || op.sequenceNo}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{op.sequenceNo}</td>
                    <td>
                      <strong style={{ color: "#0f172a" }}>{op.name || op.operationName}</strong>
                    </td>
                    <td style={{ fontSize: "11.5px", color: "#475569" }}>
                      {op.assignedMachine || op.machineName || op.machine || "Station"}
                    </td>
                    <td style={{ fontSize: "11.5px", color: "#475569" }}>
                      {op.operator || op.assignedEmployeeName || "—"}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>
                      {(op.completedQty || op.outputQty || op.plannedQty || 0).toLocaleString()}
                    </td>
                    <td style={{ textAlign: "center", color: op.wastageQty > 0 ? "#dc2626" : "#64748b" }}>
                      {op.wastageQty || 0}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="prod-status-tag completed" style={{ fontSize: "10px", padding: "2px 6px" }}>
                        ✓ Done
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Main Quality Inspection Form */}
          <div className="qc-card" style={{ border: "1.5px solid #047857" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldCheck size={18} color="#047857" />
                Quality Inspection Recording
              </h3>
              <span className={`qc-status-pill ${result === "PASS" ? "passed" : "rework"}`}>
                {result === "PASS" ? "PASS MODE" : "ISSUE MODE"}
              </span>
            </div>

            <form onSubmit={handleFormSubmit}>
              {/* Quantities Reconciliation Box */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", marginBottom: "18px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "10px" }}>
                  Quantity Inspection Reconciliation (Enforced Rule: Accepted + Rejected = Checked)
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                      Quantity Checked *
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="prod-form-input"
                      value={quantityChecked}
                      onChange={(e) => handleQuantityCheckedChange(e.target.value)}
                      disabled={isAlreadyPassed}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#16a34a", marginBottom: "4px" }}>
                      Accepted Good Qty *
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="prod-form-input"
                      value={acceptedQty}
                      onChange={(e) => handleAcceptedQtyChange(e.target.value)}
                      disabled={isAlreadyPassed}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: Number(rejectedQty) > 0 ? "#dc2626" : "#64748b", marginBottom: "4px" }}>
                      Rejected Defect Qty
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="prod-form-input"
                      value={rejectedQty}
                      onChange={(e) => handleRejectedQtyChange(e.target.value)}
                      disabled={isAlreadyPassed}
                    />
                  </div>
                </div>
              </div>

              {/* Overall Inspection Result Radio Selector */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>
                  Overall Quality Decision *
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={() => handleResultChange("PASS")}
                    disabled={isAlreadyPassed}
                    style={{
                      border: result === "PASS" ? "2px solid #047857" : "1px solid #cbd5e1",
                      background: result === "PASS" ? "#f0fdf4" : "#ffffff",
                      borderRadius: "8px",
                      padding: "12px",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, fontSize: "13px", color: "#047857" }}>
                      <CheckCircle2 size={16} /> PASS (Zero Quality Defects)
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                      Output complies with approved customer sample. Clears order for packaging & dispatch.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResultChange("ISSUE")}
                    disabled={isAlreadyPassed}
                    style={{
                      border: result === "ISSUE" ? "2px solid #dc2626" : "1px solid #cbd5e1",
                      background: result === "ISSUE" ? "#fff5f5" : "#ffffff",
                      borderRadius: "8px",
                      padding: "12px",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, fontSize: "13px", color: "#dc2626" }}>
                      <AlertTriangle size={16} /> QUALITY ISSUE DETECTED
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                      Defects detected requiring corrective action (Rework or Reprint cycle).
                    </div>
                  </button>
                </div>
              </div>

              {/* Configurable QC Checklist Section */}
              <div style={{ marginBottom: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
                    Standard Quality Inspection Checklist ({checklist.length} Points)
                  </label>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>Mark PASS / FAIL / NA per parameter</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {checklist.map((chk, idx) => (
                    <div key={chk.id || idx} className="qc-chk-row">
                      <div style={{ flex: 1, paddingRight: "10px" }}>
                        <span style={{ fontWeight: 600, fontSize: "12px", color: "#0f172a" }}>{chk.item}</span>
                        <input
                          type="text"
                          placeholder="Optional inspection remarks..."
                          value={chk.notes || ""}
                          onChange={(e) => handleChecklistNotesChange(idx, e.target.value)}
                          disabled={isAlreadyPassed}
                          style={{
                            display: "block",
                            width: "90%",
                            marginTop: "3px",
                            padding: "3px 6px",
                            fontSize: "11px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "4px"
                          }}
                        />
                      </div>

                      <div className="qc-btn-toggle-group">
                        <button
                          type="button"
                          className={`qc-btn-toggle ${chk.result === "PASS" ? "active-pass" : ""}`}
                          onClick={() => handleChecklistResultToggle(idx, "PASS")}
                          disabled={isAlreadyPassed}
                        >
                          PASS
                        </button>
                        <button
                          type="button"
                          className={`qc-btn-toggle ${chk.result === "FAIL" ? "active-fail" : ""}`}
                          onClick={() => handleChecklistResultToggle(idx, "FAIL")}
                          disabled={isAlreadyPassed}
                        >
                          FAIL
                        </button>
                        <button
                          type="button"
                          className={`qc-btn-toggle ${chk.result === "NA" ? "active-na" : ""}`}
                          onClick={() => handleChecklistResultToggle(idx, "NA")}
                          disabled={isAlreadyPassed}
                        >
                          N/A
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Defect Capture Builder (Shown when ISSUE) */}
              {result === "ISSUE" && (
                <div style={{ marginBottom: "18px", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: "8px", padding: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "#991b1b" }}>
                      Defect Classification & Logged Scrap
                    </label>
                    <button
                      type="button"
                      onClick={handleAddDefect}
                      className="qc-btn-secondary"
                      style={{ padding: "4px 8px", fontSize: "11px", color: "#991b1b" }}
                      disabled={isAlreadyPassed}
                    >
                      <Plus size={12} /> Add Defect Line
                    </button>
                  </div>

                  {defects.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "12px", fontSize: "11.5px", color: "#b91c1c" }}>
                      No defect logged yet. Click "+ Add Defect Line" to specify defect category.
                    </div>
                  ) : (
                    defects.map((d, i) => (
                      <div key={i} className="qc-defect-item" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 28px", gap: "8px", alignItems: "center" }}>
                        <select
                          className="prod-form-input"
                          style={{ fontSize: "11.5px", padding: "4px 8px" }}
                          value={d.code}
                          onChange={(e) => handleUpdateDefect(i, "code", e.target.value)}
                          disabled={isAlreadyPassed}
                        >
                          <option value="COLOR_MISMATCH">Color Mismatch / Delta Shift</option>
                          <option value="REGISTRATION_OFF">Registration Misalignment</option>
                          <option value="CUT_SIZE_ERROR">Cutting / Trimming Deviation</option>
                          <option value="LAMINATION_BUBBLE">Lamination Peeling / Bubbles</option>
                          <option value="FOIL_PEELING">Foil Defect / Flaking</option>
                          <option value="INK_STREAK">Ink Streaks / Roller Banding</option>
                          <option value="SURFACE_SCRATCH">Surface Scratches</option>
                        </select>

                        <select
                          className="prod-form-input"
                          style={{ fontSize: "11.5px", padding: "4px 8px" }}
                          value={d.severity}
                          onChange={(e) => handleUpdateDefect(i, "severity", e.target.value)}
                          disabled={isAlreadyPassed}
                        >
                          <option value="LOW">Severity: LOW</option>
                          <option value="MEDIUM">Severity: MEDIUM</option>
                          <option value="HIGH">Severity: HIGH</option>
                          <option value="CRITICAL">Severity: CRITICAL</option>
                        </select>

                        <input
                          type="number"
                          min="1"
                          placeholder="Scrap Qty"
                          className="prod-form-input"
                          style={{ fontSize: "11.5px", padding: "4px 8px" }}
                          value={d.quantity}
                          onChange={(e) => handleUpdateDefect(i, "quantity", Number(e.target.value))}
                          disabled={isAlreadyPassed}
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveDefect(i)}
                          style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}
                          disabled={isAlreadyPassed}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))
                  )}

                  {/* Corrective Action Options */}
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #fca5a5" }}>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#991b1b", marginBottom: "6px" }}>
                      Corrective Action Routing *
                    </label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#7f1d1d", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="corrAction"
                          checked={correctiveAction === "REWORK"}
                          onChange={() => setCorrectiveAction("REWORK")}
                          disabled={isAlreadyPassed}
                        />
                        <strong>REWORK</strong> (Restart Affected Operation on Existing Stock)
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#7f1d1d", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="corrAction"
                          checked={correctiveAction === "REPRINT"}
                          onChange={() => setCorrectiveAction("REPRINT")}
                          disabled={isAlreadyPassed}
                        />
                        <strong>REPRINT</strong> (Reproduce Defective Qty via Manager Approval)
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Inspector Remarks */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Inspector General Observations & Comments
                </label>
                <textarea
                  className="prod-form-input"
                  rows={2}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Record optical calibration notes, cut registration check..."
                  disabled={isAlreadyPassed}
                />
              </div>

              {/* Submit Buttons */}
              {!isAlreadyPassed ? (
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  {result === "PASS" ? (
                    <button
                      type="submit"
                      className="qc-btn-primary"
                      style={{ padding: "10px 20px", fontSize: "13px" }}
                      disabled={isSubmitting}
                    >
                      <CheckCircle2 size={16} /> Submit Quality Check (PASS) ✓
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="qc-btn-danger"
                      style={{ padding: "10px 20px", fontSize: "13px" }}
                      disabled={isSubmitting}
                    >
                      <AlertTriangle size={16} /> Submit Quality Issue ({correctiveAction}) ▶
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", padding: "14px", textAlign: "center", color: "#047857" }}>
                  <CheckCircle2 size={24} style={{ margin: "0 auto 6px auto" }} />
                  <div style={{ fontWeight: 800, fontSize: "14px" }}>Quality Control Passed ✓</div>
                  <div style={{ fontSize: "12px", color: "#065f46", marginTop: "2px" }}>
                    This order has been verified and passed QC. It is ready for the packaging and dispatch workflow.
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Live QC Status, Metadata, Checklist Progress, Timeline Snapshot */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Inspection Status Card */}
          <div className="qc-card">
            <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
              Quality Inspection Status
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11.5px", color: "#64748b" }}>Current Status:</span>
                <span className={`qc-status-pill ${isAlreadyPassed ? "passed" : result === "PASS" ? "passed" : "rework"}`}>
                  {isAlreadyPassed ? "PASSED" : result}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11.5px", color: "#64748b" }}>Production Cycle:</span>
                <strong style={{ fontSize: "12px", color: "#0f172a" }}>Cycle {productionOrder.currentCycleNo || 0}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11.5px", color: "#64748b" }}>Inspector:</span>
                <strong style={{ fontSize: "12px", color: "#0f172a" }}>{currentUser?.name || "Lakshmi P"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11.5px", color: "#64748b" }}>Branch Scope:</span>
                <span style={{ fontSize: "11.5px", color: "#047857", fontWeight: 600 }}>{branchName}</span>
              </div>
            </div>
          </div>

          {/* Job & Customer Details */}
          <div className="qc-card">
            <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
              Customer & Order Metadata
            </h4>
            <div style={{ fontSize: "12px", color: "#334155", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div><strong>Customer:</strong> {productionOrder.customerName}</div>
              <div><strong>Contact:</strong> {productionOrder.customerMobile || "—"}</div>
              <div><strong>Job Reference:</strong> {productionOrder.jobNo}</div>
              <div><strong>Product:</strong> {productionOrder.productName}</div>
              <div><strong>Priority:</strong> <span style={{ color: productionOrder.priority === "HIGH" ? "#dc2626" : "#0f172a", fontWeight: 700 }}>{productionOrder.priority || "NORMAL"}</span></div>
              <div><strong>Due Date:</strong> {productionOrder.dueDate || "22 Oct 2026"}</div>
            </div>
          </div>

          {/* Corrective History Timeline Sidebar Snapshot */}
          <div className="qc-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                Lifecycle Events
              </h4>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(true)}
                style={{ background: "none", border: "none", color: "#047857", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
              >
                View Full
              </button>
            </div>

            <div style={{ fontSize: "11.5px", color: "#475569" }}>
              {qcHistory.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {qcHistory.map((h, i) => (
                    <div key={i} style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "4px" }}>
                      <strong>{h.result === "PASS" ? "✓ Pass" : "⚠ Issue"}</strong> (Cycle {h.cycleNo || 0}) • {h.checkedBy}
                      <div style={{ fontSize: "10px", color: "#94a3b8" }}>{new Date(h.checkedAt || h.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#94a3b8", textAlign: "center", padding: "10px" }}>
                  Initial inspection cycle (Cycle 0)
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PASS Confirmation Modal */}
      <QualityPassConfirmModal
        isOpen={isPassModalOpen}
        onClose={() => setIsPassModalOpen(false)}
        productionOrder={productionOrder}
        quantityChecked={quantityChecked}
        acceptedQty={acceptedQty}
        comments={comments}
        onConfirmPass={handleExecutePass}
        isSubmitting={isSubmitting}
      />

      {/* ISSUE Confirmation Modal */}
      <QualityIssueConfirmModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        productionOrder={productionOrder}
        quantityChecked={quantityChecked}
        acceptedQty={acceptedQty}
        rejectedQty={rejectedQty}
        defects={defects}
        correctiveAction={correctiveAction}
        restartOperation={restartOperation}
        issueDetails={issueDetails || comments}
        onConfirmIssue={handleExecuteIssue}
        isSubmitting={isSubmitting}
      />

      {/* QC History Modal */}
      <QcHistoryTimelineModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        productionOrderId={productionOrder.id || productionOrder.productionOrderId}
        productionNo={productionOrder.productionNo}
      />
    </div>
  );
}
