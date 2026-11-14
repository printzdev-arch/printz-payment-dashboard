import React from "react";
import { CalendarDays } from "lucide-react";
import SelectField from "./SelectField";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * Month + year picker (replaces <input type="month">).
 * value is "YYYY-MM"; onChange gets { target: { value: "YYYY-MM" } }.
 */
export default function MonthField({ value, onChange, className = "", yearsBack = 4, yearsAhead = 1 }) {
  const now = new Date();
  const [yStr, mStr] = String(value || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`).split("-");
  const year = Number(yStr);
  const month = Number(mStr);
  const thisYear = now.getFullYear();
  const years = [];
  for (let y = thisYear - yearsBack; y <= thisYear + yearsAhead; y += 1) years.push(y);
  if (!years.includes(year)) years.push(year);
  years.sort((a, b) => b - a);

  const emit = (y, m) => onChange && onChange({ target: { value: `${y}-${String(m).padStart(2, "0")}` } });

  return (
    <div className={`month-field ${className}`}>
      <SelectField
        className="month-field-month"
        searchable={false}
        icon={<CalendarDays size={16} />}
        value={month}
        options={MONTHS.map((label, i) => ({ value: i + 1, label }))}
        onChange={(e) => emit(year, Number(e.target.value))}
      />
      <SelectField
        className="month-field-year"
        searchable={false}
        value={year}
        options={years}
        onChange={(e) => emit(Number(e.target.value), month)}
      />
    </div>
  );
}
