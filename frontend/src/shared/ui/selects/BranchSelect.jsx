import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import useFloatingMenu from "../../utils/useFloatingMenu";
import { Building2, ChevronDown, Search, X, Check, Lock } from "lucide-react";
import { getLockedBranchId, useBranches } from "../../utils/branchAccess";
import "../../styles/branchSelect.css";

/**
 * The branch dropdown used on every page.
 *  - Pass `branches` to use your own list, or leave it out and the list is loaded for you.
 *  - valueKey="name" (default) gives the branch name as the value; valueKey="id" gives its id.
 *  - lockToUserBranch: a non-admin user (for example a manager) sees only their own branch, fixed.
 */

const BranchSelect = ({
  value = "",
  onChange,
  branches: branchesProp,
  valueKey = "name",
  lockToUserBranch = false,
  placeholder = "Select Branch",
  allowAll = false,
  showAllOption = false,
  allOptionLabel = "All Branches",
  allOptionValue = "",
  disabled: disabledProp = false,
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
  const { branches: loadedBranches } = useBranches(branchesProp === undefined);
  const lockedId = lockToUserBranch ? getLockedBranchId() : "";
  const disabled = disabledProp || Boolean(lockedId);
  const baseBranches = branchesProp !== undefined ? branchesProp : loadedBranches;
  const branches = useMemo(() => {
    let list = Array.isArray(baseBranches) ? baseBranches : [];
    // Fixed to the user's own branch
    if (lockedId) list = list.filter((b) => b && typeof b === "object" && String(b._id || b.id) === lockedId);
    // Hand out the id instead of the name when asked
    if (valueKey === "id") list = list.map((b) => (b && typeof b === "object" ? { ...b, value: String(b._id || b.id || "") } : b));
    return list;
  }, [baseBranches, lockedId, valueKey]);

  // A locked user always has their own branch selected
  const lockedBranch = lockedId ? branches[0] : null;
  const lockedValue = lockedBranch ? (valueKey === "id" ? lockedId : lockedBranch.value !== undefined ? lockedBranch.value : lockedBranch.name) : "";
  useEffect(() => {
    if (lockedValue && value !== lockedValue && onChange) {
      onChange({ target: { name: name || id || "branch", value: lockedValue }, currentTarget: { name: name || id || "branch", value: lockedValue } }, lockedBranch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedValue]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);
  const menuRef = useRef(null);

  // Normalize excluded branches
  const excludedSet = useMemo(() => {
    if (!exclude) return new Set();
    if (Array.isArray(exclude)) return new Set(exclude.filter(Boolean));
    return new Set([exclude].filter(Boolean));
  }, [exclude]);

  // Normalize branches array into uniform items { id, name, value }
  const normalizedOptions = useMemo(() => {
    const list = [];

    if ((allowAll || showAllOption) && !lockedId) {
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
  }, [branches, allowAll, showAllOption, allOptionLabel, allOptionValue, excludedSet, lockedId]);

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

  // When the list opens or the search changes, highlight the selected row (or the first one)
  useEffect(() => {
    if (!isOpen) return;
    const i = filteredOptions.findIndex((opt) => opt.value === value || opt.name === value);
    setActiveIndex(i >= 0 ? i : filteredOptions.length ? 0 : -1);
  }, [isOpen, filteredOptions, value]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        !(menuRef.current && menuRef.current.contains(event.target))
      ) {
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

  const menuStyle = useFloatingMenu(containerRef, menuRef, isOpen, { minWidth: 200, deps: [filteredOptions.length] });

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

  // Keyboard: Enter / Space / Arrow Down opens, Arrow keys move, Enter picks, Escape closes
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
      return;
    }
    if (!isOpen) {
      if (e.target === e.currentTarget.querySelector(".branch-select-trigger") && ["Enter", " ", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) handleSelect(option);
    }
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
      onKeyDown={handleKeyDown}
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
        className={`branch-select-trigger ${isOpen ? "open" : ""} ${disabled ? "disabled" : ""} ${lockedId ? "locked" : ""}`}
        style={triggerStyle}
        onClick={toggleDropdown}
        tabIndex={disabled ? -1 : 0}
        title={lockedId ? "Your branch is fixed" : undefined}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-disabled={disabled}
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
          {lockedId ? <Lock size={14} /> : <ChevronDown size={16} />}
        </span>
      </div>

      {/* Downward Dropdown Menu */}
      {isOpen && createPortal(
        <div ref={menuRef} style={menuStyle} className={`branch-select-dropdown ${dropdownClassName}`} role="listbox">
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
            {filteredOptions.map((opt, index) => {
              const isSelected =
                opt.value === value || opt.name === value;
              const isActive = index === activeIndex;

              return (
                <div
                  key={opt.id}
                  className={`branch-select-option-item ${isSelected ? "selected" : ""} ${isActive ? "active" : ""}`}
                  ref={(el) => {
                    if (el && isActive) el.scrollIntoView({ block: "nearest" });
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(opt);
                  }}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="branch-select-option-left">
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default BranchSelect;
