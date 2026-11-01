import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, ChevronDown, Check, X, User } from "lucide-react";

// Initial avatar color generator matching PrintZ aesthetics
const AVATAR_COLORS = [
  "#3b82f6", // Blue
  "#a855f7", // Purple
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#4f46e5", // Dark Indigo
  "#0ea5e9", // Sky Blue
  "#d946ef", // Magenta
  "#059669", // Emerald
  "#f59e0b", // Amber
];

const getAvatarColor = (name = "") => {
  if (!name) return AVATAR_COLORS[0];
  const charCode = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[charCode % AVATAR_COLORS.length];
};


export default function SearchableEmployeeSelect({
  value = "",
  onChange,
  employees = [],
  branches = [],
  placeholder = "Select Employee...",
  allowAll = false,
  allLabel = "All Employees",
  required = false,
  disabled = false,
  id,
  name,
  className = "",
  style = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Helper to extract clean branch name
  const getBranchName = (emp) => {
    if (!emp) return "";
    if (emp.branchId && typeof emp.branchId === "object" && emp.branchId.name) {
      return emp.branchId.name;
    }
    if (emp.branchName) return emp.branchName;
    if (typeof emp.branch === "string") return emp.branch;
    if (Array.isArray(branches) && emp.branchId) {
      const found = branches.find((b) => String(b._id) === String(emp.branchId));
      if (found?.name) return found.name;
    }
    return "";
  };

  // Normalize list
  const empList = useMemo(() => {
    if (Array.isArray(employees)) return employees;
    if (Array.isArray(employees?.items)) return employees.items;
    if (Array.isArray(employees?.employees)) return employees.employees;
    return [];
  }, [employees]);

  // Find currently selected employee object
  const selectedEmployee = useMemo(() => {
    if (!value) return null;
    return empList.find((e) => String(e._id) === String(value)) || null;
  }, [empList, value]);

  // Filtered employees based on search term (searches name, employee code, or branch)
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return empList;
    const q = searchTerm.toLowerCase().trim();
    return empList.filter((emp) => {
      const name = (emp.name || "").toLowerCase();
      const code = (emp.employeeCode || "").toLowerCase();
      const branch = getBranchName(emp).toLowerCase();
      return name.includes(q) || code.includes(q) || branch.includes(q);
    });
  }, [empList, searchTerm, branches]);

  // Reset highlighted index when filter changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredEmployees.length]);

  // Handle outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (emp) => {
    if (!emp) {
      onChange?.("", null);
    } else {
      onChange?.(emp._id, emp);
    }
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.("", null);
    setSearchTerm("");
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const totalItems = (allowAll ? 1 : 0) + filteredEmployees.length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < totalItems ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allowAll && highlightedIndex === 0) {
        handleSelect(null);
      } else {
        const itemIndex = allowAll ? highlightedIndex - 1 : highlightedIndex;
        if (filteredEmployees[itemIndex]) {
          handleSelect(filteredEmployees[itemIndex]);
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-emp-select-container ${className}`}
      style={{ position: "relative", width: "100%", ...style }}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input for HTML form validation */}
      <input
        type="text"
        id={id}
        name={name}
        value={value || ""}
        required={required}
        onChange={() => {}}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 0,
          height: 0,
        }}
        tabIndex={-1}
      />

      {/* Select Trigger Box */}
      <div
        className={`searchable-emp-select-trigger ${isOpen ? "open" : ""} ${disabled ? "disabled" : ""}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
      >
        <div className="searchable-emp-select-content">
          {selectedEmployee ? (
            <div className="searchable-emp-selected-item">
              <div
                className="searchable-emp-avatar"
                style={{ backgroundColor: getAvatarColor(selectedEmployee.name) }}
              >
                {(selectedEmployee.name || "E").charAt(0).toUpperCase()}
              </div>
              <div className="searchable-emp-selected-text">
                <span className="searchable-emp-selected-name">{selectedEmployee.name}</span>
                <span className="searchable-emp-selected-code">
                  {selectedEmployee.employeeCode}
                </span>
              </div>
              {getBranchName(selectedEmployee) && (
                <span className="searchable-emp-branch-tag">
                  {getBranchName(selectedEmployee)}
                </span>
              )}
            </div>
          ) : allowAll && !value ? (
            <div className="searchable-emp-selected-item">
              <div
                className="searchable-emp-avatar"
                style={{ backgroundColor: "#64748b" }}
              >
                <User size={14} color="#ffffff" />
              </div>
              <span className="searchable-emp-selected-name" style={{ color: "#334155" }}>
                {allLabel}
              </span>
            </div>
          ) : (
            <span className="searchable-emp-placeholder">{placeholder}</span>
          )}
        </div>

        <div className="searchable-emp-trigger-icons">
          {value && !disabled && allowAll && (
            <button
              type="button"
              className="searchable-emp-clear-btn"
              onClick={handleClear}
              title="Clear selection"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            size={16}
            className={`searchable-emp-chevron ${isOpen ? "rotate" : ""}`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="searchable-emp-dropdown-menu">
          {/* Search Input Box */}
          <div className="searchable-emp-search-header">
            <Search size={15} className="searchable-emp-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="searchable-emp-search-input"
              placeholder="Type employee name, code, or branch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {searchTerm && (
              <button
                type="button"
                className="searchable-emp-search-clear"
                onClick={() => setSearchTerm("")}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Option List */}
          <div ref={listRef} className="searchable-emp-list">
            {allowAll && !searchTerm && (
              <div
                className={`searchable-emp-option ${!value ? "selected" : ""} ${
                  highlightedIndex === 0 ? "highlighted" : ""
                }`}
                onClick={() => handleSelect(null)}
                onMouseEnter={() => setHighlightedIndex(0)}
              >
                <div className="searchable-emp-option-main">
                  <div
                    className="searchable-emp-avatar"
                    style={{ backgroundColor: "#64748b" }}
                  >
                    <User size={14} color="#ffffff" />
                  </div>
                  <span className="searchable-emp-name" style={{ fontWeight: 600 }}>
                    {allLabel}
                  </span>
                </div>
                {!value && <Check size={16} className="searchable-emp-check-icon" />}
              </div>
            )}

            {filteredEmployees.length === 0 ? (
              <div className="searchable-emp-empty">
                No employees found matching &ldquo;{searchTerm}&rdquo;
              </div>
            ) : (
              filteredEmployees.map((emp, index) => {
                const actualIndex = allowAll && !searchTerm ? index + 1 : index;
                const isSelected = String(emp._id) === String(value);
                const isHighlighted = highlightedIndex === actualIndex;
                const branchName = getBranchName(emp);

                return (
                  <div
                    key={emp._id}
                    className={`searchable-emp-option ${isSelected ? "selected" : ""} ${
                      isHighlighted ? "highlighted" : ""
                    }`}
                    onClick={() => handleSelect(emp)}
                    onMouseEnter={() => setHighlightedIndex(actualIndex)}
                  >
                    <div className="searchable-emp-option-main">
                      <div
                        className="searchable-emp-avatar"
                        style={{ backgroundColor: getAvatarColor(emp.name) }}
                      >
                        {(emp.name || "E").charAt(0).toUpperCase()}
                      </div>
                      <div className="searchable-emp-option-info">
                        <div className="searchable-emp-name-row">
                          <span className="searchable-emp-name">{emp.name}</span>
                          <span className="searchable-emp-code">{emp.employeeCode}</span>
                        </div>
                        {branchName && (
                          <div className="searchable-emp-branch-row">
                            <span className="searchable-emp-branch-tag">
                              {branchName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={16} className="searchable-emp-check-icon" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
