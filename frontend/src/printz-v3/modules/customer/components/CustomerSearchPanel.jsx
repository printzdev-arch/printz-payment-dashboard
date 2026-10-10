import React, { useState, useEffect } from "react";
import {
  Search,
  Phone,
  Mail,
  Building,
  MapPin,
  X,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Users
} from "lucide-react";
import { searchCustomers } from "../api/customerApi";
import Badge from "../../../shared/components/Badge";
import "../styles/customerV3.css";

export default function CustomerSearchPanel({
  onSelectCustomer,
  branchName = "Banaswadi",
  selectedCustomerId = null,
  activeMobileQuery = ""
}) {
  const [query, setQuery] = useState(activeMobileQuery || "");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchCustomers(trimmed, "");
        setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Search panel error:", err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Sync if active mobile query passed from registration form
  useEffect(() => {
    if (activeMobileQuery) {
      setQuery(activeMobileQuery);
    }
  }, [activeMobileQuery]);

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
  };

  const getAvatarInitials = (name) => {
    if (!name) return "CU";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarBg = (idx) => {
    const colors = ["#0284c7", "#64748b", "#f97316", "#7c3aed", "#059669"];
    return colors[idx % colors.length];
  };

  const cleanDigits = query.replace(/\D/g, "");
  const exactDuplicate =
    hasSearched && cleanDigits.length === 10
      ? results.find((c) => (c.mobile || "").replace(/\D/g, "") === cleanDigits)
      : null;

  return (
    <div
      className="v3-card"
      style={{
        padding: "20px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        boxSizing: "border-box"
      }}
    >
      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Search size={18} color="#047857" />
        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
          Search Existing Customer
        </h3>
      </div>

      {/* Search Input Box with clear X */}
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
          {isLoading ? (
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite", color: "#047857" }} />
          ) : (
            <Search size={16} />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, mobile number, customer code, company name or GSTIN..."
          style={{
            width: "100%",
            height: "40px",
            padding: "0 36px 0 36px",
            fontSize: "12px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            backgroundColor: "#f8fafc",
            color: "#0f172a",
            outline: "none",
            boxSizing: "border-box",
            transition: "all 0.2s ease"
          }}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              padding: "4px"
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* When NO search has been performed yet: show empty guidance state */}
      {!hasSearched ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "30px 20px",
            background: "#f8fafc",
            borderRadius: "10px",
            border: "1px dashed #cbd5e1",
            color: "#64748b"
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "#ecfdf5",
              color: "#047857",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px"
            }}
          >
            <Users size={22} />
          </div>
          <h4 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 800, color: "#1e293b" }}>
            Search Customer Records
          </h4>
          <p style={{ margin: "0 0 14px 0", fontSize: "12px", color: "#64748b", maxWidth: "280px", lineHeight: "1.4" }}>
            Type a customer's name, mobile number, customer code, or company above to search existing records.
          </p>
          <span style={{ fontSize: "11px", color: "#047857", background: "#ecfdf5", padding: "4px 10px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
            💡 Tip: Entering a 10-digit mobile automatically checks duplicates
          </span>
        </div>
      ) : (
        /* When search IS active: show header, cards, or not-found */
        <>
          {/* Header Results Count & Sort Dropdown */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
            <span style={{ fontWeight: 800, color: "#0f172a" }}>
              Search Results ({results.length})
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b" }}>
              <span>Sort by</span>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 700, color: "#0f172a", cursor: "pointer" }}>
                <span>Recent</span>
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          {/* Customer Result Cards List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1, overflowY: "auto" }}>
            {results.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "#64748b", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                  No matching customers found
                </p>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                  Fill out the Walk-in Registration form on the right to register them.
                </span>
              </div>
            ) : (
              results.map((c, idx) => {
                const isSelected = selectedCustomerId === (c.id || c._id || c.customerCode);
                const isFirst = idx === 0;
                return (
                  <div
                    key={c.id || c._id || c.customerCode || idx}
                    style={{
                      border: isFirst ? "1.5px solid #a7f3d0" : "1px solid #e2e8f0",
                      backgroundColor: isFirst ? "#f0fdf4" : "#ffffff",
                      borderRadius: "10px",
                      padding: "14px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px",
                      transition: "all 0.15s ease",
                      boxShadow: isFirst ? "0 2px 6px rgba(4, 120, 87, 0.06)" : "none"
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        backgroundColor: isFirst ? "#0284c7" : getAvatarBg(idx),
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "12px",
                        flexShrink: 0,
                        marginTop: "2px"
                      }}
                    >
                      {getAvatarInitials(c.name)}
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0, fontSize: "11px", color: "#64748b", display: "flex", flexDirection: "column", gap: "3px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <strong style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>
                          {c.name}
                        </strong>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: "4px",
                            backgroundColor: c.customerType === "BUSINESS" ? "#ecfdf5" : "#f0fdf4",
                            color: "#047857",
                            border: "1px solid #a7f3d0"
                          }}
                        >
                          {c.customerType === "BUSINESS" ? "Business (B2B)" : "Individual (B2C)"}
                        </span>
                      </div>

                      <div style={{ color: "#475569" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>
                          {c.customerCode || "CUS-000184"}
                        </span>
                        {c.contactPerson && (
                          <span> | {c.contactPerson}</span>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                          <Phone size={11} color="#047857" />
                          <strong>{c.mobile}</strong>
                        </span>
                        {c.email && (
                          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                            <Mail size={11} color="#94a3b8" />
                            <span>{c.email}</span>
                          </span>
                        )}
                      </div>

                      {c.companyName && (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                            <Building size={11} color="#94a3b8" />
                            <span>{c.companyName}</span>
                          </span>
                          {c.gstNumber && (
                            <span>| GSTIN: <strong>{c.gstNumber}</strong></span>
                          )}
                        </div>
                      )}

                      {!c.companyName && c.address && (
                        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                          <MapPin size={11} color="#94a3b8" />
                          <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            {c.address}, {c.city || "Bengaluru"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div style={{ flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => onSelectCustomer && onSelectCustomer(c)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 700,
                          backgroundColor: isFirst ? "#047857" : "#ffffff",
                          color: isFirst ? "#ffffff" : "#334155",
                          border: isFirst ? "1px solid #047857" : "1.5px solid #cbd5e1",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <span>Select</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Alert Banner (when duplicate mobile is matched) */}
          {exactDuplicate && (
            <div
              style={{
                backgroundColor: "#fff1f2",
                border: "1px solid #fecdd3",
                borderRadius: "8px",
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={16} color="#e11d48" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#be123c" }}>
                  Existing customer found with the same mobile number
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSelectCustomer && onSelectCustomer(exactDuplicate)}
                style={{
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  backgroundColor: "#ffffff",
                  color: "#be123c",
                  border: "1px solid #fecdd3",
                  borderRadius: "6px",
                  cursor: "pointer",
                  flexShrink: 0
                }}
              >
                View Customer
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
