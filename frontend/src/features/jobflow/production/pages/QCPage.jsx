import React, { useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-toastify";
import productionApi from "../api/productionApi";
import EnhancedQCModal from "../components/EnhancedQCModal";
import "../styles/production.css";
import "../styles/production-theme.css";

export default function QCPage() {
  // Order being inspected in the full QC dialog (needed for issues: rework / reprint)
  const [inspecting, setInspecting] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("PENDING");
  const [busy, setBusy] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const result = await productionApi.getPendingQualityChecks({});
      const data = Array.isArray(result)
        ? result
        : result?.data || result?.items || result?.qualityChecks || [];
      setRows(data);
    } catch (e) {
      toast.error(
        e?.response?.data?.message || "Unable to load QC items. Check API connection."
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = rows.filter((r) => {
    const text = [
      r.orderNumber,
      r.productionNo,
      r.jobNo,
      r.jobOrderNo,
      r.customerName,
      r.productName,
      r.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      text.includes(search.toLowerCase()) &&
      (filter === "ALL" || String(r.status || "PENDING").toUpperCase() === filter)
    );
  });

  const inspect = async (row, result) => {
    const id =
      row.productionOrderId?._id ||
      row.productionOrderId ||
      row._id ||
      row.id;
    if (!id) {
      toast.error("Production order ID is missing.");
      return;
    }
    setBusy(String(id));
    try {
      await productionApi.performQualityCheck(id, {
        result,
        comments: "QC passed",
      });
      toast.success("QC passed successfully");
      await load();
    } catch (e) {
      const details = Array.isArray(e?.response?.data?.details)
        ? e.response.data.details.map((d) => d?.message).filter(Boolean).join(" ")
        : "";
      toast.error(details || e?.response?.data?.message || "QC submission failed.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="standalone-page">
      <div className="page-title-row">
        <div className="title-icon">
          <ShieldCheck />
        </div>
        <div>
          <h1>Quality Control</h1>
          <p>Inspect completed production orders and record quality results.</p>
        </div>
        <button className="btn btn-primary right-action" onClick={load}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="filter-panel">
        <div className="search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PO, job number, customer, product..."
          />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="PENDING">Pending QC</option>
          <option value="ALL">All statuses</option>
          <option value="PASS">Passed</option>
          <option value="FAIL">Failed</option>
        </select>
        <button
          className="btn btn-outline"
          onClick={() => {
            setSearch("");
            setFilter("PENDING");
          }}
        >
          Reset
        </button>
      </div>

      <div className="kpi-grid three">
        <div className="kpi-card">
          <ClipboardCheck />
          <span>QC Items</span>
          <strong>{rows.length}</strong>
        </div>
        <div className="kpi-card">
          <AlertTriangle />
          <span>Pending Inspection</span>
          <strong>
            {
              rows.filter(
                (r) =>
                  !["PASS", "PASSED", "COMPLETED"].includes(
                    String(r.status || "PENDING").toUpperCase()
                  )
              ).length
            }
          </strong>
        </div>
        <div className="kpi-card">
          <CheckCircle2 />
          <span>Visible Records</span>
          <strong>{visible.length}</strong>
        </div>
      </div>

      <div className="table-card">
        <div className="table-card-heading">
          <div>
            <h2>QC Incoming</h2>
            <p>Review production output before approval.</p>
          </div>
          <span className="count-pill">{visible.length} records</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>PO Number</th>
                <th>Job Number</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="empty-cell">
                    Loading QC records…
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-cell">
                    No QC records found. Records will appear when the API returns eligible production orders.
                  </td>
                </tr>
              ) : (
                visible.map((r, i) => {
                  const id = String(
                    r.productionOrderId?._id ||
                      r.productionOrderId ||
                      r._id ||
                      r.id ||
                      i
                  );
                  return (
                    <tr key={id}>
                      <td>{i + 1}</td>
                      <td>
                        <b>{r.orderNumber || r.productionNo || r.poNumber || "—"}</b>
                      </td>
                      <td>{r.jobNo || r.jobOrderNo || r.jobOrderId?.jobNo || "—"}</td>
                      <td>{r.customerName || r.jobOrderId?.customerName || "—"}</td>
                      <td>{r.productName || r.product || "—"}</td>
                      <td>{r.quantity ?? r.plannedQuantity ?? r.completedQuantity ?? "—"}</td>
                      <td>
                        <span className={`status-pill ${String(r.status || "PENDING").toLowerCase()}`}>
                          {r.status || "Pending QC"}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn btn-small btn-success"
                            disabled={busy === id}
                            onClick={() => inspect(r, "PASS")}
                          >
                            Pass
                          </button>
                          <button
                            className="btn btn-small btn-danger"
                            disabled={busy === id}
                            onClick={() =>
                              setInspecting({
                                ...r,
                                _id: r._id || r.id,
                                orderNumber: r.orderNumber || r.productionNo,
                                jobOrderNo: r.jobNo || r.jobOrderNo,
                              })
                            }
                          >
                            Issue
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EnhancedQCModal
        isOpen={Boolean(inspecting)}
        onClose={() => setInspecting(null)}
        productionOrder={inspecting}
        onSuccess={load}
      />
    </div>
  );
}
