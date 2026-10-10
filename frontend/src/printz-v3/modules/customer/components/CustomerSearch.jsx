import React, { useState, useEffect, useRef } from "react";
import { Search, Phone, Building, X, ArrowRight, Loader2 } from "lucide-react";
import { searchCustomers } from "../api/customerApi";
import Badge from "../../../shared/components/Badge";
import "../styles/customerV3.css";

export default function CustomerSearch({
  onSelectCustomer,
  onRegisterNewCustomer,
  branchName = "",
  placeholder = "Search existing customer by name, mobile (e.g. 9876543210), customer code (CUS-000184), or company...",
  className = ""
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    if (!query || query.trim().length === 0) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchCustomers(query, "");
        setResults(data);
        setIsOpen(true);
      } catch (err) {
        console.error("Customer search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSelect = (customer) => {
    setQuery("");
    setIsOpen(false);
    if (onSelectCustomer) {
      onSelectCustomer(customer);
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  const handleQuickRegister = () => {
    setIsOpen(false);
    if (onRegisterNewCustomer) {
      const isMobile = /^\d+$/.test(query.trim());
      onRegisterNewCustomer({
        name: isMobile ? "" : query.trim(),
        mobile: isMobile ? query.trim() : ""
      });
    }
  };

  return (
    <div ref={searchContainerRef} className={`v3-search-wrapper ${className}`}>
      <div style={{ position: "relative" }}>
        <div className="v3-search-icon">
          {isLoading ? (
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <Search size={18} />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            if (val.trim().length > 0) setIsOpen(true);
            else setIsOpen(false);
          }}
          onFocus={() => {
            if (query.trim().length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="v3-search-input"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="v3-search-dropdown">
          {isLoading ? (
            <div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "#64748b" }}>
              Searching customer database...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: "18px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#334155", margin: 0 }}>
                No existing customer matched "{query}"
              </p>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "6px 0 14px 0" }}>
                This is likely a first-time visitor. You can register them directly below.
              </p>
              {onRegisterNewCustomer && (
                <button
                  type="button"
                  onClick={handleQuickRegister}
                  className="v3-btn-primary"
                  style={{ fontSize: "12px", padding: "8px 16px" }}
                >
                  + Create New Walk-in Customer Profile
                </button>
              )}
            </div>
          ) : (
            <div>
              <div
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#f8fafc",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Matching Customers ({results.length})</span>
                <span>Click to Select</span>
              </div>

              {results.map((customer) => (
                <div
                  key={customer.id || customer._id || customer.customerCode}
                  onClick={() => handleSelect(customer)}
                  className="v3-search-item"
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <strong style={{ fontSize: "13px", color: "#0f172a" }}>{customer.name}</strong>
                      <Badge variant={customer.customerType === "BUSINESS" ? "business" : "individual"}>
                        {customer.customerType || "INDIVIDUAL"}
                      </Badge>
                      <span style={{ fontSize: "11px", fontFamily: "monospace", padding: "2px 6px", backgroundColor: "#f1f5f9", borderRadius: "4px" }}>
                        {customer.customerCode}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "11px", color: "#64748b" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Phone size={12} color="#047857" />
                        <strong>{customer.mobile}</strong>
                      </span>
                      {customer.companyName && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Building size={12} color="#94a3b8" />
                          {customer.companyName}
                        </span>
                      )}
                      {customer.branchName && (
                        <span style={{ color: "#047857", backgroundColor: "#ecfdf5", padding: "1px 6px", borderRadius: "4px" }}>
                          {customer.branchName}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      backgroundColor: "#ecfdf5",
                      color: "#047857",
                      fontSize: "11px",
                      fontWeight: 700,
                      border: "1px solid #a7f3d0",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    Select <ArrowRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
