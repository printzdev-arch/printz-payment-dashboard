import React from "react";
import { useSalaryMaintenance } from "../utils/salaryGuards";

export default function SalaryMaintenanceBanner() {
  const active = useSalaryMaintenance();
  if (!active) return null;
  return (
    <div
      role="alert"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "#fef3c7",
        border: "1px solid #f59e0b",
        color: "#92400e",
        borderRadius: "8px",
        padding: "10px 14px",
        marginBottom: "14px",
        fontSize: "13px",
        fontWeight: 600,
      }}
    >
      ⚠️ Maintenance Mode Active: Salary calculation and payment operations are temporarily suspended. You may
      still view historical payroll records and audit reports.
    </div>
  );
}
