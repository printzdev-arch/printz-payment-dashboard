import React, { useState } from "react";
import { User, Phone, Building, RefreshCw, CheckCircle2, Search, UserCheck } from "lucide-react";
import CustomerSearch from "../../customer/components/CustomerSearch";
import Badge from "../../../shared/components/Badge";
import "../../customer/styles/customerV3.css";
import "../styles/jobV3.css";

export default function CustomerSelectorCard({
  customer,
  onSelectCustomer,
  onChangeCustomer,
  branchName = "Banaswadi",
  error = null
}) {
  const [isChanging, setIsChanging] = useState(false);

  const handleSelect = (cus) => {
    setIsChanging(false);
    if (onSelectCustomer) {
      onSelectCustomer(cus);
    }
  };

  return (
    <div className="v3-card" style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="v3-card-icon">
            <UserCheck size={18} />
          </div>
          <div>
            <h3 className="v3-card-title">1. Customer Information</h3>
          </div>
        </div>

        {customer && !isChanging && (
          <button
            type="button"
            onClick={() => setIsChanging(true)}
            className="v3-btn-secondary"
            style={{ fontSize: "12px", padding: "6px 14px", height: "34px" }}
          >
            <RefreshCw size={13} />
            Change Customer
          </button>
        )}
      </div>

      {error && (
        <div className="v3-warning-box" style={{ marginBottom: "16px", borderColor: "#fca5a5", backgroundColor: "#fef2f2" }}>
          <p style={{ margin: 0, fontSize: "12px", color: "#b91c1c", fontWeight: 600 }}>
            ⚠️ {error}
          </p>
        </div>
      )}

      {/* When customer is selected & not changing */}
      {customer && !isChanging ? (
        <div className="v3-customer-selected-card">
          <div className="v3-customer-selected-info">
            <div className="v3-customer-avatar">
              {(customer.name || "C")[0].toUpperCase()}
            </div>
            <div>
              <div className="v3-customer-name-heading">
                <span>{customer.name}</span>
                <Badge variant={customer.customerType === "BUSINESS" ? "business" : "individual"}>
                  {customer.customerType || "INDIVIDUAL"}
                </Badge>
                <span style={{ fontSize: "11px", fontFamily: "monospace", padding: "2px 6px", backgroundColor: "#d1fae5", color: "#065f46", borderRadius: "4px", fontWeight: 700 }}>
                  {customer.customerCode || customer.customerId || customer.id}
                </span>
              </div>

              <div className="v3-customer-meta-row">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <Phone size={13} color="#047857" />
                  <strong>{customer.mobile}</strong>
                </span>

                {customer.companyName && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Building size={13} color="#047857" />
                    {customer.companyName}
                  </span>
                )}

                {customer.branchName && (
                  <span style={{ backgroundColor: "#ffffff", padding: "2px 8px", borderRadius: "9999px", border: "1px solid #a7f3d0", fontSize: "11px", fontWeight: 600 }}>
                    Branch: {customer.branchName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#047857", fontSize: "12px", fontWeight: 700 }}>
            <CheckCircle2 size={16} /> Verified Active Customer
          </div>
        </div>
      ) : (
        /* Search / Select Customer View */
        <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
          <p style={{ margin: "0 0 10px 0", fontSize: "12px", fontWeight: 700, color: "#334155" }}>
            🔍 Search existing customer by Name, Mobile, or Customer Code:
          </p>
          <CustomerSearch
            onSelectCustomer={handleSelect}
            branchName={branchName}
            placeholder="Type customer name (e.g. ABC Printers) or mobile number (e.g. 9876543210)..."
          />
          {isChanging && (
            <div style={{ marginTop: "10px", textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setIsChanging(false)}
                style={{ background: "none", border: "none", color: "#64748b", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}
              >
                Cancel Customer Change
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
