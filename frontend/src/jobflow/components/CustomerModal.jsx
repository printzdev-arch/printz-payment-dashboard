import React, { useState, useEffect } from "react";
import { X, RefreshCw } from "lucide-react";
import jobFlowApi from "../api/jobFlowApi";
import { toast } from "react-toastify";

const getActiveBranchInfo = () => {
  try {
    const userBranch = localStorage.getItem("userBranchName");
    const userObj = JSON.parse(localStorage.getItem("user") || "{}");
    const printzUser = JSON.parse(localStorage.getItem("printz_user") || "{}");
    const branchName =
      (userBranch && userBranch.trim()) ||
      (userObj.branch && userObj.branch.trim()) ||
      (userObj.branchName && userObj.branchName.trim()) ||
      (printzUser.branch && printzUser.branch.trim()) ||
      (printzUser.branchName && printzUser.branchName.trim()) ||
      "";
    const branchId = userObj.branchId || (userObj.branchIds && userObj.branchIds[0]) || null;
    return { branchName, branchId };
  } catch (e) {
    return { branchName: "", branchId: null };
  }
};

export const CustomerModal = ({ isOpen, onClose, customer, onSaved }) => {
  const activeBranch = getActiveBranchInfo();
  const [formData, setFormData] = useState({
    customerType: "Individual",
    name: "",
    customerCode: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postcode: "",
    country: "Malaysia",
    companyName: "",
    gstin: "",
    defaultBranch: activeBranch.branchName || "Banaswadii",
    remarks: "",
  });

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (customer) {
        setFormData({
          customerType: customer.customerType || (customer.type === "company" ? "Company" : "Individual"),
          name: customer.name || "",
          customerCode: customer.customerCode || customer.code || "",
          phone: customer.phone || customer.mobile || "",
          email: customer.email || "",
          addressLine1: customer.address?.line1 || customer.addressLine1 || "",
          addressLine2: customer.address?.line2 || customer.addressLine2 || "",
          city: customer.address?.city || customer.city || "",
          state: customer.address?.state || customer.state || "",
          postcode: customer.address?.postcode || customer.postcode || "",
          country: customer.address?.country || customer.country || "Malaysia",
          companyName: customer.companyName || (customer.type === "company" ? customer.name : ""),
          gstin: customer.gstin || customer.taxNo || "",
          defaultBranch: customer.defaultBranch || customer.branchId?.name || customer.branchName || activeBranch.branchName || "Banaswadii",
          remarks: customer.remarks || "",
        });
      } else {
        generateCustomerCode();
      }

      // Fetch branches dynamically
      jobFlowApi.getBranches()
        .then((res) => {
          const bList = res?.data || res?.items || (Array.isArray(res) ? res : []);
          if (Array.isArray(bList) && bList.length > 0) {
            setBranches(bList);
            if (!customer) {
              const matched = bList.find((b) =>
                (activeBranch.branchId && (b._id === activeBranch.branchId || b.id === activeBranch.branchId)) ||
                (activeBranch.branchName &&
                  ((b.name && b.name.toLowerCase().includes(activeBranch.branchName.toLowerCase())) ||
                   (activeBranch.branchName.toLowerCase().includes((b.name || "").toLowerCase())) ||
                   (b.branchName && b.branchName.toLowerCase().includes(activeBranch.branchName.toLowerCase()))))
              );
              if (matched) {
                setFormData((prev) => ({
                  ...prev,
                  defaultBranch: matched.name || matched.branchName,
                }));
              } else if (bList.length > 0) {
                setFormData((prev) => ({
                  ...prev,
                  defaultBranch: bList[0].name || bList[0].branchName,
                }));
              }
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, customer]);

  const generateCustomerCode = () => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    setFormData((prev) => ({ ...prev, customerCode: `CUST-${randomNum}` }));
  };

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    setLoading(true);
    try {
      const backendCustomerType = formData.customerType === "Company" ? "B2B" : "REGULAR";
      const formattedAddress = [
        formData.addressLine1,
        formData.addressLine2,
        formData.city,
        formData.state,
        formData.postcode,
        formData.country,
      ]
        .filter(Boolean)
        .join(", ");

      const activeInfo = getActiveBranchInfo();
      let matchedBranch = branches.find(
        (b) =>
          (b._id || b.id) === formData.defaultBranch ||
          (b.name && b.name.toLowerCase() === (formData.defaultBranch || "").toLowerCase()) ||
          (b.branchName && b.branchName.toLowerCase() === (formData.defaultBranch || "").toLowerCase())
      );

      if (!matchedBranch && activeInfo.branchName) {
        matchedBranch = branches.find(
          (b) =>
            (b.name && b.name.toLowerCase().includes(activeInfo.branchName.toLowerCase())) ||
            (activeInfo.branchName.toLowerCase().includes((b.name || "").toLowerCase()))
        );
      }

      let branchId =
        matchedBranch?._id ||
        matchedBranch?.id ||
        activeInfo.branchId ||
        (/^[0-9a-fA-F]{24}$/.test(formData.defaultBranch) ? formData.defaultBranch : undefined) ||
        (branches[0]?._id || branches[0]?.id);

      const payload = {
        name: formData.name.trim(),
        customerCode: (formData.customerCode || "").trim().toUpperCase() || undefined,
        mobile: formData.phone.trim(),
        phone: formData.phone.trim(),
        email: formData.email?.trim() || undefined,
        customerType: backendCustomerType,
        type: formData.customerType.toLowerCase(),
        company: formData.customerType === "Company" ? (formData.companyName || formData.name).trim() : undefined,
        companyName: formData.customerType === "Company" ? (formData.companyName || formData.name).trim() : undefined,
        gstin: formData.gstin?.trim() || undefined,
        address: formattedAddress || undefined,
        branchId: branchId,
        remarks: formData.remarks?.trim() || undefined,
      };

      let savedResult;
      if (customer?._id || customer?.id) {
        savedResult = await jobFlowApi.updateCustomer(customer._id || customer.id, payload);
        toast.success("Customer profile updated successfully in database");
      } else {
        savedResult = await jobFlowApi.createCustomer(payload);
        const newCust = savedResult?.data || savedResult;
        toast.success(
          `Customer ${newCust?.name || payload.name} (${newCust?.customerCode || payload.customerCode || ""}) registered successfully in database`
        );
      }

      const savedCust = savedResult?.data || savedResult;
      if (onSaved) onSaved(savedCust, !customer);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal jf-modal-lg">
        <div className="jf-modal-header">
          <div>
            <h2 className="jf-modal-title">
              {customer ? "Edit Customer Information" : "Register Customer Information"}
            </h2>
            <p className="jf-header-subtitle" style={{ margin: 0 }}>
              {customer ? "Update customer profile and preferences" : "Register a new customer or update existing details (Staff-assisted)"}
            </p>
          </div>
          <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="jf-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              {/* Basic Information */}
              <div className="jf-card" style={{ marginBottom: 0 }}>
                <h3 className="jf-card-title" style={{ fontSize: "0.95rem", marginBottom: "1rem" }}>
                  Basic Information
                </h3>

                <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                  <label className="jf-label">Customer Type</label>
                  <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.25rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="customerType"
                        value="Individual"
                        checked={formData.customerType === "Individual"}
                        onChange={handleChange}
                      />
                      Individual
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="customerType"
                        value="Company"
                        checked={formData.customerType === "Company"}
                        onChange={handleChange}
                      />
                      Company
                    </label>
                  </div>
                </div>

                <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                  <label className="jf-label jf-label-required">Customer Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. John Tan"
                    className="jf-input"
                    required
                  />
                </div>

                <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                  <label className="jf-label">Customer Code</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      type="text"
                      name="customerCode"
                      value={formData.customerCode}
                      onChange={handleChange}
                      className="jf-input"
                    />
                    <button
                      type="button"
                      className="jf-btn jf-btn-secondary jf-btn-sm"
                      onClick={generateCustomerCode}
                      title="Generate new code"
                    >
                      <RefreshCw size={14} /> Generate
                    </button>
                  </div>
                </div>

                <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                  <label className="jf-label jf-label-required">Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="012-345 6789"
                    className="jf-input"
                    required
                  />
                </div>

                <div className="jf-form-group">
                  <label className="jf-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john.tan@email.com"
                    className="jf-input"
                  />
                </div>
              </div>

              {/* Address & Additional Information */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="jf-card" style={{ marginBottom: 0 }}>
                  <h3 className="jf-card-title" style={{ fontSize: "0.95rem", marginBottom: "1rem" }}>
                    Address Information
                  </h3>

                  <div className="jf-form-group" style={{ marginBottom: "0.75rem" }}>
                    <label className="jf-label">Address Line 1</label>
                    <input
                      type="text"
                      name="addressLine1"
                      value={formData.addressLine1}
                      onChange={handleChange}
                      placeholder="12, Jalan Sri Petaling"
                      className="jf-input"
                    />
                  </div>

                  <div className="jf-form-group" style={{ marginBottom: "0.75rem" }}>
                    <label className="jf-label">Address Line 2</label>
                    <input
                      type="text"
                      name="addressLine2"
                      value={formData.addressLine2}
                      onChange={handleChange}
                      placeholder="Taman Sri Petaling"
                      className="jf-input"
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div className="jf-form-group">
                      <label className="jf-label">City</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="Kuala Lumpur"
                        className="jf-input"
                      />
                    </div>
                    <div className="jf-form-group">
                      <label className="jf-label">State</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        placeholder="Wilayah Persekutuan"
                        className="jf-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className="jf-form-group">
                      <label className="jf-label">Postcode</label>
                      <input
                        type="text"
                        name="postcode"
                        value={formData.postcode}
                        onChange={handleChange}
                        placeholder="57000"
                        className="jf-input"
                      />
                    </div>
                    <div className="jf-form-group">
                      <label className="jf-label">Country</label>
                      <input
                        type="text"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="jf-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="jf-card" style={{ marginBottom: 0 }}>
                  <h3 className="jf-card-title" style={{ fontSize: "0.95rem", marginBottom: "1rem" }}>
                    Additional Information
                  </h3>

                  {formData.customerType === "Company" && (
                    <div className="jf-form-group" style={{ marginBottom: "0.75rem" }}>
                      <label className="jf-label">Company Name</label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        placeholder="ABC Marketing Sdn Bhd"
                        className="jf-input"
                      />
                    </div>
                  )}

                  <div className="jf-form-group" style={{ marginBottom: "0.75rem" }}>
                    <label className="jf-label">GSTIN / Tax No</label>
                    <input
                      type="text"
                      name="gstin"
                      value={formData.gstin}
                      onChange={handleChange}
                      placeholder="123456789012"
                      className="jf-input"
                    />
                  </div>

                  <div className="jf-form-group" style={{ marginBottom: "0.75rem" }}>
                    <label className="jf-label">Default Branch</label>
                    <select
                      name="defaultBranch"
                      value={formData.defaultBranch}
                      onChange={handleChange}
                      className="jf-select"
                    >
                      {branches.length === 0 && (
                        <option value={formData.defaultBranch || "Banaswadii"}>
                          {formData.defaultBranch || "Banaswadii"}
                        </option>
                      )}
                      {branches.map((b) => (
                        <option key={b._id || b.id} value={b.name || b.branchName}>
                          {b.name || b.branchName} ({b.code || b.branchCode || "BR"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="jf-form-group">
                    <label className="jf-label">Remarks</label>
                    <input
                      type="text"
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleChange}
                      placeholder="Preferred contact via WhatsApp"
                      className="jf-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="jf-modal-footer">
            <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="jf-btn jf-btn-primary" disabled={loading}>
              {loading ? "Saving..." : "Save Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerModal;
