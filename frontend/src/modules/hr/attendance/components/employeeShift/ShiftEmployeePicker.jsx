import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import branchShiftApi from "../../api/branchShiftApi";

// Employee picker that searches on the server as the admin types,
// so it keeps working with a large employee base.
export default function ShiftEmployeePicker({ value, onChange, placeholder = "Search employee by name or code..." }) {
  const [text, setText] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const rows = await branchShiftApi.searchActiveEmployees(text.trim());
      if (!cancelled) {
        setResults(rows);
        setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, isOpen]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setText(value?.name ? `${value.name} (${value.employeeCode || ""})` : "");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [value]);

  const handleSelect = (emp) => {
    onChange(emp);
    setText(`${emp.name} (${emp.employeeCode || ""})`);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setText("");
    setIsOpen(true);
  };

  return (
    <div className="shift-picker" ref={containerRef}>
      <div className="shift-picker-input">
        <Search size={15} color="#94a3b8" />
        <input
          type="text"
          value={text}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setText(e.target.value);
            setIsOpen(true);
            if (value) onChange(null);
          }}
        />
        {(value || text) && (
          <button type="button" className="shift-picker-clear" onClick={handleClear} aria-label="Clear">
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="shift-picker-menu">
          {loading ? (
            <div className="shift-picker-empty">Searching...</div>
          ) : results.length === 0 ? (
            <div className="shift-picker-empty">No employees found.</div>
          ) : (
            results.map((emp) => (
              <button
                type="button"
                key={emp._id}
                className="shift-picker-option"
                onClick={() => handleSelect(emp)}
              >
                <span>
                  <strong>{emp.name}</strong>
                  <span className="shift-code">{emp.employeeCode}</span>
                </span>
                <span className="shift-hint">{emp.branchId?.name || ""}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
