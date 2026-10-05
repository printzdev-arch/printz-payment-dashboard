import React, { useState, useEffect, useRef, useMemo } from "react";
import { Building2, ChevronDown, Search, X, Check } from "lucide-react";
import "../../styles/branchSelect.css";

const BranchSelect = ({
  value = "",
  onChange,
  branches = [],
  placeholder = "Select Branch",
  allowAll = false,
  showAllOption = false,
  allOptionLabel = "All Branches",
  allOptionValue = "",
  disabled = false,
  required = false,
  name,
  id,
  className = "",
  style = {},
  triggerStyle = {},
  dropdownClassName = "",
  icon = true,
  searchable,
  exclude = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  // Normalize excluded branches
  const excludedSet = useMemo(() => {
    if (!exclude) return new Set();
    if (Array.isArray(exclude)) return new Set(exclude.filter(Boolean));
    return new Set([exclude].filter(Boolean));
  }, [exclude]);

  // Normalize branches array into uniform items { id, name, value }
  const normalizedOptions = useMemo(() => {
    const list = [];

    if (allowAll || showAllOption) {
      list.push({
        id: "__all__",
        name: allOptionLabel,
        value: allOptionValue,
        isAll: true,
      });
    }

    if (Array.isArray(branches)) {
      branches.forEach((b, idx) => {
        if (!b) return;
        if (typeof b === "string") {
          if (!excludedSet.has(b)) {
            list.push({
              id: `b_${idx}_${b}`,
              name: b,
              value: b,
            });
          }
        } else if (typeof b === "object") {
          const branchName = (b.name || b.branchName || b.label || "").toString();
          const branchValue = b.value !== undefined ? b.value : (b.name || b.branchName || b.id || b._id || "").toString();
          const branchId = b.id || b._id || `b_${idx}`;

          if (branchName && !excludedSet.has(branchName) && !excludedSet.has(branchValue)) {
            list.push({
              id: branchId,
              name: branchName,
              value: branchValue,
              original: b,
            });
          }
        }
      });
    }

    return list;
  }, [branches, allowAll, showAllOption, allOptionLabel, allOptionValue, excludedSet]);

  // Determine current display label
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === value || opt.name === value);
  }, [normalizedOptions, value]);

  const displayLabel = selectedOption ? selectedOption.name : value ? value : "";

  // Auto-enable search if more than 5 options and searchable is not explicitly false
  const isSearchable = searchable !== undefined ? searchable : normalizedOptions.length > 5;

  // Filtered list based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const lower = searchTerm.toLowerCase().trim();
    return normalizedOptions.filter((opt) =>
      opt.name.toLowerCase().includes(lower)
    );
  }, [normalizedOptions, searchTerm]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (option) => {
    if (disabled) return;
    const selectedVal = option.value;

    if (onChange) {
      // Provide standard synthetic event object and direct value support
      const syntheticEvent = {
        target: {
          name: name || id || "branch",
          value: selectedVal,
        },
        currentTarget: {
          name: name || id || "branch",
          value: selectedVal,
        },
      };

      onChange(syntheticEvent, option.original || option);
      // If the caller expects just a value (1 arg function that tests !== object)
      if (typeof onChange === "function" && onChange.length === 1) {
        // Many handlers do e.target.value, syntheticEvent supports that directly
      }
    }

    setIsOpen(false);
    setSearchTerm("");
  };

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  return (
    <div
      ref={containerRef}
      className={`branch-select-container ${className}`}
      style={style}
    >
      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          type="text"
          value={value || ""}
          required={required}
          onChange={() => {}}
          tabIndex={-1}
          style={{
            position: "absolute",
            opacity: 0,
            pointerEvents: "none",
            width: "100%",
            height: "100%",
            bottom: 0,
            left: 0,
          }}
        />
      )}

      {/* Dropdown Trigger */}
      <div
        className={`branch-select-trigger ${isOpen ? "open" : ""} ${
          disabled ? "disabled" : ""
        }`}
        style={triggerStyle}
        onClick={toggleDropdown}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleDropdown();
          } else if (e.key === "Escape") {
            setIsOpen(false);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="branch-select-trigger-content">
          {icon && (
            <span className="branch-select-trigger-icon">
              {typeof icon === "boolean" ? <Building2 size={16} /> : icon}
            </span>
          )}
          <span
            className={`branch-select-trigger-text ${
              !displayLabel ? "placeholder" : ""
            }`}
          >
            {displayLabel || placeholder}
          </span>
        </div>
        <span className="branch-select-chevron">
          <ChevronDown size={16} />
        </span>
      </div>

      {/* Downward Dropdown Menu */}
      {isOpen && (
        <div className={`branch-select-dropdown ${dropdownClassName}`} role="listbox">
          {isSearchable && (
            <div className="branch-select-search-box">
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search branch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="branch-select-search-input"
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm("");
                  }}
                  className="branch-select-clear-btn"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          <div className="branch-select-options-list">
            {filteredOptions.map((opt) => {
              const isSelected =
                opt.value === value || opt.name === value;

              return (
                <div
                  key={opt.id}
                  className={`branch-select-option-item ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(opt);
                  }}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="branch-select-option-left">
                    <Building2
                      size={15}
                      className="branch-select-option-icon"
                    />
                    <span>{opt.name}</span>
                  </div>
                  {isSelected && (
                    <Check size={16} className="branch-select-check-icon" />
                  )}
                </div>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="branch-select-empty">
                No branches match "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchSelect;
