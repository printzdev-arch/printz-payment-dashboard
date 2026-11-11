import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, BadgeCheck, Download, Hand, Lightbulb, PackageCheck, Printer, RefreshCw, Send, Truck, Upload } from "lucide-react";
import mfgApi from "../api/mfgApi";
import saleOrderApi from "../../sale-order/api/saleOrderApi";
import UploadDesignModal from "../components/UploadDesignModal";
import SendDesignModal from "../components/SendDesignModal";
import StartPrintModal from "../components/StartPrintModal";
import FinishPrintModal from "../components/FinishPrintModal";
import DispatchModal from "../components/DispatchModal";
import OrderDetailBody from "../../sale-order/components/common/OrderDetailBody";
import RecordApprovalModal from "../../sale-order/components/common/RecordApprovalModal";
import { OrderStatusBadge, PriorityTag } from "../../sale-order/components/common/OrderStatusBadge";
import { errorMessage } from "../../sale-order/utils/format";
import { QUEUE_STATUSES, currentUser, takenByLabel } from "../utils/mfgStages";
import "../../sale-order/styles/sale-order.css";
import "../styles/mfg-unit.css";

// What to do next, by status. Anyone at the unit can do it, whoever took the order.
const hintFor = (status, hasDraft, printFinished) => {
  if (QUEUE_STATUSES.includes(status)) return "This order is waiting in the queue. Take it to start the design.";
  if (status === "IN_DESIGN" && !hasDraft) return "Prepare the design and upload it.";
  if (status === "IN_DESIGN" && hasDraft) return "The design is ready. Send it to the customer on WhatsApp for approval.";
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
  const me = useMemo(() => currentUser(), []);
  const canWork = me.isMfgUnit || me.isAdmin;

  const [order, setOrder] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(""); // upload | send | decision | startPrint | finishPrint | dispatch

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
  const approvedDesign = (order.designs || []).find((d) => d.status === "APPROVED");
  const printFinished = Boolean(order.printing?.completedAt);
  const takenBy = takenByLabel(order);

  const can = {
    take: canWork && QUEUE_STATUSES.includes(status),
    upload: canWork && ["IN_DESIGN", "CHANGES_REQUESTED"].includes(status) && !draftVersion,
    send: canWork && status === "IN_DESIGN" && Boolean(draftVersion),
    decide: canWork && status === "SENT_FOR_APPROVAL",
    printFile: canWork && ["APPROVED", "PRINTING"].includes(status) && Boolean(approvedDesign?.hasPrintFile),
    startPrint: canWork && status === "APPROVED",
    finishPrint: canWork && status === "PRINTING" && !printFinished,
    dispatch: canWork && status === "PRINTING" && printFinished,
  };

  const run = (work, okMessage, failMessage) => async () => {
    try {
      setBusy(true);
      await work();
      if (okMessage) toast.success(okMessage);
      await load(true);
    } catch (err) {
      toast.error(errorMessage(err, failMessage));
    } finally {
      setBusy(false);
    }
  };

  const take = run(() => mfgApi.take(order._id), "You took this order. Start the design.", "Could not take this order.");
  const downloadPrintFile = run(() => mfgApi.downloadPrintFile(order._id, approvedDesign.versionNo), "", "Could not download the print file.");

  const hint = canWork ? hintFor(status, Boolean(draftVersion), printFinished) : "";
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
            {takenBy ? ` · Taken by ${takenBy}` : ""}
          </p>
        </div>

        <div className="so-header-actions">
          <button type="button" className="so-btn secondary" onClick={() => load(true)}>
            <RefreshCw size={14} /> Refresh
          </button>
          {can.take && (
            <button type="button" className="so-btn primary" onClick={take} disabled={busy}>
              <Hand size={15} /> {busy ? "Taking..." : "Take Order"}
            </button>
          )}
          {can.upload && (
            <button type="button" className="so-btn primary" onClick={() => setModal("upload")}>
              <Upload size={15} /> Upload Design
            </button>
          )}
          {can.send && (
            <button type="button" className="so-btn primary" onClick={() => setModal("send")}>
              <Send size={15} /> Send to Customer
            </button>
          )}
          {can.decide && (
            <button type="button" className="so-btn primary" onClick={() => setModal("decision")}>
              <BadgeCheck size={15} /> Record Customer Decision
            </button>
          )}
          {can.printFile && (
            <button type="button" className="so-btn secondary" onClick={downloadPrintFile} disabled={busy}>
              <Download size={15} /> Print File
            </button>
          )}
          {can.startPrint && (
            <button type="button" className="so-btn primary" onClick={() => setModal("startPrint")}>
              <Printer size={15} /> Start Printing
            </button>
          )}
          {can.finishPrint && (
            <button type="button" className="so-btn primary" onClick={() => setModal("finishPrint")}>
              <PackageCheck size={15} /> Finish Printing
            </button>
          )}
          {can.dispatch && (
            <button type="button" className="so-btn primary" onClick={() => setModal("dispatch")}>
              <Truck size={15} /> Dispatch to Branch
            </button>
          )}
        </div>
      </div>

      

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
      <StartPrintModal isOpen={modal === "startPrint"} order={order} onClose={() => setModal("")} onDone={afterAction("Printing started")} />
      <FinishPrintModal isOpen={modal === "finishPrint"} order={order} onClose={() => setModal("")} onDone={afterAction("Printing finished")} />
      <DispatchModal isOpen={modal === "dispatch"} order={order} onClose={() => setModal("")} onDone={afterAction("Order dispatched to the branch")} />
    </div>
  );
}
