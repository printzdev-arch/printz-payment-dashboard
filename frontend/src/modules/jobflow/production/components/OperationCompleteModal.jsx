import React, { useState, useEffect } from "react";
import { X, CheckCircle, Plus, Trash2, Box, AlertTriangle } from "lucide-react";
import jobFlowApi from "../api/productionApi";
import { toast } from "react-toastify";
import StyledSelect from "../../../../shared/ui/selects/StyledSelect";

export const OperationCompleteModal = ({
  isOpen,
  onClose,
  operation,
  productionOrder,
  onSuccess,
}) => {
  const [inputQuantity, setInputQuantity] = useState("");
  const [outputQuantity, setOutputQuantity] = useState("");
  const [completedQuantity, setCompletedQuantity] = useState("");
  const [materials, setMaterials] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [isPackingConfirmation, setIsPackingConfirmation] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isPacking =
    (operation?.operationName || operation?.operation || "").toLowerCase().includes("pack") ||
    (operation?.operationCode || "").toUpperCase() === "PACKING";

  // Stock items (existing stock) for the material lines
  useEffect(() => {
    if (!isOpen) return;
    jobFlowApi
      .getStocks({ limit: 500 })
      .then((r) => setStocks(((r?.data || r)?.items) || []))
      .catch(() => setStocks([]));
  }, [isOpen]);

  useEffect(() => {
    if (operation) {
      const inQty = operation.inputQty || operation.plannedQty || productionOrder?.plannedQty || "";
      setInputQuantity(inQty);
      setOutputQuantity(operation.outputQty || inQty);
      setCompletedQuantity(operation.completedQty || inQty);
      setRemarks(operation.remarks || "");

      // The materials planned for this step (from the production plan), already scaled to this step's quantity
      setMaterials(
        (operation.materials || []).map((m) => ({
          itemId: m.itemId || null,
          item: m.name,
          type: "Direct Stock",
          quantity: m.plannedQty,
          unit: m.unit || "",
        }))
      );
    }
  }, [operation, productionOrder]);

  if (!isOpen || !operation) return null;

  const handleAddMaterial = () => {
    setMaterials((prev) => [
      ...prev,
      { itemId: null, item: "", type: "Direct Stock", quantity: 0, unit: "" },
    ]);
  };

  const handleRemoveMaterial = (index) => {
    setMaterials((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateMaterial = (index, field, value) => {
    setMaterials((prev) =>
      prev.map((m, idx) => (idx === index ? { ...m, [field]: value } : m))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const inQty = Number(inputQuantity);
    const outQty = Number(outputQuantity);
    const compQty = Number(completedQuantity);

    if (inQty < 0 || outQty < 0 || compQty < 0) {
      toast.error("Quantities cannot be negative numbers.");
      return;
    }

    if (outQty > inQty) {
      const confirmExceed = window.confirm(
        `Output quantity (${outQty}) exceeds input quantity (${inQty}). Are you sure you want to proceed?`
      );
      if (!confirmExceed) return;
    }

    setSubmitting(true);
    try {
      const opId = operation._id || operation.id;
      const payload = {
        inputQty: inQty,
        outputQty: outQty,
        completedQty: compQty,
        // Lines linked to a stock item reduce that stock; the others are only recorded
        consumption: materials
          .filter((m) => m.itemId && Number(m.quantity) > 0)
          .map((m) => ({
            itemId: m.itemId,
            quantity: Number(m.quantity),
            unit: m.unit || undefined,
            consumptionType: m.type === "Wastage / Setup" ? "WASTAGE" : "MATERIAL",
          })),
        materialConsumption: materials
          .filter((m) => !m.itemId && m.item && Number(m.quantity) > 0)
          .map((m) => ({
            materialName: m.item,
            consumptionType: m.type,
            quantity: Number(m.quantity),
            unit: m.unit || "Units",
          })),
        remarks,
        actualEnd: new Date(),
      };

      await jobFlowApi.completeOperation(opId, payload);
      toast.success(
        `Operation "${operation.operationName || operation.operation}" completed successfully!`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete operation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal jf-modal-lg jf-modal-scroll">
        <div className="jf-modal-header">
          <div className="prod-modal-header-left">
            <div className="prod-modal-icon-badge green">
              <CheckCircle size={18} />
            </div>
            <div>
              <h3 className="jf-modal-title">Complete Production Operation</h3>
              <span className="prod-modal-subtitle">
                Step #{operation.sequenceNo || operation.sequence}:{" "}
                {operation.operationName || operation.operation}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm prod-modal-close-btn"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="jf-modal-body prod-modal-body-stack">
            {/* Header Context Summary */}
            <div className="prod-modal-info-box prod-modal-info-box--4col">
              <div>
                <span className="prod-modal-label">Job Order:</span>
                <strong className="prod-modal-val">
                  {productionOrder?.jobOrderNo || productionOrder?.jobOrderId?.jobNo || "JO-CURRENT"}
                </strong>
              </div>
              <div>
                <span className="prod-modal-label">Station:</span>
                <strong className="prod-modal-val">
                  {operation.machine || "Floor Station"}
                </strong>
              </div>
              <div>
                <span className="prod-modal-label">Current Status:</span>
                <span className="jf-badge jf-badge-warning">RUNNING</span>
              </div>
            </div>

            {/* Quantity Metrics */}
            <div className="prod-modal-grid-3">
              <div className="jf-form-group">
                <label className="jf-label">Input Quantity</label>
                <input
                  type="number"
                  min="0"
                  className="jf-input"
                  value={inputQuantity}
                  onChange={(e) => setInputQuantity(e.target.value)}
                  required
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Output (Good) Quantity *</label>
                <input
                  type="number"
                  min="0"
                  className="jf-input"
                  value={outputQuantity}
                  onChange={(e) => {
                    setOutputQuantity(e.target.value);
                    setCompletedQuantity(e.target.value);
                  }}
                  required
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Completed Quantity *</label>
                <input
                  type="number"
                  min="0"
                  className="jf-input"
                  value={completedQuantity}
                  onChange={(e) => setCompletedQuantity(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Scrap warning indicator */}
            {Number(inputQuantity) > Number(outputQuantity) && (
              <div className="prod-modal-alert prod-modal-alert--amber prod-btn-with-icon">
                <AlertTriangle size={16} />
                <span>
                  Scrap / Variance detected:{" "}
                  <strong>{Number(inputQuantity) - Number(outputQuantity)} pieces</strong> will be recorded as operational wastage.
                </span>
              </div>
            )}

            {/* Repeatable Material Consumption Section */}
            <div className="prod-mat-section">
              <div className="prod-mat-header">
                <div>
                  <h4 className="prod-mat-title">
                    Material Consumption Tracking
                  </h4>
                  <span className="prod-mat-subtitle">
                    Record inventory consumed, substrates, films, or inks.
                  </span>
                </div>
                <button
                  type="button"
                  className="jf-btn jf-btn-secondary jf-btn-sm prod-btn-with-icon"
                  onClick={handleAddMaterial}
                >
                  <Plus size={14} />
                  Add Material
                </button>
              </div>

              {materials.length === 0 ? (
                <div className="prod-mat-empty">
                  No materials consumed for this operation step.
                </div>
              ) : (
                <div className="prod-mat-list">
                  {materials.map((mat, idx) => (
                    <div key={idx} className="prod-mat-row">
                      <StyledSelect
                        className="jf-input jf-input-sm"
                        value={mat.itemId || ""}
                        onChange={(e) => {
                          const stock = stocks.find((s) => s.id === e.target.value);
                          setMaterials((prev) =>
                            prev.map((m, i) =>
                              i === idx
                                ? stock
                                  ? { ...m, itemId: stock.id, item: stock.name, unit: m.unit || stock.unit || "" }
                                  : { ...m, itemId: null }
                                : m
                            )
                          );
                        }}
                      >
                        <option value="">{mat.itemId ? "" : mat.item ? `${mat.item} (not linked to stock)` : "Choose stock item"}</option>
                        {stocks.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.quantity}{s.unit ? ` ${s.unit}` : ""})</option>
                        ))}
                      </StyledSelect>
                      <StyledSelect
                        className="jf-input jf-input-sm"
                        value={mat.type}
                        onChange={(e) => handleUpdateMaterial(idx, "type", e.target.value)}
                      >
                        <option value="Direct Stock">Direct Stock</option>
                        <option value="Consumable">Consumable</option>
                        <option value="Wastage / Setup">Wastage / Setup</option>
                      </StyledSelect>
                      <input
                        type="number"
                        min="0"
                        className="jf-input jf-input-sm"
                        placeholder="Qty"
                        value={mat.quantity}
                        onChange={(e) => handleUpdateMaterial(idx, "quantity", e.target.value)}
                      />
                      <input
                        type="text"
                        className="jf-input jf-input-sm"
                        placeholder="Unit (e.g. Sheets)"
                        value={mat.unit}
                        onChange={(e) => handleUpdateMaterial(idx, "unit", e.target.value)}
                      />
                      <button
                        type="button"
                        className="jf-btn jf-btn-danger jf-btn-sm prod-mat-del-btn"
                        onClick={() => handleRemoveMaterial(idx)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Special PACKING section */}
            {isPacking && (
              <div className="prod-modal-packing">
                <div className="prod-modal-packing-title">
                  <Box size={18} className="prod-modal-packing-icon" />
                  <span>Final Packing & Batch Verification</span>
                </div>
                <p className="prod-modal-packing-text">
                  Completing PACKING signifies that all finishing processes are finalized and the order is ready for Quality Control (QC) inspection.
                </p>
                <label className="prod-modal-packing-check">
                  <input
                    type="checkbox"
                    checked={isPackingConfirmation}
                    onChange={(e) => setIsPackingConfirmation(e.target.checked)}
                  />
                  <span>I confirm the packed quantity matches label specifications and bundles are sealed.</span>
                </label>
              </div>
            )}

            {/* Closing Remarks */}
            <div className="jf-form-group">
              <label className="jf-label">Closing Remarks / Operator Sign-off</label>
              <textarea
                className="jf-input"
                rows="2"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="All sheets trimmed to specs, no offset or smudge observed..."
              />
            </div>
          </div>

          <div className="jf-modal-footer">
            <button
              type="button"
              className="jf-btn jf-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="jf-btn jf-btn-primary prod-btn-with-icon"
              disabled={submitting || (isPacking && !isPackingConfirmation)}
            >
              {submitting ? (
                "Completing..."
              ) : (
                <>
                  <CheckCircle size={16} />
                  Complete Operation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OperationCompleteModal;
