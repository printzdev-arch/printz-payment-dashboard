import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, Eye, Factory, User, FileText, HandCoins, PackageCheck, Pencil, RefreshCw, Wallet, XCircle } from "lucide-react";
import saleOrderApi from "../api/saleOrderApi";
import ReceiveOrderModal from "../components/branch/ReceiveOrderModal";
import DeliverOrderModal from "../components/branch/DeliverOrderModal";
import CancelOrderModal from "../components/branch/CancelOrderModal";
import OrderDetailBody from "../components/common/OrderDetailBody";
import RecordApprovalModal from "../components/common/RecordApprovalModal";
import PlaceOrderModal from "../components/branch/PlaceOrderModal";
import SaleOrderInvoiceModal from "../components/common/SaleOrderInvoiceModal";
import { OrderStatusBadge, PriorityTag } from "../components/common/OrderStatusBadge";
import { errorMessage, formatMoney } from "../utils/format";
import "../styles/sale-order.css";

const CANCELLABLE = [
  "DRAFT", "PLACED", "WAITING_FOR_DESIGNER", "ASSIGNED", "IN_DESIGN",
  "SENT_FOR_APPROVAL", "CHANGES_REQUESTED", "APPROVED", "PRINTING",
];
const MANAGER_ROLES = ["manager", "branch_manager", "branch_manager1", "admin", "super_admin"];

