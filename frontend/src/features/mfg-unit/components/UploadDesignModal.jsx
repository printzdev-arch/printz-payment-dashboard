import React, { useEffect, useRef, useState } from "react";
import { FileText, ImagePlus, X } from "lucide-react";
import Modal from "../../sale-order/components/common/Modal";
import mfgApi from "../api/mfgApi";
import { errorMessage } from "../../sale-order/utils/format";
import "../styles/mfg-unit.css";

const PREVIEW_EXT = ["jpg", "jpeg", "png"];
const PRINT_EXT = ["pdf", "ai", "cdr", "psd", "tif", "tiff"];
const ext = (f) => f.name.split(".").pop().toLowerCase();

// Upload a new design version: a preview image (goes to the customer) and an optional print-ready file (stays internal).
export default function UploadDesignModal({ isOpen, order, onClose, onUploaded }) {
  const previewInput = useRef(null);
  const printInput = useRef(null);
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [printFile, setPrintFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPreview(null);
      setPreviewUrl("");
      setPrintFile(null);
      setNotes("");
      setError("");
    }
  }, [isOpen]);

  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  const nextVersion = (order?.currentDesignVersion || 0) + 1;

  const pickPreview = (file) => {
    if (!file) return;
    if (!PREVIEW_EXT.includes(ext(file))) return setError("The preview must be a JPG or PNG image.");
    if (file.size > 5 * 1024 * 1024) return setError("The preview image must be 5 MB or smaller.");
    setError("");
    setPreview(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const pickPrint = (file) => {
    if (!file) return;
    if (!PRINT_EXT.includes(ext(file))) return setError("The print file must be PDF, AI, CDR, PSD or TIFF.");
    if (file.size > 25 * 1024 * 1024) return setError("The print file must be 25 MB or smaller.");
    setError("");
    setPrintFile(file);
  };

  const submit = async () => {
    if (!preview) {
      setError("Please choose the preview image to send to the customer.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await mfgApi.uploadDesign(order._id, { preview, printFile, designerNotes: notes.trim() });
      onUploaded?.();
    } catch (err) {
      setError(errorMessage(err, "Could not upload the design."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Upload Design · Version ${nextVersion}`}
      subtitle={order ? `${order.orderNo} · ${order.customerSnapshot?.name || ""}` : ""}
      footer={
        <>
          <button type="button" className="so-btn secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="so-btn primary" onClick={submit} disabled={saving}>
            {saving ? "Uploading..." : "Upload Design"}
          </button>
        </>
      }
    >
      {error && <div className="so-alert error"><span>{error}</span></div>}

      <div className="so-field">
        <label>Preview image for the customer <span className="req">*</span></label>
        <div className="mfg-preview-box" onClick={() => previewInput.current?.click()} role="button" tabIndex={0}
             onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && previewInput.current?.click()}>
          {previewUrl ? (
            <img src={previewUrl} alt="Design preview" />
          ) : (
            <div>
              <ImagePlus size={30} style={{ marginBottom: 6 }} />
              <div><strong style={{ color: "#334155" }}>Click to choose the preview image</strong></div>
              <div className="so-hint">JPG or PNG · up to 5 MB</div>
            </div>
          )}
        </div>
        <input ref={previewInput} type="file" accept=".jpg,.jpeg,.png" style={{ display: "none" }} onChange={(e) => pickPreview(e.target.files?.[0])} />
        <span className="so-hint">This image is sent to the customer on WhatsApp for approval.</span>
      </div>

      <div className="so-field">
        <label>Print-ready file (optional)</label>
        {printFile ? (
          <div className="so-file-chip" style={{ alignSelf: "flex-start" }}>
            <FileText size={14} />
            <span>{printFile.name}</span>
            <button type="button" onClick={() => setPrintFile(null)} aria-label="Remove print file"><X size={14} /></button>
          </div>
        ) : (
          <button type="button" className="so-btn secondary" style={{ alignSelf: "flex-start" }} onClick={() => printInput.current?.click()}>
            <FileText size={14} /> Choose print file
          </button>
        )}
        <input ref={printInput} type="file" accept=".pdf,.ai,.cdr,.psd,.tif,.tiff" style={{ display: "none" }} onChange={(e) => pickPrint(e.target.files?.[0])} />
        <span className="so-hint">PDF, AI, CDR, PSD or TIFF · up to 25 MB. Kept internal, never sent to the customer.</span>
      </div>

      <div className="so-field">
        <label>Note (optional)</label>
        <textarea className="so-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the branch should know about this version" />
      </div>
    </Modal>
  );
}
