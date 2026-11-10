import React from "react";
import { Image as ImageIcon, CheckCircle2, MessageSquareWarning, Send } from "lucide-react";
import { fileUrl, formatDateTime } from "../../utils/format";
import { typeLabel } from "../../utils/saleOrderStatus";
import "../../styles/sale-order.css";

const VERSION_TONE = {
  DRAFT: "slate",
  SENT: "orange",
  APPROVED: "green",
  CHANGES_REQUESTED: "red",
  SUPERSEDED: "gray",
};

// Every design version the unit has made for an order, newest first, with the customer's decision.
export default function DesignVersions({ designs = [] }) {
  if (!designs.length) {
    return (
      <div className="so-empty" style={{ padding: "26px 10px" }}>
        <ImageIcon size={30} />
        <strong>No design yet</strong>
        The designer's uploaded design versions will appear here.
      </div>
    );
  }

  const ordered = [...designs].sort((a, b) => b.versionNo - a.versionNo);

  return (
    <div className="so-design-list">
      {ordered.map((d, idx) => {
        const decision = d.customerDecision;
        return (
          <div key={d._id} className={`so-design ${idx === 0 ? "latest" : ""}`}>
            <a
              className="so-design-preview"
              href={fileUrl(d.previewUrl)}
              target="_blank"
              rel="noreferrer"
              title="Open full size"
            >
              {d.previewUrl ? <img src={fileUrl(d.previewUrl)} alt={`Design version ${d.versionNo}`} /> : <ImageIcon size={26} />}
            </a>
            <div>
              <div className="so-design-top">
                <strong>Version {d.versionNo}</strong>
                <span className={`so-badge ${VERSION_TONE[d.status] || "slate"}`}>{typeLabel(d.status)}</span>
                {idx === 0 && <span className="so-hint">Latest</span>}
              </div>
              <div className="so-design-meta">
                Uploaded {formatDateTime(d.createdAt)}
                {d.sentAt && (
                  <>
                    <br />
                    <Send size={11} style={{ verticalAlign: "-1px" }} /> Sent to customer {formatDateTime(d.sentAt)}
                  </>
                )}
                {d.hasPrintFile && (
                  <>
                    <br />
                    Print-ready file attached
                  </>
                )}
              </div>
              {d.designerNotes ? <div className="so-design-note">Designer note: {d.designerNotes}</div> : null}
              {decision && (
                <div className={`so-design-decision ${decision.decision === "APPROVED" ? "ok" : "changes"}`}>
                  {decision.decision === "APPROVED" ? (
                    <CheckCircle2 size={13} style={{ verticalAlign: "-2px" }} />
                  ) : (
                    <MessageSquareWarning size={13} style={{ verticalAlign: "-2px" }} />
                  )}{" "}
                  <strong>{decision.decision === "APPROVED" ? "Approved" : "Changes requested"}</strong> ·{" "}
                  {typeLabel(decision.channel)} · {formatDateTime(decision.recordedAt)}
                  {decision.changeNotes ? <div style={{ marginTop: 3 }}>“{decision.changeNotes}”</div> : null}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
