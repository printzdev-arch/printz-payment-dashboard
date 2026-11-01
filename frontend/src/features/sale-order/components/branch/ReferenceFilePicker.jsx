import React, { useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import "../../styles/sale-order.css";

const ALLOWED = ["jpg", "jpeg", "png", "pdf"];
const MAX_FILES = 5;
const MAX_MB = 10;

// Customer logos / sample artwork. Files are uploaded right after the draft is saved.
export default function ReferenceFilePicker({ files, onChange, alreadyAttached = 0 }) {
  const inputRef = useRef(null);
  const [problem, setProblem] = useState("");

  const addFiles = (list) => {
    const incoming = Array.from(list || []);
    const next = [...files];
    let message = "";
    for (const f of incoming) {
      const ext = f.name.split(".").pop().toLowerCase();
      if (!ALLOWED.includes(ext)) {
        message = `${f.name}: only JPG, PNG or PDF files are allowed.`;
        continue;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        message = `${f.name}: file is larger than ${MAX_MB} MB.`;
        continue;
      }
      if (alreadyAttached + next.length >= MAX_FILES) {
        message = `You can attach at most ${MAX_FILES} files.`;
        break;
      }
      next.push(f);
    }
    setProblem(message);
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <div className="so-dropzone" onClick={() => inputRef.current?.click()} role="button" tabIndex={0}
           onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}>
        <UploadCloud size={24} />
        <div><strong>Click to add files</strong> (logos, photos, sample artwork)</div>
        <div className="so-hint">JPG, PNG or PDF · up to {MAX_MB} MB each · maximum {MAX_FILES} files</div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.pdf"
          style={{ display: "none" }}
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>
      {problem && <div className="so-field-error" style={{ marginTop: 8 }}>{problem}</div>}
      {files.length > 0 && (
        <div className="so-file-list">
          {files.map((f, idx) => (
            <div className="so-file-chip" key={`${f.name}-${idx}`}>
              <FileText size={14} />
              <span title={f.name}>{f.name}</span>
              <button type="button" onClick={() => onChange(files.filter((_, i) => i !== idx))} aria-label={`Remove ${f.name}`}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
