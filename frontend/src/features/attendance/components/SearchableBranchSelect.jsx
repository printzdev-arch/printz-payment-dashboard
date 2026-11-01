import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, X } from "lucide-react";

// Search-only branch filter: empty input = all branches, typing lists matching branches.
export default function SearchableBranchSelect({
  value = "",
  onChange,
  branches = [],
  placeholder = "Search branch...",
  className = "",
  style = {},
}) {
  const [text, setText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedBranch = useMemo(
    () => branches.find((b) => String(b._id) === String(value)) || null,
    [branches, value]
  );

  // Keep the input in sync with the selected branch (and clear it for "all")
  useEffect(() => {
    setText(selectedBranch ? selectedBranch.name : "");
  }, [selectedBranch]);

  const matches = useMemo(() => {
    const q = text.toLowerCase().trim();
    if (!q || (selectedBranch && text === selectedBranch.name)) return [];
    return branches.filter(
      (b) =>
        (b.name || "").toLowerCase().includes(q) ||
        (b.code || "").toLowerCase().includes(q)
    );
  }, [branches, text, selectedBranch]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setText(selectedBranch ? selectedBranch.name : "");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [selectedBranch]);

  const handleSelect = (branch) => {
    onChange?.(branch._id);
    setText(branch.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    setText("");
    setIsOpen(false);
    if (value) onChange?.("");
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-emp-select-container ${className}`}
      style={{ position: "relative", width: "100%", minWidth: "200px", ...style }}
    >
      <div className={`searchable-emp-select-trigger ${isOpen ? "open" : ""}`}>
        <div className="searchable-emp-select-content" style={{ gap: "8px" }}>
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            className="searchable-emp-search-input"
            style={{ border: "none", outline: "none", background: "transparent", width: "100%" }}
            placeholder={placeholder}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setIsOpen(true);
              // Emptying the box goes back to all branches
              if (!e.target.value.trim() && value) onChange?.("");
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setIsOpen(false);
                setText(selectedBranch ? selectedBranch.name : "");
              } else if (e.key === "Enter" && matches.length > 0) {
                e.preventDefault();
                handleSelect(matches[0]);
              }
            }}
          />
        </div>
        {text && (
          <div className="searchable-emp-trigger-icons">
            <button
              type="button"
              className="searchable-emp-clear-btn"
              onClick={handleClear}
              title="Clear (show all branches)"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {isOpen && text.trim() && matches.length === 0 && !(selectedBranch && text === selectedBranch.name) && (
        <div className="searchable-emp-dropdown-menu">
          <div className="searchable-emp-empty">
            No branches found matching &ldquo;{text}&rdquo;
          </div>
        </div>
      )}

      {isOpen && matches.length > 0 && (
        <div className="searchable-emp-dropdown-menu">
          <div className="searchable-emp-list">
            {matches.map((b) => (
              <div
                key={b._id}
                className="searchable-emp-option"
                onClick={() => handleSelect(b)}
              >
                <div className="searchable-emp-option-main">
                  <span className="searchable-emp-name">{b.name}</span>
                  {b.code && <span className="searchable-emp-code">{b.code}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
