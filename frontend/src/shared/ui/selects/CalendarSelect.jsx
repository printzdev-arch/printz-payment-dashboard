import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import SelectField from "./SelectField";
import "../../styles/calendarSelect.css";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Helper to normalize any input into a Date object or null
const toDateObject = (val) => {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // Handle standard YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    // Handle DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(trimmed)) {
      const parts = trimmed.split(/[-/]/).map(Number);
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

// Helper to format Date into standard strings
const formatDate = (date, formatStr = "dd-MM-yyyy") => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  if (formatStr.toLowerCase().includes("yyyy-mm-dd")) {
    return `${yyyy}-${mm}-${dd}`;
  }
  if (formatStr.toLowerCase().includes("dd/mm/yyyy")) {
    return `${dd}/${mm}/${yyyy}`;
  }
  // Default dd-MM-yyyy
  return `${dd}-${mm}-${yyyy}`;
};

const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

/**
 * The date picker used on every page.
 *  - <CalendarSelect selected={date} onChange={(date, text, event) => ...} />  (react-datepicker style)
 *  - <DateField value="2026-11-13" onChange={(e) => set(e.target.value)} min max />  (works like <input type="date">:
 *    the value is "YYYY-MM-DD", and "" when cleared)
 */
const CalendarSelect = ({
  selected,
  value,
  onChange,
  dateFormat = "dd-MM-yyyy",
  placeholder = "Select Date",
  placeholderText,
  minDate,
  maxDate,
  filterDate,
  highlightDates = [],
  disabled = false,
  required = false,
  name,
  id,
  className = "",
  containerClassName = "",
  inputClassName = "",
  dropdownClassName = "",
  style = {},
  triggerStyle = {},
  isClearable = true,
  icon = true,
  inline = false,
  shouldCloseOnSelect = true,
  dayClassName,
  showFooter = true,
  title,
  error = false,
}) => {
  const [isOpen, setIsOpen] = useState(inline);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [pos, setPos] = useState(null);

  // Normalize selected date
  const parsedDate = useMemo(() => {
    return toDateObject(selected !== undefined ? selected : value);
  }, [selected, value]);

  // Active viewing month & year in the calendar
  const [viewDate, setViewDate] = useState(() => {
    return parsedDate || new Date();
  });

  // Keep viewDate in sync when parsedDate changes
  useEffect(() => {
    if (parsedDate) {
      setViewDate(new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1));
    }
  }, [parsedDate]);

  // Click outside to close
  useEffect(() => {
    if (inline) return;

    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        !(dropdownRef.current && dropdownRef.current.contains(event.target))
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, inline]);

  // The calendar is drawn on top of the page (in <body>), so no card or popup can clip it.
  // It sits under the field, flips above it when there is no room below, and stays on screen.
  useLayoutEffect(() => {
    if (!isOpen || inline) return undefined;
    const place = () => {
      const trigger = containerRef.current;
      const menu = dropdownRef.current;
      if (!trigger || !menu) return;
      const t = trigger.getBoundingClientRect();
      const m = menu.getBoundingClientRect();
      const margin = 8;
      const left = Math.max(margin, Math.min(t.left, window.innerWidth - m.width - margin));
      const roomBelow = window.innerHeight - t.bottom - margin;
      const roomAbove = t.top - margin;
      let top = t.bottom + 6;
      if (m.height > roomBelow && roomAbove > roomBelow) top = Math.max(margin, t.top - m.height - 6);
      else if (m.height > roomBelow) top = Math.max(margin, window.innerHeight - m.height - margin);
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [isOpen, inline, viewDate]);

  const minDateObj = useMemo(() => toDateObject(minDate), [minDate]);
  const maxDateObj = useMemo(() => toDateObject(maxDate), [maxDate]);

  const isDateDisabled = (d) => {
    if (minDateObj) {
      const minStart = new Date(
        minDateObj.getFullYear(),
        minDateObj.getMonth(),
        minDateObj.getDate()
      );
      if (d < minStart) return true;
    }
    if (maxDateObj) {
      const maxEnd = new Date(
        maxDateObj.getFullYear(),
        maxDateObj.getMonth(),
        maxDateObj.getDate(),
        23,
        59,
        59
      );
      if (d > maxEnd) return true;
    }
    if (typeof filterDate === "function") {
      return !filterDate(d);
    }
    return false;
  };

  const isDateHighlighted = (d) => {
    if (!Array.isArray(highlightDates) || highlightDates.length === 0)
      return false;
    return highlightDates.some((hd) => {
      const hdObj = toDateObject(hd);
      return hdObj && isSameDay(d, hdObj);
    });
  };

  const handleSelectDate = (d) => {
    if (disabled || isDateDisabled(d)) return;

    if (onChange) {
      const formatted = formatDate(d, dateFormat);
      const isoFormatted = formatDate(d, "yyyy-MM-dd");

      const syntheticEvent = {
        target: {
          name: name || id || "date",
          value: isoFormatted,
          formattedValue: formatted,
          dateValue: d,
        },
        currentTarget: {
          name: name || id || "date",
          value: isoFormatted,
          formattedValue: formatted,
          dateValue: d,
        },
      };

      // Call onChange providing (DateObject, formattedString, syntheticEvent)
      // If the caller expects just a Date (react-datepicker style), DateObject is 1st arg.
      // If the caller expects syntheticEvent, syntheticEvent is passed or caller can read event.
      onChange(d, formatted, syntheticEvent);

      // Support callers using event handler signature (e) => setDate(e.target.value)
      if (typeof onChange === "function" && onChange.length === 1) {
        // If caller expects event vs Date:
        // We ensure onChange works if it accesses e.target or uses Date directly
      }
    }

    if (!inline && shouldCloseOnSelect) {
      setIsOpen(false);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;

    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name || id || "date",
          value: "",
          formattedValue: "",
          dateValue: null,
        },
      };
      onChange(null, "", syntheticEvent);
    }
  };

  const handleToday = (e) => {
    e.stopPropagation();
    const today = new Date();
    if (!isDateDisabled(today)) {
      handleSelectDate(today);
    }
  };

  const changeMonth = (delta) => {
    setViewDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
    );
  };

  const handleMonthSelect = (m) => {
    setViewDate((prev) => new Date(prev.getFullYear(), m, 1));
  };

  const handleYearSelect = (y) => {
    setViewDate((prev) => new Date(y, prev.getMonth(), 1));
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({
        date: d,
        dayNum: daysInPrevMonth - i,
        isCurrentMonth: false,
        disabled: isDateDisabled(d),
        isToday: isSameDay(d, new Date()),
        isSelected: parsedDate ? isSameDay(d, parsedDate) : false,
        isHighlighted: isDateHighlighted(d),
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        dayNum: i,
        isCurrentMonth: true,
        disabled: isDateDisabled(d),
        isToday: isSameDay(d, new Date()),
        isSelected: parsedDate ? isSameDay(d, parsedDate) : false,
        isHighlighted: isDateHighlighted(d),
      });
    }

    // Next month padding days to complete 6-row grid (42 cells) or 5-row
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        dayNum: i,
        isCurrentMonth: false,
        disabled: isDateDisabled(d),
        isToday: isSameDay(d, new Date()),
        isSelected: parsedDate ? isSameDay(d, parsedDate) : false,
        isHighlighted: isDateHighlighted(d),
      });
    }

    return days;
  }, [viewDate, parsedDate, minDateObj, maxDateObj, filterDate, highlightDates]);

  // Year options: current year - 15 to current year + 5
  const yearOptions = useMemo(() => {
    const currentY = new Date().getFullYear();
    const years = [];
    for (let y = currentY - 15; y <= currentY + 5; y++) {
      years.push(y);
    }
    return years;
  }, []);

  // Dropdown calendars are drawn in <body> so nothing can clip them; inline ones stay in place
  const wrapMenu = (node) => (inline ? node : createPortal(node, document.body));

  const displayString = parsedDate ? formatDate(parsedDate, dateFormat) : "";
  const placeholderDisplay = placeholderText || placeholder;

  return (
    <div
      ref={containerRef}
      className={`calendar-select-container ${className}`}
      style={style}
      title={title}
    >
      {/* Hidden input for standard HTML form validation */}
      {required && (
        <input
          type="text"
          value={displayString}
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

      {/* Trigger Box - Only for dropdown mode */}
      {!inline && (
        <div
          className={`calendar-select-trigger ${isOpen ? "open" : ""} ${disabled ? "disabled" : ""} ${error ? "error" : ""}`}
          style={triggerStyle}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!disabled) setIsOpen((prev) => !prev);
            } else if (e.key === "Escape") {
              setIsOpen(false);
            }
          }}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <div className="calendar-select-trigger-content">
            {icon && (
              <span className="calendar-select-trigger-icon">
                {typeof icon === "boolean" ? <CalendarIcon size={16} /> : icon}
              </span>
            )}
            <span
              className={`calendar-select-trigger-text ${
                !displayString ? "placeholder" : ""
              }`}
            >
              {displayString || placeholderDisplay}
            </span>
          </div>

          <div className="calendar-select-actions">
            {isClearable && displayString && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="calendar-select-clear-btn"
                title="Clear date"
              >
                <X size={12} />
              </button>
            )}
            <span className="calendar-select-chevron">
              <ChevronDown size={16} />
            </span>
          </div>
        </div>
      )}

      {/* Dropdown Calendar - ALWAYS DOWNWARD (or inline) */}
      {(inline || isOpen) && wrapMenu(
        <div
          ref={dropdownRef}
          className={`calendar-select-dropdown ${inline ? "inline" : ""} ${dropdownClassName}`}
          style={inline ? undefined : { position: "fixed", top: pos ? pos.top : 0, left: pos ? pos.left : 0, right: "auto", bottom: "auto", visibility: pos ? "visible" : "hidden" }}
        >
          {/* Header */}
          <div className="calendar-header">
            <div className="calendar-header-title">
              <SelectField
                compact
                searchable={false}
                className="calendar-month-pick"
                value={viewDate.getMonth()}
                options={MONTH_NAMES.map((m, idx) => ({ value: idx, label: m }))}
                onChange={(e) => handleMonthSelect(Number(e.target.value))}
              />
              <SelectField
                compact
                searchable={false}
                className="calendar-year-pick"
                value={viewDate.getFullYear()}
                options={yearOptions}
                onChange={(e) => handleYearSelect(Number(e.target.value))}
              />
            </div>

            <div className="calendar-nav-btns">
              <button
                type="button"
                className="calendar-nav-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  changeMonth(-1);
                }}
                title="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="calendar-nav-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  changeMonth(1);
                }}
                title="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="calendar-weekdays-grid">
            {WEEK_DAYS.map((wd) => (
              <div key={wd} className="calendar-weekday-cell">
                {wd}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="calendar-days-grid">
            {calendarDays.map((cd, index) => {
              const customDayClass =
                typeof dayClassName === "function" ? dayClassName(cd.date) : "";

              const classNames = [
                "calendar-day-cell",
                !cd.isCurrentMonth ? "other-month" : "",
                cd.isToday ? "today" : "",
                cd.isSelected ? "selected" : "",
                cd.isHighlighted ? "highlighted" : "",
                cd.disabled ? "disabled" : "",
                customDayClass,
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div
                  key={`day-${index}`}
                  className={classNames}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!cd.disabled) {
                      handleSelectDate(cd.date);
                    }
                  }}
                >
                  {cd.dayNum}
                </div>
              );
            })}
          </div>

          {/* Footer Shortcuts */}
          {showFooter && (
            <div className="calendar-footer">
              <button
                type="button"
                className="calendar-footer-btn clear-btn"
                onClick={handleClear}
              >
                Clear
              </button>
              <button
                type="button"
                className="calendar-footer-btn today-btn"
                onClick={handleToday}
              >
                Today
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Drop-in for <input type="date">: same value ("YYYY-MM-DD"), same onChange(event), min / max as strings.
 */
export const DateField = ({ value, onChange, min, max, ...rest }) => (
  <CalendarSelect
    {...rest}
    value={value || ""}
    minDate={min || undefined}
    maxDate={max || undefined}
    onChange={(date, text, event) => onChange && onChange(event)}
  />
);

export default CalendarSelect;
