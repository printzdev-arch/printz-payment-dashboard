import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../context/AuthContext.jsx";
import CustomerEntry from "../components/CustomerEntry";
import "../styles/customerV3.css";

/**
 * PrintZ V3 - Customer Entry Page (Manager Portal)
 */
export default function CustomerEntryPage() {
  const navigate = useNavigate();
  const { currentUser, user } = useAuth();
  const effectiveUser = currentUser || user;

  const branchName = effectiveUser?.branch || effectiveUser?.branchName || "Banaswadi";
  const branchId = effectiveUser?.branchId || "64f1a2b3c4d5e6f7a8b90001";
  const branchCode = effectiveUser?.branchCode || "BR001";

  const handleCustomerSelectedForJob = (customer) => {
    const cusId = customer?.id || customer?._id || customer?.customerId;
    navigate(`/v3/jobs/new?customerId=${cusId}`, { state: { customer } });
  };

  return (
    <div className="v3-customer-page-wrapper">
      <CustomerEntry
        branchName={branchName}
        branchId={branchId}
        branchCode={branchCode}
        onCustomerSelectedForJob={handleCustomerSelectedForJob}
      />
    </div>
  );
}