// One order, seen from the branch. The actions offered depend on where the order is in its journey.
export default function SaleOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scope = useMemo(() => saleOrderApi.getUserScope(), []);

  const [order, setOrder] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPlace, setShowPlace] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [modal, setModal] = useState(""); // receive | deliver | cancel

  const load = useCallback(
    async (quiet = false) => {
      try {
        if (!quiet) setLoading(true);
        setError("");
        const [o, t] = await Promise.all([saleOrderApi.get(id), saleOrderApi.timeline(id)]);
        setOrder(o);
        setEvents(t);
        return o;
      } catch (err) {
        setError(errorMessage(err, "Could not load this order."));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load().then((o) => {
      // Coming from "Save & Collect Advance": open the payment popup straight away
      if (o?.status === "DRAFT" && searchParams.get("place") === "1") {
        setShowPlace(true);
        // Drop the flag from the address bar without a router navigation (which would reset this page)
        window.history.replaceState(window.history.state, "", window.location.pathname);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  if (loading) return <div className="so-page"><div className="so-loading">Loading order...</div></div>;

  if (error || !order) {
    return (
      <div className="so-page">
        <button type="button" className="so-back-link" onClick={() => navigate("/sale-orders")}><ArrowLeft size={15} /> Back</button>
        <div className="so-alert error"><span>{error || "Order not found."}</span></div>
      </div>
    );
  }

  const isDraft = order.status === "DRAFT";
  const canOverride = MANAGER_ROLES.includes(scope.role);
  const designStarted = !["DRAFT", "PLACED", "WAITING_FOR_DESIGNER", "ASSIGNED"].includes(order.status);
  // Managers cancel before design starts; after that only an admin can
  const canCancel =
    CANCELLABLE.includes(order.status) && order.status !== "DRAFT" && (scope.isAdmin || (canOverride && !designStarted));
  const done = (message) => async () => {
    setModal("");
    toast.success(message);
    await load(true);
  };

  return (
    <div className="so-page">
      <button type="button" className="so-back-link" onClick={() => navigate("/sale-orders")}>
        <ArrowLeft size={15} /> Back
      </button>

      <div className="so-header">
        <div className="so-title">
          <div className="so-title-row">
            <h1>{isDraft ? "Draft Order" : order.orderNo}</h1>
            <OrderStatusBadge status={order.status} />
            <PriorityTag priority={order.priority} />
          </div>
          <div className="so-meta-row">
            <span className="so-meta-item"><User size={13} /> {order.customerSnapshot?.name || "—"}</span>
            <span className="so-meta-sep" />
            <span className="so-meta-item"><Building2 size={13} /> {order.orderBranch?.name || "—"}</span>
            {order.manufacturingUnit?.name && (
              <>
                <ArrowRight size={13} className="so-meta-arrow" />
                <span className="so-meta-item"><Factory size={13} /> {order.manufacturingUnit.name}</span>
              </>
            )}
          </div>
        </div>

        <div className="so-header-actions">
          <button type="button" className="so-btn secondary" onClick={() => load(true)} title="Refresh">
            <RefreshCw size={14} /> Refresh
          </button>
          {!isDraft && (
            <button
              type="button"
              className="so-btn secondary"
              onClick={() => {
                setInvoiceOrder(order);
                setShowInvoice(true);
              }}
              title="View Invoice"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <FileText size={15} /> View Invoice
            </button>
          )}
          {isDraft && (
            <>
              <button type="button" className="so-btn secondary" onClick={() => navigate(`/sale-orders/${order._id}/edit`)}>
                <Pencil size={14} /> Edit Draft
              </button>
              <button type="button" className="so-btn primary" onClick={() => setShowPlace(true)}>
                <Wallet size={15} /> Collect Advance & Place
              </button>
            </>
          )}
          {order.status === "SENT_FOR_APPROVAL" && (
            <button type="button" className="so-btn primary" onClick={() => setShowApproval(true)}>
              <BadgeCheck size={15} /> Record Customer Decision
            </button>
          )}
          {order.status === "DISPATCHED" && (
            <button type="button" className="so-btn primary" onClick={() => setModal("receive")}>
              <PackageCheck size={15} /> Receive at Branch
            </button>
          )}
          {order.status === "RECEIVED_AT_BRANCH" && (
            <button type="button" className="so-btn primary" onClick={() => setModal("deliver")}>
              <HandCoins size={15} /> {Number(order.balanceDue) > 0 ? "Collect Balance & Deliver" : "Deliver to Customer"}
            </button>
          )}
          {canCancel && (
            <button type="button" className="so-btn danger" onClick={() => setModal("cancel")}>
              <XCircle size={15} /> Cancel Order
            </button>
          )}
        </div>
      </div>

      {order.status === "DISPATCHED" && (
        <div className="so-alert info">
          <span>
            <strong>The order is on its way{order.dispatch?.dispatchNo ? ` (${order.dispatch.dispatchNo})` : ""}.</strong>{" "}
            When it arrives, count the packages and mark it received.
          </span>
        </div>
      )}
      {order.status === "RECEIVED_AT_BRANCH" && (
        <div className="so-alert success so-alert-rich">
          <span className="so-alert-icon"><PackageCheck size={18} /></span>
          <div className="so-alert-text">
            <strong>
              {scope.isAdmin
                ? `The order is at ${order.orderBranch?.name || "the"} branch.`
                : "The order is at your branch."}
            </strong>
            <span>
              {Number(order.balanceDue) > 0
                ? `Collect the balance of ${formatMoney(order.balanceDue)} and hand it to the customer.`
                : "Fully paid. Hand it to the customer."}
            </span>
          </div>
        </div>
      )}

      {order.status === "SENT_FOR_APPROVAL" && (
        <div className="so-alert info">
          <span>
            <strong>The design was sent to the customer on WhatsApp.</strong> When the customer calls you with their
            answer, record it here so the unit can continue.
          </span>
        </div>
      )}

      <OrderDetailBody order={order} events={events} />

      <PlaceOrderModal
        isOpen={showPlace}
        order={order}
        canOverride={canOverride}
        onClose={() => setShowPlace(false)}
        onPlaced={async (placed) => {
          setShowPlace(false);
          toast.success(`Order placed & invoice generated${placed?.orderNo ? `: ${placed.orderNo}` : ""}`);
          const reloaded = await load(true);
          setInvoiceOrder(reloaded || placed);
          setShowInvoice(true);
        }}
      />

      <ReceiveOrderModal isOpen={modal === "receive"} order={order} onClose={() => setModal("")} onDone={done("Marked as received at the branch")} />
      <DeliverOrderModal
        isOpen={modal === "deliver"}
        order={order}
        onClose={() => setModal("")}
        onDone={async (delivered) => {
          setModal("");
          toast.success("Order delivered & full payment collected!");
          const reloaded = await load(true);
          const finalOrder = reloaded || delivered;
          if (finalOrder) {
            setInvoiceOrder(finalOrder);
            setShowInvoice(true);
          }
        }}
      />
      <CancelOrderModal
        isOpen={modal === "cancel"}
        order={order}
        designStarted={designStarted}
        onClose={() => setModal("")}
        onDone={done("Order cancelled")}
      />

      <RecordApprovalModal
        isOpen={showApproval}
        order={order}
        defaultChannel="CALL_TO_BRANCH"
        onClose={() => setShowApproval(false)}
        onDone={async (decision) => {
          setShowApproval(false);
          toast.success(decision === "APPROVED" ? "Design approved. The unit can start printing." : "Sent back to the manufacturing unit for changes.");
          await load(true);
        }}
      />
      <SaleOrderInvoiceModal
        isOpen={showInvoice}
        order={invoiceOrder || order}
        onClose={() => setShowInvoice(false)}
      />
    </div>
  );
}
