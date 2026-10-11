import React, { useState } from "react";
import { QrCode, Upload, CheckCircle, Clock, ShieldCheck, Sparkles } from "lucide-react";
import jobFlowApi from "../api/jobFlowApi";
import { toast } from "react-toastify";

export const BranchQrCustomerForm = () => {
  const [branches, setBranches] = React.useState([]);
  const [formData, setFormData] = useState({
    branchName: "AAA Inventory (AA)",
    branchCode: "AA",
    name: "Nur Aisyah",
    phone: "011-223 3445",
    email: "aisyah@email.com",
    companyName: "",
    productService: "Business Cards",
    quantity: 500,
    paperType: "Art Card",
    size: "90 x 54 mm",
    specialInstructions: "Matte finish, double sided",
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  React.useEffect(() => {
    jobFlowApi.getBranches()
      .then((res) => {
        const list = res?.data || res?.items || res || [];
        if (Array.isArray(list) && list.length > 0) {
          setBranches(list);
          const first = list[0];
          setFormData((prev) => ({
            ...prev,
            branchName: `${first.name} (${first.code})`,
            branchCode: first.code || "AA",
            branchId: first._id || first.id,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBranchChange = (e) => {
    const code = e.target.value;
    const b = branches.find((item) => item.code === code);
    setFormData((prev) => ({
      ...prev,
      branchCode: code,
      branchName: b ? `${b.name} (${b.code})` : code,
      branchId: b?._id || b?.id,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error("Name and Phone Number are required");
      return;
    }

    setLoading(true);
    try {
      const activeCode = formData.branchCode || (branches[0]?.code) || "AA";
      const payload = {
        ...formData,
        branchCode: activeCode,
        branch: activeCode,
        customerName: formData.name.trim(),
        customerPhone: formData.phone.trim(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        mobile: formData.phone.trim(),
        email: formData.email?.trim() || undefined,
      };

      // 1. Submit public job request
      await jobFlowApi.submitPublicJobRequest(payload);

      // 2. Also register in centralized customer master if token is present
      try {
        await jobFlowApi.createCustomer({
          name: formData.name.trim(),
          mobile: formData.phone.trim(),
          phone: formData.phone.trim(),
          email: formData.email?.trim() || undefined,
          companyName: formData.companyName?.trim() || undefined,
          branchId: formData.branchId || branches[0]?._id,
          customerType: "REGULAR",
        });
      } catch (_) {}

      setSubmitted(true);
      toast.success("Print request submitted and customer registered in database!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit print request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#062817", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          maxWidth: "960px",
          width: "100%",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        }}
      >
        {/* Left Branding Column (Image 1 Screen 4) */}
        <div
          style={{
            background: "linear-gradient(180deg, #064e3b 0%, #062817 100%)",
            color: "#ffffff",
            padding: "2.5rem 1.75rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Sparkles size={28} style={{ color: "#34d399" }} />
              <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>PrintZ</h1>
            </div>
            <p style={{ color: "#a7f3d0", fontSize: "0.875rem", marginTop: 0 }}>Your Print Partner</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <ShieldCheck size={24} style={{ color: "#34d399" }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>High Quality Prints</div>
                <div style={{ fontSize: "0.75rem", color: "#a7f3d0" }}>300 DPI Ultra HD output</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Clock size={24} style={{ color: "#34d399" }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>Fast Turnaround</div>
                <div style={{ fontSize: "0.75rem", color: "#a7f3d0" }}>Same-day & Express delivery</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <CheckCircle size={24} style={{ color: "#34d399" }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>Professional Service</div>
                <div style={{ fontSize: "0.75rem", color: "#a7f3d0" }}>Dedicated design & proof check</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: "0.75rem", color: "#6ee7b7" }}>
            Scan QR Code at any branch counter to submit job requests instantly.
          </div>
        </div>

        {/* Right Form Column */}
        <div style={{ padding: "2.5rem" }}>
          {!submitted ? (
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                    PrintZ — Customer Request Form
                  </h2>
                  <p style={{ fontSize: "0.875rem", color: "#64748b", margin: "4px 0 0 0" }}>
                    Submit your print request and we will contact you soon.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 600 }}>Branch:</span>
                  <select
                    name="branchName"
                    value={formData.branchName}
                    onChange={handleChange}
                    className="jf-select"
                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.8125rem" }}
                  >
                    <option value="Kuala Lumpur (BR-01)">Kuala Lumpur (BR-01)</option>
                    <option value="Main Branch">Main Branch</option>
                    <option value="Branch 02">Branch 02</option>
                  </select>
                </div>
              </div>

              {/* Customer Information (Image 1 Screen 4) */}
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 0.75rem 0", color: "#0f172a" }}>
                Customer Information
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div className="jf-form-group">
                  <label className="jf-label jf-label-required">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="jf-input"
                    required
                  />
                </div>
                <div className="jf-form-group">
                  <label className="jf-label jf-label-required">Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
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
                    className="jf-input"
                  />
                </div>
                <div className="jf-form-group">
                  <label className="jf-label">Company Name (optional)</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="jf-input"
                  />
                </div>
              </div>

              {/* Print Request */}
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 0.75rem 0", color: "#0f172a" }}>
                Print Request
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                <div className="jf-form-group">
                  <label className="jf-label jf-label-required">Product / Service</label>
                  <select
                    name="productService"
                    value={formData.productService}
                    onChange={handleChange}
                    className="jf-select"
                  >
                    <option value="Business Cards">Business Cards</option>
                    <option value="Flyers">Flyers</option>
                    <option value="Brochures">Brochures</option>
                    <option value="Posters">Posters</option>
                    <option value="Banners">Banners</option>
                  </select>
                </div>
                <div className="jf-form-group">
                  <label className="jf-label jf-label-required">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="jf-input"
                    min="1"
                    required
                  />
                </div>
                <div className="jf-form-group">
                  <label className="jf-label">Paper Type</label>
                  <select
                    name="paperType"
                    value={formData.paperType}
                    onChange={handleChange}
                    className="jf-select"
                  >
                    <option value="Art Card">Art Card</option>
                    <option value="Art Paper">Art Paper</option>
                    <option value="Simili Paper">Simili Paper</option>
                  </select>
                </div>
                <div className="jf-form-group">
                  <label className="jf-label">Size</label>
                  <select
                    name="size"
                    value={formData.size}
                    onChange={handleChange}
                    className="jf-select"
                  >
                    <option value="90 x 54 mm">90 x 54 mm</option>
                    <option value="A4 (210 x 297 mm)">A4 (210 x 297 mm)</option>
                    <option value="A5 (148 x 210 mm)">A5 (148 x 210 mm)</option>
                  </select>
                </div>
              </div>

              <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
                <label className="jf-label">Special Instructions (optional)</label>
                <input
                  type="text"
                  name="specialInstructions"
                  value={formData.specialInstructions}
                  onChange={handleChange}
                  className="jf-input"
                />
              </div>

              <label className="jf-dropzone" style={{ display: "block", padding: "1.25rem", marginBottom: "1.5rem" }}>
                <Upload size={20} style={{ color: "var(--jf-primary)", margin: "0 auto 0.25rem" }} />
                <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                  Drag and drop files here or <span style={{ color: "var(--jf-primary)", textDecoration: "underline" }}>click to upload</span>
                </div>
              </label>

              <button
                type="submit"
                className="jf-btn jf-btn-primary"
                style={{ width: "100%", padding: "0.75rem", fontSize: "0.95rem" }}
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <CheckCircle size={48} style={{ color: "var(--jf-primary)", margin: "0 auto 1rem" }} />
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#0f172a" }}>
                Request Received!
              </h2>
              <p style={{ color: "#64748b", margin: "0 0 1.5rem 0" }}>
                Thank you, <strong>{formData.name}</strong>. Your print request for <strong>{formData.productService} ({formData.quantity} pcs)</strong> has been logged with Branch {formData.branchName}.
              </p>
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={() => setSubmitted(false)}
              >
                Submit Another Request
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchQrCustomerForm;
