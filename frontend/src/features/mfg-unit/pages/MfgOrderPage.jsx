import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, BadgeCheck, Download, Lightbulb, PackageCheck, Play, Printer, RefreshCw, Send, Truck, Upload, UserCog } from "lucide-react";
import mfgApi from "../api/mfgApi";
import saleOrderApi from "../../sale-order/api/saleOrderApi";
import UploadDesignModal from "../components/UploadDesignModal";
import SendDesignModal from "../components/SendDesignModal";
import AssignDesignerModal from "../components/AssignDesignerModal";
import FinishPrintModal from "../components/FinishPrintModal";
import DispatchModal from "../components/DispatchModal";
import OrderDetailBody from "../../sale-order/components/common/OrderDetailBody";
import RecordApprovalModal from "../../sale-order/components/common/RecordApprovalModal";
import { OrderStatusBadge, PriorityTag } from "../../sale-order/components/common/OrderStatusBadge";
import { errorMessage } from "../../sale-order/utils/format";
import { getMfgRole } from "../utils/mfgRole";
import "../../sale-order/styles/sale-order.css";
import "../styles/mfg-unit.css";

const REASSIGNABLE = ["ASSIGNED", "IN_DESIGN", "SENT_FOR_APPROVAL", "CHANGES_REQUESTED", "APPROVED"];

// Next-step guidance for the designer, by status
const hintFor = (status, hasDraft, printFinished) => {
  if (status === "ASSIGNED") return "This order was assigned to you. Open it to start working on the design.";
  if (status === "IN_DESIGN" && !hasDraft) return "Prepare the design and upload it as the first version.";
  if (status === "IN_DESIGN" && hasDraft) return "Your design is ready. Send it to the customer on WhatsApp for approval.";
  if (status === "CHANGES_REQUESTED") return "The customer wants changes. Read the note below and upload a new version.";
  if (status === "SENT_FOR_APPROVAL") return "Waiting for the customer. When they reply or call, record their decision.";
  if (status === "APPROVED") return "The customer approved the design. Download the print file and start printing.";
  if (status === "PRINTING" && !printFinished) return "Print the order, then record the printed quantity.";
  if (status === "PRINTING" && printFinished) return "Printing is done. Pack it and dispatch it to the branch.";
  if (status === "DISPATCHED") return "On its way to the branch. Nothing more to do.";
  return "";
};

export default function MfgOrderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = useMemo(() => getMfgRole(), []);

  const [order, setOrder] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(""); // upload | send | decision | assign | reassign

  const load = useCallback(
    async (quiet = false) => {
      try {
        if (!quiet) setLoading(true);
        setError("");
        const [o, t] = await Promise.all([saleOrderApi.get(id), saleOrderApi.timeline(id)]);
        setOrder(o);
        setEvents(t);
      } catch (err) {
        setError(errorMessage(err, "Could not load this order."));
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="so-page"><div className="so-loading">Loading order...</div></div>;
  if (error || !order) {
    return (
      <div className="so-page">
        <button type="button" className="so-back-link" onClick={() => navigate("/mfg/orders")}><ArrowLeft size={15} /> Back to orders</button>
        <div className="so-alert error"><span>{error || "Order not found."}</span></div>
      </div>
    );
  }

  const status = order.status;
  const draftVersion = (order.designs || []).find((d) => d.status === "DRAFT");
  const isAssignee = me.isDesigner && String(order.currentAssignment?.designerUserId || "") === me.userId;

  const canStart = isAssignee && status === "ASSIGNED";
  const canUpload = isAssignee && ["IN_DESIGN", "CHANGES_REQUESTED"].includes(status) && !draftVersion;
  const canSend = isAssignee && status === "IN_DESIGN" && Boolean(draftVersion);
  const canDecide = isAssignee && status === "SENT_FOR_APPROVAL";
  const canWorkPrint = isAssignee || me.isAdmin; // the designer prints and dispatches; an admin can step in
  const printFinished = Boolean(order.printing?.completedAt);
  const approvedDesign = (order.designs || []).find((d) => d.status === "APPROVED");
  const canStartPrint = canWorkPrint && status === "APPROVED";
  const canFinishPrint = canWorkPrint && status === "PRINTING" && !printFinished;
  const canDispatch = canWorkPrint && status === "PRINTING" && printFinished;
  const canDownloadPrintFile =
    (isAssignee || me.isManager) && ["APPROVED", "PRINTING"].includes(status) && Boolean(approvedDesign?.hasPrintFile);
  const canAssign = me.isManager && ["PLACED", "WAITING_FOR_DESIGNER"].includes(status);
  const canReassign = me.isManager && REASSIGNABLE.includes(status);

  const start = async () => {
    try {
      setBusy(true);
      await mfgApi.startDesign(order._id);
      toast.success("Design started");
      await load(true);
    } catch (err) {
      toast.error(errorMessage(err, "Could not start the design."));
    } finally {
      setBusy(false);
    }
  };

  const startPrint = async () => {
    try {
      setBusy(true);
      await mfgApi.startPrint(order._id);
      toast.success("Printing started");
      await load(true);
    } catch (err) {
      toast.error(errorMessage(err, "Could not start printing."));
    } finally {
      setBusy(false);
    }
  };

  const downloadPrintFile = async () => {
    try {
      setBusy(true);
      await mfgApi.downloadPrintFile(order._id, approvedDesign.versionNo);
    } catch (err) {
      toast.error("Could not download the print file. This version may not have one.");
    } finally {
      setBusy(false);
    }
  };

  const hint = isAssignee ? hintFor(status, Boolean(draftVersion), printFinished) : "";
  const afterAction = (message) => async () => {
    setModal("");
    if (message) toast.success(message);
    await load(true);
  };

  return (
    <div className="so-page">
      <button type="button" className="so-back-link" onClick={() => navigate("/mfg/orders")}>
        <ArrowLeft size={15} /> Back to orders
      </button>

      <div className="so-header">
        <div className="so-title">
          <div className="so-title-row">
            <h1>{order.orderNo}</h1>
            <OrderStatusBadge status={status} />
            <PriorityTag priority={order.priority} />
          </div>
          <p>
            {order.customerSnapshot?.name} · from {order.orderBranch?.name}
            {order.currentAssignment?.designerName && me.isManager ? ` · Designer: ${order.currentAssignment.designerName}` : ""}
          </p>
        </div>

        <div className="so-header-actions">
          <button type="button" className="so-btn secondary" onClick={() => load(true)}>
            <RefreshCw size={14} /> Refresh
          </button>
          {canStart && (
            <button type="button" className="so-btn primary" onClick={start} disabled={busy}>
              <Play size={14} /> {busy ? "Starting..." : "Start Design"}
            </button>
          )}
          {canUpload && (
            <button type="button" className="so-btn primary" onClick={() => setModal("upload")}>
              <Upload size={15} /> Upload Design
            </button>
          )}
          {canSend && (
            <button type="button" className="so-btn primary" onClick={() => setModal("send")}>
              <Send size={15} /> Send to Customer
            </button>
          )}
          {canDecide && (
            <button type="button" className="so-btn primary" onClick={() => setModal("decision")}>
              <BadgeCheck size={15} /> Record Customer Decision
            </button>
          )}
          {canDownloadPrintFile && (
            <button type="button" className="so-btn secondary" onClick={downloadPrintFile} disabled={busy}>
              <Download size={15} /> Print File
            </button>
          )}
          {canStartPrint && (
            <button type="button" className="so-btn primary" onClick={startPrint} disabled={busy}>
              <Printer size={15} /> {busy ? "Starting..." : "Start Printing"}
            </button>
          )}
          {canFinishPrint && (
            <button type="button" className="so-btn primary" onClick={() => setModal("finishPrint")}>
              <PackageCheck size={15} /> Finish Printing
            </button>
          )}
          {canDispatch && (
            <button type="button" className="so-btn primary" onClick={() => setModal("dispatch")}>
              <Truck size={15} /> Dispatch to Branch
            </button>
          )}
          {canAssign && (
            <button type="button" className="so-btn primary" onClick={() => setModal("assign")}>
              <UserCog size={15} /> Assign Designer
            </button>
          )}
          {canReassign && (
            <button type="button" className="so-btn secondary" onClick={() => setModal("reassign")}>
              <UserCog size={15} /> Reassign
            </button>
          )}
        </div>
      </div>

      {hint && (
        <div className="so-alert success">
          <Lightbulb size={17} />
          <span><strong>Next step:</strong> {hint}</span>
        </div>
      )}

      <OrderDetailBody order={order} events={events} />

      <UploadDesignModal isOpen={modal === "upload"} order={order} onClose={() => setModal("")} onUploaded={afterAction("Design uploaded")} />
      <SendDesignModal isOpen={modal === "send"} order={order} design={draftVersion} onClose={() => setModal("")} onSent={afterAction("Design sent to the customer on WhatsApp")} />
      <RecordApprovalModal
        isOpen={modal === "decision"}
        order={order}
        defaultChannel="CALL_TO_DESIGNER"
        onClose={() => setModal("")}
        onDone={(decision) => afterAction(decision === "APPROVED" ? "Design approved" : "Marked for changes")()}
      />
      <FinishPrintModal isOpen={modal === "finishPrint"} order={order} onClose={() => setModal("")} onDone={afterAction("Printing finished")} />
      <DispatchModal isOpen={modal === "dispatch"} order={order} onClose={() => setModal("")} onDone={afterAction("Order dispatched to the branch")} />
      <AssignDesignerModal isOpen={modal === "assign"} order={order} mode="assign" onClose={() => setModal("")} onDone={afterAction("Order assigned")} />
      <AssignDesignerModal isOpen={modal === "reassign"} order={order} mode="reassign" onClose={() => setModal("")} onDone={afterAction("Order reassigned")} />
    </div>
  );
}
