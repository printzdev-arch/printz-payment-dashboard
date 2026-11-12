import { round2 } from "../../../../shared/utils/validation";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useLocation, useParams } from "react-router-dom";
import {
  Save,
  CheckCircle,
  Plus,
  Trash2,
  Upload,
  FileText,
  Sparkles,
  Search,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import JobFlowLayout from "../../../../layouts/JobFlowLayout/JobFlowLayout";
import CustomerModal from "../../customers/components/CustomerModal";
import JobTypeBadge from "../../shared/components/JobTypeBadge";
import { useMasterDefaults } from "../../master-settings";
import jobFlowApi from "../api/jobOrdersApi";
import { toast } from "react-toastify";

const getManagerBranch = () => {
  try {
    const userBranch = localStorage.getItem("userBranchName");
    if (userBranch && userBranch.trim()) return userBranch.trim();
    const userObj = JSON.parse(localStorage.getItem("user") || "{}");
    if (userObj.branch && userObj.branch.trim()) return userObj.branch.trim();
    if (userObj.branchName && userObj.branchName.trim()) return userObj.branchName.trim();
    const printzUser = JSON.parse(localStorage.getItem("printz_user") || "{}");
    if (printzUser.branch && printzUser.branch.trim()) return printzUser.branch.trim();
    if (printzUser.branchName && printzUser.branchName.trim()) return printzUser.branchName.trim();
  } catch (e) {}
  return "Main Branch";
};

const getManagerBranchId = () => {
  try {
    const directBranchId = localStorage.getItem("userBranchId");
    if (directBranchId && /^[0-9a-fA-F]{24}$/.test(String(directBranchId).trim())) {
      return String(directBranchId).trim();
    }
    const userObj = JSON.parse(localStorage.getItem("user") || "{}");
    const uBranchId = userObj.branchId || (Array.isArray(userObj.branchIds) && userObj.branchIds[0]);
    if (uBranchId && /^[0-9a-fA-F]{24}$/.test(String(uBranchId).trim())) {
      return String(uBranchId).trim();
    }
    const printzUser = JSON.parse(localStorage.getItem("printz_user") || "{}");
    const pBranchId = printzUser.branchId || (Array.isArray(printzUser.branchIds) && printzUser.branchIds[0]);
    if (pBranchId && /^[0-9a-fA-F]{24}$/.test(String(pBranchId).trim())) {
      return String(pBranchId).trim();
    }
  } catch (e) {}
  return null;
};

// Orders are either collected at the branch or dispatched; the master list is not used here
const DELIVERY_METHODS = [{ name: "Branch Counter Self-Pickup" }, { name: "Local Dispatch / Delivery" }];

const MAX_UPLOAD_MB = 25;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export const DEFAULT_PRODUCT_PRICES = {
  "Business Cards": 0.40,
  "Flyers / Leaflets": 0.50,
  "Brochures": 2.50,
  "Booklets / Catalogues": 8.00,
  "Posters (A3/A2/A1)": 15.00,
  "Banners (Roll-up / Tarpaulin)": 35.00,
  "Stickers / Labels": 0.35,
  "Letterheads": 0.60,
  "Envelopes": 0.80,
  "Presentation Folders": 4.50,
  "Money Packets": 1.20,
  "Notepads": 3.00,
};

export const getProductDefaultPrice = (productType, size = "", masterList = []) => {
  if (!productType) return 0;
  const match = (masterList || []).find(
    (it) => it.name && it.name.toLowerCase() === productType.toLowerCase()
  );
  if (match && Number(match.defaultPrice) > 0) {
    return Number(match.defaultPrice);
  }
  if (productType.includes("Poster")) {
    const s = String(size || "").toUpperCase();
    if (s.includes("A1")) return 25.00;
    if (s.includes("A2")) return 18.00;
    if (s.includes("A3")) return 10.00;
    return 15.00;
  }
  // Unknown product: no invented price, the user enters it
  return DEFAULT_PRODUCT_PRICES[productType] || 0;
};

// Date input needs yyyy-mm-dd in the user's own calendar day
const toDateInputValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Job type is stored as free text; map it back to one of the three dropdown values
const normalizeJobType = (value) => {
  const t = String(value || "").toUpperCase();
  const hasPrint = t.includes("PRINT");
  const hasDesign = t.includes("DESIGN");
  if (hasPrint && hasDesign) return "Print & Design";
  if (hasDesign) return "Design Only";
  if (hasPrint) return "Print Only";
  return "";
};

// Only these stages (before the estimate is approved) can still be edited
const EDITABLE_STAGES = ["ENQUIRY", "ESTIMATION", "ESTIMATE_APPROVAL"];

/*
  Printing and Packing are default services of every job order. Each has its own cost
  (separate from the product cost). They are always the first two rows of finishingServices.
  The names "Print" / "Packing" match what the server uses, so it never adds a second copy.
*/
const DEFAULT_PRINT_RATE = 0.2; // per sheet
const DEFAULT_PACK_RATE = 0.2; // per pack of 100
const packsFor = (qty) => Math.max(1, Math.ceil((Number(qty) || 0) / 100));
const defaultPrintRow = (qty, src = {}) => {
  const q = Number(qty) > 0 ? Number(qty) : 1;
  return { config: "", unitPrice: DEFAULT_PRINT_RATE, quantity: q, unit: "sheets", ...src, id: "default-print", name: "Print", isDefault: true };
};
const defaultPackingRow = (qty, src = {}) => ({
  config: "Shrink Wrap", unitPrice: DEFAULT_PACK_RATE, quantity: packsFor(qty), unit: "packs", ...src, id: "default-packing", name: "Packing", isDefault: true,
});
const isDefaultServiceName = (n) => ["print", "printing", "packing"].includes(String(n || "").trim().toLowerCase());
// Put Print and Packing first, reusing the saved price / quantity when the list already has them
const withDefaultServices = (list = [], qty = 1) => {
  const find = (names) => list.find((f) => names.includes(String(f?.name || "").trim().toLowerCase()));
  const print = find(["print", "printing"]);
  const pack = find(["packing"]);
  const others = list.filter((f) => f && !isDefaultServiceName(f.name));
  return [
    defaultPrintRow(qty, print ? { config: print.config || undefined, unitPrice: Number(print.unitPrice) || 0, quantity: Number(print.quantity) || Number(qty) || 1, qtyManual: Boolean(print.qtyManual) } : {}),
    defaultPackingRow(qty, pack ? { config: pack.config || undefined, unitPrice: Number(pack.unitPrice) || 0, quantity: Number(pack.quantity) || packsFor(qty), qtyManual: Boolean(pack.qtyManual) } : {}),
    ...others,
  ];
};

export const CreateJobOrderPage = ({ isModal = false, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId");
  // /jobflow/jobs/:id/edit opens this page in edit mode
  const { id: editJobId } = useParams();
  const isEditMode = Boolean(editJobId) && !isModal;
  const [editJobNo, setEditJobNo] = useState("");
  const [editLoading, setEditLoading] = useState(isEditMode);

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();
  const isDesigner = (storedUser.role || "").toLowerCase() === "designer" || location.pathname.includes("designer-jobs");

  const managerBranch = getManagerBranch();
  const managerBranchId = getManagerBranchId();
  // Only admins may pick another branch; managers and designers stay on their assigned branch
  const isBranchLocked = isEditMode || !["admin", "super_admin"].includes(String(storedUser.role || "").toLowerCase());
  const masterDefaults = useMasterDefaults();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);

  // Customer search & combobox state
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const customerDropdownRef = useRef(null);

  // Close customer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live debounced customer search to ensure freshly created customers are always found
  useEffect(() => {
    if (!customerSearchTerm.trim() || customerSearchTerm.length < 2) return;
    const timer = setTimeout(() => {
      jobFlowApi.searchCustomers(customerSearchTerm)
        .then((res) => {
          const items = res?.data || (Array.isArray(res) ? res : []);
          if (Array.isArray(items) && items.length > 0) {
            setCustomers((prev) => {
              const ids = new Set(prev.map((c) => c._id || c.id));
              const fresh = items.filter((it) => !ids.has(it._id || it.id));
              return [...prev, ...fresh];
            });
          }
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearchTerm]);

  // Form State
  const [sideTab, setSideTab] = useState("upload"); // "upload" | "preview"
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    customerCode: "",
    customerPhone: "",
    customerEmail: "",
    branchId: managerBranchId || "",
    branchName: managerBranch || "Main Branch",
    jobType: "",
    jobTitle: "",
    targetDueDate: "",
    priority: "NORMAL",
    deliveryMethod: "",
    // Print Only jobs can skip quality control; it is on for every job by default
    qcRequired: true,
    remarks: "",

    productType: "",
    quantity: "",
    unitPrice: "",
    unitPriceManuallyEdited: false,
    paperType: "",
    paperGsm: "",
    size: "",
    color: "",
    printingSide: "",
    lamination: "",
    finishing: "",
    proofRequirement: "",

    finishingServices: [defaultPrintRow(1), defaultPackingRow(1)],
    additionalServices: [],

    uploadedFiles: [],
    specialInstructions: "",
  });

  // Edit mode: fetch the existing job order and fill the form with it
  useEffect(() => {
    if (!isEditMode) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await jobFlowApi.getJobOrderById(editJobId);
        const job = res?.data || res;
        if (cancelled) return;
        if (!job || !(job._id || job.id)) throw new Error("Job order not found");

        const stage = String(job.currentStage || job.stage || "").toUpperCase();
        const editable =
          job.canEdit !== undefined
            ? job.canEdit
            : job.estimationStatus !== "APPROVED" && EDITABLE_STAGES.includes(stage);
        if (!editable) {
          toast.error("This job order can no longer be edited because its estimate has been approved.");
          navigate("/jobflow/jobs", { replace: true });
          return;
        }

        const specs = job.specs || {};
        const firstItem = (job.items && job.items[0]) || {};
        const itemSpecs = firstItem.specifications || {};
        const pick = (key) => specs[key] ?? itemSpecs[key] ?? firstItem[key] ?? "";

        let finishing = Array.isArray(job.finishingServices) ? job.finishingServices : [];
        if (finishing.length === 0 && Array.isArray(job.items)) {
          finishing = job.items
            .filter((it) => it.itemType === "FINISHING" || String(it.itemName || "").toLowerCase().startsWith("finishing"))
            .map((it) => ({
              name: String(it.itemName || "").replace(/^finishing:\s*/i, ""),
              config: String(it.description || "").replace(/\s*\(.*\)\s*$/, "") || "Standard",
              unitPrice: Number(it.unitRate || it.unitPrice || 0),
              quantity: Number(it.quantity || 0),
              unit: String(it.unit || "sheets").toLowerCase(),
            }));
        }
        const finishingServices = finishing.map((f, idx) => {
          const quantity = Number(f.quantity) || Number(job.quantity) || 1;
          const unitPrice = Number(f.unitPrice) || 0;
          return {
            ...f,
            id: f.id || `edit-${idx}-${Date.now()}`,
            name: f.name,
            config: f.config || "Standard",
            unit: f.unit || "sheets",
            quantity,
            unitPrice,
            total: Math.round(quantity * unitPrice * 100) / 100,
            qtyManual: true,
          };
        });

        const jobQty = Number(job.quantity) || Number(specs.quantity) || Number(firstItem.quantity) || "";
        const unitPrice = specs.unitPrice ?? firstItem.unitRate ?? firstItem.unitPrice ?? "";
        const branchObj = job.branchId && typeof job.branchId === "object" ? job.branchId : null;
        const snapshot = job.customerSnapshot || {};
        const customerRef = job.customerId && typeof job.customerId === "object" ? job.customerId : null;
        const customerIdValue = String(customerRef?._id || job.customerId || "");

        setEditJobNo(job.jobNo || "");
        setFormData((prev) => ({
          ...prev,
          customerId: customerIdValue,
          customerName: job.customerName || snapshot.name || customerRef?.name || "",
          customerCode: customerRef?.customerCode || "",
          customerPhone: job.customerPhone || snapshot.mobile || "",
          customerEmail: job.customerEmail || snapshot.email || "",
          branchId: String(branchObj?._id || job.branchId || ""),
          branchName: job.branchName || branchObj?.name || prev.branchName,
          jobType: normalizeJobType(job.jobType || specs.jobType),
          jobTitle: job.title || "",
          targetDueDate: toDateInputValue(job.dueDate),
          priority: ["URGENT", "HIGH", "RUSH"].includes(String(job.priority || "").toUpperCase()) ? "URGENT" : "NORMAL",
          deliveryMethod: job.deliveryMethod || "",
          qcRequired: job.qcRequired !== false,
          remarks: job.remarks || job.notes || "",
          specialInstructions: job.specialInstructions || "",
          productType: pick("productType"),
          quantity: jobQty,
          unitPrice: unitPrice === "" ? "" : Number(unitPrice),
          unitPriceManuallyEdited: unitPrice !== "",
          paperType: pick("paperType"),
          paperGsm: pick("paperGsm"),
          size: pick("size"),
          color: pick("color"),
          printingSide: pick("printingSide"),
          finishingServices: withDefaultServices(finishingServices, jobQty).map((s) =>
            s.id === "default-print" ? { ...s, config: pick("color") || s.config || "" } : s
          ),
          additionalServices: Array.isArray(job.additionalServices) ? job.additionalServices : [],
          uploadedFiles: Array.isArray(job.attachments) ? job.attachments : [],
        }));

        // Fill the customer box with "CODE - Name" (the code comes from the customer record)
        let label = job.customerName || snapshot.name || "";
        if (customerIdValue) {
          try {
            const custRes = await jobFlowApi.getCustomerById(customerIdValue);
            const cust = custRes?.data || custRes;
            if (!cancelled && cust && (cust._id || cust.id)) {
              setCustomers((prev) => (prev.some((c) => (c._id || c.id) === (cust._id || cust.id)) ? prev : [cust, ...prev]));
              const code = cust.customerCode || cust.code || "";
              setFormData((prev) => ({ ...prev, customerCode: code }));
              label = `${code} - ${cust.name || cust.companyName || label}`.replace(/^ - /, "");
            }
          } catch (_) {}
        }
        if (!cancelled) setCustomerSearchTerm(label);
      } catch (err) {
        if (cancelled) return;
        toast.error(err.response?.data?.message || "Could not load the job order for editing.");
        navigate("/jobflow/jobs", { replace: true });
      } finally {
        if (!cancelled) setEditLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editJobId]);

  const selectCustomer = (cust) => {
    setFormData((prev) => ({
      ...prev,
      customerId: cust._id || cust.id,
      customerName: cust.name || cust.companyName || "",
      customerCode: cust.customerCode || cust.code || "",
      customerPhone: cust.phone || cust.mobile || "",
      customerEmail: cust.email || "",
      branchName: prev.branchName || managerBranch || "Main Branch",
    }));
    setCustomerSearchTerm(`${cust.customerCode || cust.code || ""} - ${cust.name || cust.companyName || ""}`.replace(/^ - /, ""));
    setIsCustomerDropdownOpen(false);
  };

  useEffect(() => {
    if (preselectedCustomerId) {
      jobFlowApi.getCustomerById(preselectedCustomerId)
        .then((res) => {
          const cust = res?.data || res;
          if (cust && (cust._id || cust.id)) {
            setCustomers((prev) => {
              const exists = prev.some((c) => (c._id || c.id) === (cust._id || cust.id));
              return exists ? prev : [cust, ...prev];
            });
            selectCustomer(cust);
          }
        })
        .catch(() => {});
    }

    jobFlowApi.getCustomers({ limit: 50 })
      .then((res) => {
        const list = res?.data?.items || res?.data || [];
        if (Array.isArray(list)) {
          setCustomers((prev) => {
            const existingIds = new Set(prev.map((c) => c._id || c.id));
            const fresh = list.filter((c) => !existingIds.has(c._id || c.id));
            return [...prev, ...fresh];
          });
          if (preselectedCustomerId) {
            const match = list.find((c) => (c._id || c.id) === preselectedCustomerId);
            if (match) selectCustomer(match);
          }
        }
      })
      .catch(() => {});

    jobFlowApi.getBranches()
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          const list = res.data;
          setBranches(list);

          // Resolve and bind branch manager's branch
          const mgrBranchName = getManagerBranch();
          const mgrBranchId = getManagerBranchId();
          const matchedBranch = list.find((b) => {
            const bId = (b._id || b.id || "").toString();
            if (mgrBranchId && bId === mgrBranchId) return true;
            const bName = (b.name || b.branchName || "").trim().toLowerCase();
            const bCode = (b.code || b.branchCode || "").trim().toLowerCase();
            const target = (mgrBranchName || "").trim().toLowerCase();
            return bName === target || bCode === target;
          });

          if (matchedBranch && !isEditMode) {
            setFormData((prev) => ({
              ...prev,
              branchId: matchedBranch._id || matchedBranch.id,
              branchName: matchedBranch.branchName || matchedBranch.name || prev.branchName,
            }));
          }
        }
      })
      .catch(() => {});
  }, [preselectedCustomerId]);

  const selectedLabel = formData.customerId ? `${formData.customerCode} - ${formData.customerName}` : "";
  const isInputShowingSelectedLabel = Boolean(selectedLabel && customerSearchTerm.trim().toLowerCase() === selectedLabel.trim().toLowerCase());

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearchTerm.trim() || isInputShowingSelectedLabel) return true;
    const term = customerSearchTerm.toLowerCase().trim();
    const name = (c.name || c.companyName || "").toLowerCase();
    const code = (c.customerCode || c.code || "").toLowerCase();
    const phone = (c.phone || c.mobile || "").toLowerCase();
    const email = (c.email || "").toLowerCase();
    return name.includes(term) || code.includes(term) || phone.includes(term) || email.includes(term);
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "productType" || field === "size") {
        const pType = field === "productType" ? value : prev.productType;
        const pSize = field === "size" ? value : prev.size;
        // A different product starts from its own price again; a size change keeps a manual price
        if (field === "productType") updated.unitPriceManuallyEdited = false;
        if (!updated.unitPriceManuallyEdited) {
          updated.unitPrice = getProductDefaultPrice(pType, pSize, masterDefaults.productTypes) || "";
        }
      }
      if (field === "quantity") {
        const newQty = Number(value) > 0 ? Number(value) : "";
        if (newQty && prev.finishingServices.length > 0) {
          // Rows whose quantity was typed by hand (e.g. packs) keep it
          updated.finishingServices = prev.finishingServices.map((s) => {
            if (s.qtyManual) return s;
            const q = s.id === "default-packing" ? packsFor(newQty) : newQty;
            return { ...s, quantity: q, total: Math.round(q * Number(s.unitPrice || 0) * 100) / 100 };
          });
        }
      }
      // The Printing row has no config list of its own: it uses the Color chosen above
      if (field === "color") {
        updated.finishingServices = (updated.finishingServices || prev.finishingServices).map((s) =>
          s.id === "default-print" ? { ...s, config: value || "" } : s
        );
      }
      // QC can only be switched off for Print Only; any other type goes back to "QC required"
      if (field === "jobType" && value !== "Print Only") {
        updated.qcRequired = true;
      }
      if (field === "unitPrice") {
        updated.unitPriceManuallyEdited = true;
      }
      return updated;
    });
  };

  // Printing and Packing are default steps of every production order, so they are never picked as finishing services
  const DEFAULT_STEP_NAMES = ["print", "printing", "packing", "packing & bundling"];
  const availableFinishingServices = (
    masterDefaults.finishingServicesList.length > 0
      ? masterDefaults.finishingServicesList.map((s) => s.name)
      : [
          "Lamination",
          "Cutting",
          "Trimming",
          "Binding",
          "Folding",
          "Creasing",
          "Die Cutting",
          "Foiling",
          "UV Coating",
          "Mounting",
          "Perforation",
          "Numbering",
        ]
  ).filter((name) => !DEFAULT_STEP_NAMES.includes(String(name || "").trim().toLowerCase()));

  const getDefaultConfig = (name) => {
    const n = String(name || "").toLowerCase();
    if (n.includes("lamination")) return "Matte";
    if (n.includes("foil")) return "Gold Foil Stamping";
    if (n.includes("uv")) return "Spot UV (Front)";
    if (n.includes("pack")) return "Shrink Wrap";
    if (n.includes("bind")) return "Spiral (Black)";
    if (n.includes("fold") || n.includes("creas")) return "Half Fold";
    if (n.includes("cut") || n.includes("trim")) return "Trim to 90 x 54 mm";
    return "Standard";
  };

  const handleAddFinishingRow = () => {
    const currentQty = Number(formData.quantity) > 0 ? Number(formData.quantity) : 1;
    const unused = availableFinishingServices.find(
      (s) => !formData.finishingServices.some((f) => f.name === s)
    ) || availableFinishingServices[0] || "Lamination";

    const newRow = {
      id: Date.now(),
      name: unused,
      config: getDefaultConfig(unused),
      unitPrice: 0,
      quantity: currentQty,
      total: 0,
      unit: "sheets",
    };

    setFormData((prev) => ({
      ...prev,
      finishingServices: [...prev.finishingServices, newRow],
    }));
  };

  const handleFinishingServiceChange = (id, newName) => {
    setFormData((prev) => ({
      ...prev,
      finishingServices: prev.finishingServices.map((s) => {
        if (s.id === id) {
          return {
            ...s,
            name: newName,
            config: getDefaultConfig(newName),
          };
        }
        return s;
      }),
    }));
  };

  const removeFinishingService = (id) => {
    setFormData((prev) => ({
      ...prev,
      finishingServices: prev.finishingServices.filter((s) => s.id !== id),
    }));
  };

  const currentQuantity = Number(formData.quantity) > 0 ? Number(formData.quantity) : 0;
  // An empty price box means "use the default"; a typed 0 stays 0
  const currentUnitPrice =
    formData.unitPrice !== "" && formData.unitPrice !== null && Number.isFinite(Number(formData.unitPrice))
      ? Number(formData.unitPrice)
      : getProductDefaultPrice(formData.productType, formData.size, masterDefaults.productTypes);
  const productCost = round2(currentQuantity * Math.max(0, currentUnitPrice));

  // Row totals are always quantity x price, never a cached value
  // Text, negative or infinite values count as 0, so a total can never be NaN or negative
  const amountOf = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
  const finishingRowTotal = (s) => round2(amountOf(s.quantity) * amountOf(s.unitPrice));
  const finishingTotal = round2(formData.finishingServices.reduce((sum, s) => sum + finishingRowTotal(s), 0));

  // Product, Printing and Packing each have their own cost; the rest are the optional finishing services
  const printingCost = round2(formData.finishingServices.filter((s) => s.id === "default-print").reduce((a, s) => a + finishingRowTotal(s), 0));
  const packingCost = round2(formData.finishingServices.filter((s) => s.id === "default-packing").reduce((a, s) => a + finishingRowTotal(s), 0));
  const otherFinishingServices = formData.finishingServices.filter((s) => !s.isDefault);
  const otherFinishingTotal = round2((finishingTotal - printingCost - packingCost));

  const grandTotal = round2((productCost + finishingTotal));

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const accepted = files.filter((f) => f.size <= MAX_UPLOAD_BYTES);
    if (accepted.length < files.length) {
      toast.error(`Files larger than ${MAX_UPLOAD_MB} MB were skipped.`);
    }
    if (accepted.length === 0) {
      e.target.value = "";
      return;
    }

    // Keep the real File so it can be uploaded once the job order exists
    const newEntries = accepted.map((f) => ({
      name: f.name,
      size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
      type: "Artwork File",
      file: f,
    }));

    setFormData((prev) => ({
      ...prev,
      uploadedFiles: [...prev.uploadedFiles, ...newEntries],
    }));
    toast.success(`${accepted.length} file(s) attached.`);
    e.target.value = "";
  };

  const removeFile = (idx) => {
    setFormData((prev) => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmitJob = async (isDraft = false) => {
    if (!formData.customerId && !formData.customerName) {
      toast.error("Please select or specify a customer.");
      return;
    }
    if (!formData.jobTitle?.trim()) {
      toast.error("Please enter a Job Title.");
      return;
    }
    // Every field marked with * must be filled
    const requiredFields = [
      [formData.jobType, "Job Type"],
      [formData.deliveryMethod, "Delivery Method"],
      [formData.productType, "Product Type"],
      [formData.paperType, "Paper Type"],
      [formData.paperGsm, "Paper GSM"],
      [formData.size, "Size"],
      [formData.color, "Color"],
      [formData.printingSide, "Printing Side"],
    ];
    const missing = requiredFields.find(([value]) => !value);
    if (missing) {
      toast.error(`Please select ${missing[1]}.`);
      return;
    }
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      toast.error("Please enter a valid Quantity greater than 0.");
      return;
    }
    if (!formData.targetDueDate) {
      toast.error("Please select a Target Due Date.");
      return;
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    if (!isEditMode && formData.targetDueDate < todayStr) {
      toast.error("Target Due Date cannot be in the past.");
      return;
    }
    if (formData.unitPrice !== "" && Number(formData.unitPrice) < 0) {
      toast.error("Unit Price cannot be negative.");
      return;
    }

    setLoading(true);
    try {
      let selectedBranchId = formData.branchId;
      // Strictly resolve to branch manager's branch if missing or invalid
      if (!selectedBranchId || !/^[0-9a-fA-F]{24}$/.test(selectedBranchId)) {
        selectedBranchId = getManagerBranchId();
      }
      if (!selectedBranchId || !/^[0-9a-fA-F]{24}$/.test(selectedBranchId)) {
        const mgrBranch = getManagerBranch();
        const matched = branches.find(
          (b) =>
            (b.name && b.name.toLowerCase().includes(mgrBranch.toLowerCase())) ||
            (b.branchName && b.branchName.toLowerCase().includes(mgrBranch.toLowerCase())) ||
            (b.code && b.code.toLowerCase().includes(mgrBranch.toLowerCase()))
        );
        if (matched) selectedBranchId = matched._id || matched.id;
      }
      if (!selectedBranchId || !/^[0-9a-fA-F]{24}$/.test(selectedBranchId)) {
        toast.error("Your branch could not be determined. Please log in again.");
        setLoading(false);
        return;
      }

      const payload = {
        branchId: selectedBranchId || undefined,
        customerId: formData.customerId || undefined,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        branchName: formData.branchName,
        jobType: formData.jobType,
        title: formData.jobTitle || "Custom Print Order",
        dueDate: formData.targetDueDate,
        priority: formData.priority || "NORMAL",
        deliveryMethod: formData.deliveryMethod,
        qcRequired: formData.jobType === "Print Only" ? formData.qcRequired !== false : true,
        quantity: Number(formData.quantity),
        remarks: formData.remarks,
        notes: formData.remarks,
        specialInstructions: formData.specialInstructions,
        status: isDraft ? "DRAFT" : "SUBMITTED",
        subtotal: productCost,
        grandTotal: grandTotal,
        estimatedPrice: grandTotal,
        totalAmount: grandTotal,
        items: [
          {
            lineNo: 1,
            itemName: formData.jobTitle || `${formData.productType || "Custom Print Order"} - ${Number(formData.quantity) || 1} pcs`,
            quantity: Number(formData.quantity) || 1,
            unitPrice: currentUnitPrice,
            unitRate: currentUnitPrice,
            amount: productCost,
            totalPrice: productCost,
            productType: formData.productType,
            specifications: {
              productType: formData.productType,
              paperType: formData.paperType,
              paperGsm: formData.paperGsm,
              size: formData.size,
              color: formData.color,
              printingSide: formData.printingSide,
              lamination: (formData.finishingServices.find((s) => s.name?.toLowerCase().includes("lamination"))?.config) || formData.lamination || "",
              finishing: otherFinishingServices.map((s) => s.name).join(", ") || formData.finishing || "",
            },
            finishing: otherFinishingServices.map((s, idx) => ({
              code: (s.code || s.name || "FINISHING").toUpperCase().replace(/\s+/g, "_"),
              name: s.name,
              config: s.config || "Standard",
              quantity: Number(s.quantity) || Number(formData.quantity) || 1,
              unitPrice: Number(s.unitPrice) || 0,
              sequence: idx + 1,
              notes: s.notes || "",
            })),
            needsProduction: true,
          },
          ...(formData.finishingServices || []).map((svc, idx) => ({
            lineNo: idx + 2,
            itemType: "FINISHING",
            itemName: `Finishing: ${svc.name}`,
            description: `${svc.config || "Standard"} (${Number(svc.quantity) || Number(formData.quantity) || 1} ${svc.unit || "sheets"})`,
            quantity: Number(svc.quantity) || Number(formData.quantity) || 1,
            unit: (svc.unit || "PCS").toUpperCase(),
            unitPrice: Number(svc.unitPrice) || 0,
            unitRate: Number(svc.unitPrice) || 0,
            amount: finishingRowTotal(svc),
            totalPrice: finishingRowTotal(svc),
            needsProduction: true,
          })),
        ],
        specs: {
          jobType: formData.jobType,
          productType: formData.productType,
          quantity: Number(formData.quantity),
          unitPrice: currentUnitPrice,
          productCost: productCost,
          paperType: formData.paperType,
          paperGsm: formData.paperGsm,
          size: formData.size,
          color: formData.color,
          printingSide: formData.printingSide,
          lamination: (formData.finishingServices.find((s) => s.name?.toLowerCase().includes("lamination"))?.config) || formData.lamination || "",
          finishing: otherFinishingServices.map((s) => s.name).join(", ") || formData.finishing || "",
        },
        finishingServices: formData.finishingServices,
        additionalServices: formData.additionalServices,
        // The File objects themselves are uploaded after the job exists; only the names are sent here
        attachments: formData.uploadedFiles.map(({ file, ...meta }) => meta),
      };

      const res = isEditMode ? await jobFlowApi.updateJobOrder(editJobId, payload) : await jobFlowApi.createJobOrder(payload);
      toast.success(isEditMode ? "Job Order updated successfully!" : isDraft ? "Job saved as draft." : "Job Order created successfully!");
      const newId = isEditMode ? editJobId : res?.data?._id || res?.data?.id || (res?.data && typeof res.data === "string" ? res.data : "");

      if (newId) {
        const failedUploads = [];
        for (const entry of formData.uploadedFiles) {
          if (!entry.file) continue;
          try {
            const body = new FormData();
            body.append("file", entry.file);
            body.append("entityType", "JOB_ORDER");
            body.append("entityId", newId);
            const up = await jobFlowApi.uploadAttachment(body);
            const att = up?.data || up || {};
            await jobFlowApi.uploadJobFile(newId, {
              fileName: entry.file.name,
              fileCategory: "REFERENCE",
              fileSize: entry.file.size,
              mimeType: entry.file.type,
              attachmentId: att._id || att.id || null,
              fileUrl: att.fileUrl || att.url || "",
            });
          } catch (_) {
            failedUploads.push(entry.name);
          }
        }
        if (failedUploads.length > 0) {
          toast.warn(`Job ${isEditMode ? "updated" : "created"}, but these files could not be uploaded: ${failedUploads.join(", ")}`);
        }
      }
      if (newId) {
        try {
          localStorage.setItem("printz_active_job_id", newId);
        } catch (_) {}
      }
      if (isEditMode) {
        // The backend submits the edited order for estimate approval again, so nothing else to create here
        navigate(`/jobflow/estimates?jobId=${newId}`);
      } else if (isDraft) {
        navigate(`/jobflow/jobs${newId ? `?id=${newId}` : ""}`);
      } else {
        if (newId) {
          try {
            const qty = Number(formData.quantity) || 1;
            const baseRate = currentUnitPrice;
            const estimateItems = [
              {
                lineNo: 1,
                itemName: formData.jobTitle || `${formData.productType || "Print Job"} - ${qty} pcs`,
                description: `${formData.paperType || "Standard"} ${formData.paperGsm || ""} (${formData.size || "Standard"})`,
                unitRate: baseRate,
                unitPrice: baseRate,
                quantity: qty,
                amount: productCost,
                totalPrice: productCost,
                unit: "PCS",
                taxRate: 0,
              },
              ...(formData.finishingServices || []).map((svc, idx) => ({
                lineNo: idx + 2,
                itemName: `Finishing: ${svc.name}`,
                description: `${svc.config || "Standard"} (${svc.quantity || qty} ${svc.unit || "sheets"})`,
                unitRate: Number(svc.unitPrice) || 0,
                unitPrice: Number(svc.unitPrice) || 0,
                quantity: Number(svc.quantity) || qty,
                unit: (svc.unit || "PCS").toUpperCase(),
                amount: finishingRowTotal(svc),
                totalPrice: finishingRowTotal(svc),
                taxRate: 0,
              })),
            ];
            await jobFlowApi.submitEstimate(newId, {
              items: estimateItems,
              finishingServices: formData.finishingServices || [],
              subtotal: grandTotal,
              grandTotal: grandTotal,
              total: grandTotal,
              discountAmount: 0,
              taxRate: 0,
              taxAmount: 0,
            });
          } catch (e) {
            console.warn("Auto submit estimate:", e);
          }
        }
        if (onSuccess) {
          toast.success(isDesigner ? "Designer Job Order created successfully!" : "Job order created successfully!");
          onSuccess(res?.data || res);
          return;
        }
        if (isDesigner) {
          toast.success("Designer Job Order created successfully!");
          navigate(`/jobflow/designer-jobs?id=${newId || ""}`);
        } else {
          navigate(`/jobflow/estimates?jobId=${newId || ""}&new=true`);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || (isEditMode ? "Failed to update job order" : "Failed to create job order"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = () => {
    if (onClose) {
      onClose();
    } else if (isEditMode) {
      navigate(-1);
    } else {
      navigate(isDesigner ? "/jobflow/designer-jobs" : "/jobflow/jobs");
    }
  };

  const formBody = (
    <>
      <div className="jf-create-job-grid">
        {/* ========================================================================= */}
        {/* CARD 1: Basic Details (Row 1, Column 1)                                   */}
        {/* ========================================================================= */}
        <div className="jf-card">
          <div className="jf-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 className="jf-card-title">Basic Details</h3>
            {!isEditMode && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setIsCustomerModalOpen(true);
              }}
              style={{
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#059669",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 600,
                padding: "4px 10px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.15s ease",
              }}
            >
              <Plus size={14} /> Create Customer
            </button>
            )}
          </div>

          <div className="jf-card-body-stretch">
            <div className="jf-form-grid-2col">
              {/* Row 1: Customer (Spans 2 columns) */}
              <div className="jf-form-group" style={{ gridColumn: "1 / -1", position: "relative" }} ref={customerDropdownRef}>
                <label
                  className="jf-label"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span className="jf-label-required">Customer</span>
                  {formData.customerId && (
                    <span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 600 }}>
                      ✓ Selected: {formData.customerCode}
                    </span>
                  )}
                </label>
                <div style={{ position: "relative" }}>
                  <Search
                    size={16}
                    style={{
                      position: "absolute",
                      left: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#475569",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    type="text"
                    className="jf-input"
                    style={{ paddingLeft: "2.25rem", paddingRight: isEditMode ? "0.75rem" : "4rem" }}
                    placeholder="Search customer by name, code or phone..."
                    value={customerSearchTerm}
                    // The customer of an existing job order cannot be changed
                    readOnly={isEditMode}
                    disabled={isEditMode}
                    title={isEditMode ? "Customer cannot be changed when editing a job order" : undefined}
                    onFocus={() => !isEditMode && setIsCustomerDropdownOpen(true)}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value);
                      setIsCustomerDropdownOpen(true);
                    }}
                  />
                  {!isEditMode && (
                  <div
                    style={{
                      position: "absolute",
                      right: "0.5rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    {customerSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerSearchTerm("");
                          setFormData((prev) => ({
                            ...prev,
                            customerId: "",
                            customerName: "",
                            customerCode: "",
                            customerPhone: "",
                            customerEmail: "",
                          }));
                          setIsCustomerDropdownOpen(true);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#475569",
                          cursor: "pointer",
                          padding: "2px",
                          display: "flex",
                        }}
                        title="Clear customer search"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#475569",
                        cursor: "pointer",
                        padding: "2px",
                        display: "flex",
                      }}
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {isCustomerDropdownOpen && !isEditMode && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: "4px",
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "0.5rem",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                      zIndex: 100,
                      maxHeight: "260px",
                      overflowY: "auto",
                    }}
                  >
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((c) => {
                        const isSelected = (c._id || c.id) === formData.customerId;
                        return (
                          <div
                            key={c._id || c.id}
                            onClick={() => selectCustomer(c)}
                            style={{
                              padding: "0.625rem 0.875rem",
                              cursor: "pointer",
                              borderBottom: "1px solid #f1f5f9",
                              background: isSelected ? "#ecfdf5" : "transparent",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              transition: "background 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.background = "#f8fafc";
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    background: "#e2e8f0",
                                    color: "#1e293b",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  {c.customerCode || c.code || "CUST"}
                                </span>
                                <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.875rem" }}>
                                  {c.name || c.companyName}
                                </span>
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "2px" }}>
                                📞 {c.phone || c.mobile || "N/A"} • ✉️ {c.email || "N/A"}
                              </div>
                            </div>
                            {isSelected && <Check size={16} color="#059669" />}
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: "1rem", textAlign: "center", color: "#475569", fontSize: "0.875rem" }}>
                        No customers found matching "{customerSearchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Row 2: Branch & Job Type */}
              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Branch</label>
                {isBranchLocked ? (
                  <input
                    type="text"
                    className="jf-input"
                    value={(() => {
                      const b = branches.find((x) => (x._id || x.id) === formData.branchId);
                      const code = b?.code || b?.branchCode;
                      return `${formData.branchName || managerBranch}${code ? ` (${code})` : ""}`;
                    })()}
                    readOnly
                    disabled
                    title="Job orders are created for your assigned branch"
                  />
                ) : (
                  <select
                    className="jf-select"
                    value={formData.branchName}
                    onChange={(e) => {
                      const bName = e.target.value;
                      const matched = branches.find((b) => (b.branchName || b.name) === bName);
                      setFormData((prev) => ({
                        ...prev,
                        branchName: bName,
                        branchId: matched?._id || matched?.id || prev.branchId,
                      }));
                    }}
                  >
                    {branches.length === 0 && (
                      <option value={managerBranch}>{managerBranch} (Your Branch)</option>
                    )}
                    {branches.map((b) => (
                      <option key={b._id || b.id} value={b.branchName || b.name}>
                        {b.branchName || b.name} ({b.code || b.branchCode || "BR"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="jf-form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="jf-label jf-label-required">Job Type</label>
                  {formData.jobType && <JobTypeBadge jobType={formData.jobType} size="sm" />}
                </div>
                <select
                  className="jf-select"
                  value={formData.jobType}
                  onChange={(e) => handleInputChange("jobType", e.target.value)}
                >
                  <option value="">Select Job Type</option>
                  <option value="Print & Design">Print & Design</option>
                  <option value="Print Only">Print Only (Artwork Provided)</option>
                  <option value="Design Only">Design Only</option>
                </select>
              </div>

              {/* Row 3: Job Title (Spans 2 columns) */}
              <div className="jf-form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="jf-label jf-label-required">Job Title</label>
                <input
                  type="text"
                  className="jf-input"
                  placeholder="e.g. Business Cards - New Design"
                  value={formData.jobTitle}
                  onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                  required
                />
              </div>

              {/* Row 4: Target Due Date & Delivery Method */}
              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Target Due Date</label>
                <input
                  type="date"
                  className="jf-input"
                  value={formData.targetDueDate}
                  onChange={(e) => handleInputChange("targetDueDate", e.target.value)}
                  required
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Priority</label>
                <select
                  className="jf-select"
                  value={formData.priority}
                  onChange={(e) => handleInputChange("priority", e.target.value)}
                >
                  <option value="NORMAL">Normal</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Delivery Method</label>
                <select
                  className="jf-select"
                  value={formData.deliveryMethod}
                  onChange={(e) => handleInputChange("deliveryMethod", e.target.value)}
                >
                  <option value="">Select Delivery Method</option>
                  {DELIVERY_METHODS.map((dm) => (
                    <option key={dm.name} value={dm.name}>
                      {dm.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 5: Quality check toggle (Print Only only) */}
              {formData.jobType === "Print Only" && (
                <div className="jf-form-group" style={{ gridColumn: "1 / -1" }}>
                 
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    <label
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.qcRequired !== false}
                        onChange={(e) => handleInputChange("qcRequired", e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: "#059669" }}
                      />
                      QC required for this job
                    </label>
                   
                  </div>
                </div>
              )}

              {/* Row 6: Remarks */}
              <div className="jf-form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="jf-label">Remarks (Optional)</label>
                <input
                  type="text"
                  className="jf-input"
                  placeholder="Any general order remarks..."
                  value={formData.remarks}
                  onChange={(e) => handleInputChange("remarks", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 2: Print Specifications (Row 1, Column 2)                             */}
        {/* ========================================================================= */}
        <div className="jf-card">
          <div className="jf-card-header">
            <h3 className="jf-card-title">Print Specifications</h3>
          </div>

          <div className="jf-card-body-stretch">
            <div className="jf-form-grid-2col">
              {/* Row 1: Product Type & Quantity */}
              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Product Type</label>
                <select
                  className="jf-select"
                  value={formData.productType}
                  onChange={(e) => handleInputChange("productType", e.target.value)}
                >
                  <option value="">Select Product Type</option>
                  {(masterDefaults.productTypes.length > 0
                    ? masterDefaults.productTypes
                    : [{ name: "Business Cards" }, { name: "Flyers / Leaflets" }, { name: "Brochures" }]
                  ).map((it) => (
                    <option key={it.name} value={it.name}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Quantity</label>
                <input
                  type="number"
                  className="jf-input"
                  placeholder="Enter quantity"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", e.target.value === "" ? "" : Number(e.target.value))}
                  min="1"
                />
              </div>

              {/* Row 2: Paper Type & Paper GSM */}
              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Paper Type</label>
                <select
                  className="jf-select"
                  value={formData.paperType}
                  onChange={(e) => handleInputChange("paperType", e.target.value)}
                >
                  <option value="">Select Paper Type</option>
                  {(masterDefaults.paperTypes.length > 0
                    ? masterDefaults.paperTypes
                    : [{ name: "Art Card" }, { name: "Art Paper" }, { name: "Simili Paper" }]
                  ).map((it) => (
                    <option key={it.name} value={it.name}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Paper GSM</label>
                <select
                  className="jf-select"
                  value={formData.paperGsm}
                  onChange={(e) => handleInputChange("paperGsm", e.target.value)}
                >
                  <option value="">Select Paper GSM</option>
                  {(masterDefaults.paperGsmList.length > 0
                    ? masterDefaults.paperGsmList
                    : [{ name: "260 gsm" }, { name: "310 gsm" }, { name: "157 gsm" }]
                  ).map((it) => (
                    <option key={it.name} value={it.name}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 3: Size & Color */}
              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Size</label>
                <select
                  className="jf-select"
                  value={formData.size}
                  onChange={(e) => handleInputChange("size", e.target.value)}
                >
                  <option value="">Select Size</option>
                  {(masterDefaults.sizes.length > 0
                    ? masterDefaults.sizes
                    : [{ name: "90 x 54 mm (Standard)" }, { name: "A4 (210 x 297 mm)" }]
                  ).map((it) => (
                    <option key={it.name} value={it.name}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Color</label>
                <select
                  className="jf-select"
                  value={formData.color}
                  onChange={(e) => handleInputChange("color", e.target.value)}
                >
                  <option value="">Select Color</option>
                  {(masterDefaults.colors.length > 0
                    ? masterDefaults.colors
                    : [{ name: "Full Color (CMYK)" }, { name: "Black & White (K-Only)" }]
                  ).map((it) => (
                    <option key={it.name} value={it.name}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 4: Printing Side & Unit Price */}
              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Printing Side</label>
                <select
                  className="jf-select"
                  value={formData.printingSide}
                  onChange={(e) => handleInputChange("printingSide", e.target.value)}
                >
                  <option value="">Select Printing Side</option>
                  {(masterDefaults.printingSides.length > 0
                    ? masterDefaults.printingSides
                    : [{ name: "Double Sided" }, { name: "Single Sided" }]
                  ).map((it) => (
                    <option key={it.name} value={it.name}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Unit Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="jf-input"
                  placeholder="e.g. 15.00"
                  value={formData.unitPrice !== "" ? formData.unitPrice : (currentUnitPrice > 0 ? currentUnitPrice : "")}
                  onChange={(e) => handleInputChange("unitPrice", e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              {/* Row 5: Base Product Cost (Full Width) */}
              <div className="jf-form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="jf-label">Base Product Cost</label>
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "6px",
                    padding: "0.5rem 0.75rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    minHeight: "38px",
                  }}
                >
                  <span style={{ fontSize: "0.8125rem", color: "#166534" }}>
                    {currentQuantity} pcs × ₹{currentUnitPrice.toFixed(2)}
                  </span>
                  <strong style={{ fontSize: "1rem", color: "#15803d" }}>₹{productCost.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 2: Finishing Services (Wider ~65%) & Upload Artwork (Narrower ~35%)   */}
        {/* ========================================================================= */}
        <div className="jf-finishing-upload-row">
          {/* CARD 3: Finishing Services (Wider) */}
          <div className="jf-card">
            <div className="jf-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="jf-card-title">Finishing Services</h3>
              <button
                type="button"
                className="jf-btn jf-btn-primary jf-btn-sm"
                style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                onClick={handleAddFinishingRow}
              >
                <Plus size={14} /> Add Service
              </button>
            </div>

            <div className="jf-card-body-stretch">
              {/* Finishing Services Table */}
              <div className="jf-finishing-table-wrap" style={{ marginBottom: "1rem" }}>
                <table className="jf-table">
                  <thead>
                    <tr>
                      <th style={{ width: "28px", padding: "0.5rem 0.5rem", textAlign: "center" }}>#</th>
                      <th style={{ padding: "0.5rem 0.5rem", minWidth: "140px" }}>Finishing Service</th>
                      <th style={{ padding: "0.5rem 0.5rem", minWidth: "140px" }}>Config</th>
                      <th style={{ padding: "0.5rem 0.5rem", width: "95px" }}>Price</th>
                      <th style={{ padding: "0.5rem 0.5rem", width: "80px" }}>Qty</th>
                      <th style={{ padding: "0.5rem 0.5rem", width: "105px" }}>Total</th>
                      <th style={{ padding: "0.5rem 0.5rem", width: "45px", textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.finishingServices.map((svc, idx) => (
                      <tr key={svc.id}>
                        <td style={{ padding: "0.35rem 0.5rem", textAlign: "center" }}>{idx + 1}</td>
                        <td style={{ padding: "0.35rem 0.5rem" }}>
                          {svc.isDefault ? (
                            <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.8125rem" }}>
                              {svc.id === "default-print" ? "Printing" : "Packing"}
                              <span style={{ marginLeft: "6px", fontSize: "0.6875rem", fontWeight: 600, color: "#15803d", background: "#dcfce7", padding: "1px 6px", borderRadius: "9999px" }}>Default</span>
                            </span>
                          ) : (
                          <select
                            className="jf-select"
                            style={{ padding: "0.2rem 0.4rem", fontSize: "0.78125rem", height: "30px", width: "100%", fontWeight: 600 }}
                            value={svc.name}
                            onChange={(e) => handleFinishingServiceChange(svc.id, e.target.value)}
                          >
                            {availableFinishingServices.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                          )}
                        </td>
                        <td style={{ padding: "0.35rem 0.5rem" }}>
                          {svc.id === "default-print" ? (
                            <span style={{ fontSize: "0.78125rem", color: svc.config ? "#0f172a" : "#94a3b8" }}>
                              {svc.config || "Choose Color in Print Specifications"}
                            </span>
                          ) : (
                          <select
                            className="jf-select"
                            style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem", height: "30px", width: "100%" }}
                            value={svc.config}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                finishingServices: prev.finishingServices.map((s) => s.id === svc.id ? { ...s, config: val } : s),
                              }));
                            }}
                          >
                            {String(svc.name || "").toLowerCase().includes("lamination") ? (
                              <>
                                <option value="Matte">Matte</option>
                                <option value="Gloss">Gloss</option>
                                <option value="Velvet Soft Touch">Velvet Soft Touch</option>
                                <option value="Holographic Rainbow">Holographic Rainbow</option>
                                <option value="Thermal Matte">Thermal Matte</option>
                                <option value="Thermal Gloss">Thermal Gloss</option>
                              </>
                            ) : String(svc.name || "").toLowerCase().includes("foil") ? (
                              <>
                                <option value="Gold Foil Stamping">Gold Foil Stamping</option>
                                <option value="Silver Foil Stamping">Silver Foil Stamping</option>
                                <option value="Rose Gold Foil">Rose Gold Foil</option>
                                <option value="Holographic Foil">Holographic Foil</option>
                              </>
                            ) : String(svc.name || "").toLowerCase().includes("uv") ? (
                              <>
                                <option value="Spot UV (Front)">Spot UV (Front)</option>
                                <option value="Spot UV (Both Sides)">Spot UV (Both Sides)</option>
                                <option value="Raised Spot UV">Raised Spot UV</option>
                              </>
                            ) : String(svc.name || "").toLowerCase().includes("cut") || String(svc.name || "").toLowerCase().includes("trim") ? (
                              <>
                                <option value="Trim to 90 x 54 mm">Trim to 90 x 54 mm</option>
                                <option value="Die-Cut Round Corners">Die-Cut Round Corners</option>
                                <option value="Custom Die-Cut">Custom Die-Cut</option>
                                <option value="Straight Cut">Straight Cut</option>
                              </>
                            ) : String(svc.name || "").toLowerCase().includes("bind") ? (
                              <>
                                <option value="Spiral (Black)">Spiral (Black)</option>
                                <option value="Wire-O Binding">Wire-O Binding</option>
                                <option value="Saddle Stitching">Saddle Stitching</option>
                                <option value="Perfect Binding">Perfect Binding</option>
                              </>
                            ) : String(svc.name || "").toLowerCase().includes("fold") || String(svc.name || "").toLowerCase().includes("creas") ? (
                              <>
                                <option value="Half Fold">Half Fold</option>
                                <option value="Tri-Fold (Letter)">Tri-Fold (Letter)</option>
                                <option value="Z-Fold">Z-Fold</option>
                                <option value="Creasing Line">Creasing Line</option>
                              </>
                            ) : String(svc.name || "").toLowerCase().includes("pack") ? (
                              <>
                                <option value="Shrink Wrap">Shrink Wrap</option>
                                <option value="Carton Packaging">Carton Packaging</option>
                                <option value="Bundle Packing">Bundle Packing</option>
                              </>
                            ) : (
                              <>
                                <option value="Standard">Standard</option>
                                <option value="Custom Specification">Custom Specification</option>
                              </>
                            )}
                          </select>
                          )}
                        </td>
                        <td style={{ padding: "0.35rem 0.5rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>₹</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="jf-input"
                              style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem", height: "30px", width: "100%" }}
                              value={svc.unitPrice}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const p = e.target.value === "" ? "" : Number(e.target.value);
                                setFormData((prev) => ({
                                  ...prev,
                                  finishingServices: prev.finishingServices.map((s) =>
                                    s.id === svc.id ? { ...s, unitPrice: p, total: Math.round(Number(s.quantity || 0) * Number(p || 0) * 100) / 100 } : s
                                  ),
                                }));
                              }}
                              onBlur={() => {
                                if (svc.unitPrice === "" || svc.unitPrice === null || Number.isNaN(Number(svc.unitPrice))) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    finishingServices: prev.finishingServices.map((s) => (s.id === svc.id ? { ...s, unitPrice: 0, total: 0 } : s)),
                                  }));
                                }
                              }}
                            />
                          </div>
                        </td>
                        <td style={{ padding: "0.35rem 0.5rem" }}>
                          <input
                            type="number"
                            min="1"
                            className="jf-input"
                            style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem", height: "30px", width: "100%" }}
                            value={svc.quantity}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const q = e.target.value === "" ? "" : Number(e.target.value);
                              setFormData((prev) => ({
                                ...prev,
                                finishingServices: prev.finishingServices.map((s) =>
                                  s.id === svc.id ? { ...s, quantity: q, qtyManual: true, total: Math.round(Number(q || 0) * Number(s.unitPrice || 0) * 100) / 100 } : s
                                ),
                              }));
                            }}
                            onBlur={() => {
                              if (svc.quantity === "" || svc.quantity === null || !(Number(svc.quantity) >= 1)) {
                                setFormData((prev) => ({
                                  ...prev,
                                  finishingServices: prev.finishingServices.map((s) =>
                                    s.id === svc.id ? { ...s, quantity: 1, qtyManual: true, total: Math.round(Number(s.unitPrice || 0) * 100) / 100 } : s
                                  ),
                                }));
                              }
                            }}
                          />
                        </td>
                        <td style={{ padding: "0.35rem 0.5rem", whiteSpace: "nowrap" }}>
                          <strong>₹{finishingRowTotal(svc).toFixed(2)}</strong>
                        </td>
                        <td style={{ padding: "0.35rem 0.5rem", textAlign: "center" }}>
                          {svc.isDefault ? (
                            <span style={{ color: "#94a3b8", fontSize: "0.75rem" }} title="Printing and Packing are default services">—</span>
                          ) : (
                          <button
                            type="button"
                            className="jf-btn jf-btn-danger-outline jf-btn-sm"
                            style={{ padding: "3px 7px" }}
                            onClick={() => removeFinishingService(svc.id)}
                            title="Remove finishing service"
                          >
                            <Trash2 size={13} />
                          </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {otherFinishingServices.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", color: "#64748b", padding: "1rem" }}>
                         
                          <button
                            type="button"
                            className="jf-btn jf-btn-secondary jf-btn-sm"
                            onClick={handleAddFinishingRow}
                            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                          >
                            <Plus size={14} /> Add Finishing Service
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Bar pinned to bottom */}
              <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fdf4", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 600, color: "#166534", fontSize: "0.875rem" }}>Total Estimated Cost:</span>
                  <span style={{ fontSize: "0.75rem", color: "#15803d" }}>
                    Product: ₹{productCost.toFixed(2)} + Printing: ₹{printingCost.toFixed(2)} + Packing: ₹{packingCost.toFixed(2)}{otherFinishingTotal > 0 ? ` + Finishing: ₹${otherFinishingTotal.toFixed(2)}` : ""}
                  </span>
                </div>
                <span style={{ fontSize: "1.125rem", fontWeight: 700, color: "#15803d" }}>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* CARD 5: Preview Sample (Row 3, Column 1)                                   */}
        {/* ========================================================================= */}
        <div className="jf-card">
          <div className="jf-card-header" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setSideTab("upload")}
                style={{
                  padding: "0.4rem 0.9rem",
                  borderRadius: "8px",
                  border: sideTab === "upload" ? "1px solid var(--jf-primary, #059669)" : "1px solid #e2e8f0",
                  background: sideTab === "upload" ? "var(--jf-primary, #059669)" : "#ffffff",
                  color: sideTab === "upload" ? "#ffffff" : "#334155",
                  fontWeight: 600,
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                }}
              >
                Upload &amp; References
              </button>
              <button
                type="button"
                onClick={() => setSideTab("preview")}
                style={{
                  padding: "0.4rem 0.9rem",
                  borderRadius: "8px",
                  border: sideTab === "preview" ? "1px solid var(--jf-primary, #059669)" : "1px solid #e2e8f0",
                  background: sideTab === "preview" ? "var(--jf-primary, #059669)" : "#ffffff",
                  color: sideTab === "preview" ? "#ffffff" : "#334155",
                  fontWeight: 600,
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                }}
              >
                Preview Sample
              </button>
          </div>

          {sideTab === "upload" ? (
          <div className="jf-card-body-stretch">
              {/* Dropzone */}
              <label className="jf-dropzone" style={{ display: "block", marginBottom: "1rem", padding: "1rem" }}>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.ai,.psd,.cdr"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
                <Upload size={26} style={{ color: "var(--jf-primary)", margin: "0 auto 0.4rem" }} />
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.8125rem" }}>
                  Click to <span style={{ color: "var(--jf-primary)", textDecoration: "underline" }}>browse</span> and attach files
                </div>
                <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: "2px" }}>
                  PDF, JPG, PNG, AI, PSD, CDR (Max {MAX_UPLOAD_MB}MB each)
                </div>
              </label>

              {/* Uploaded Files List */}
              {formData.uploadedFiles.length > 0 && (
                <div style={{ marginBottom: "1rem" }}>
                  <h4 style={{ fontSize: "0.8125rem", margin: "0 0 0.5rem 0", color: "#0f172a", fontWeight: 600 }}>
                    Uploaded Files ({formData.uploadedFiles.length})
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "140px", overflowY: "auto" }}>
                    {formData.uploadedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.5rem 0.75rem",
                          border: "1px solid var(--jf-border)",
                          borderRadius: "6px",
                          background: "#f8fafc",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <FileText size={16} style={{ color: "#ef4444" }} />
                          <div>
                            <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{file.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "#475569" }}>{file.size} • {file.type}</div>
                          </div>
                        </div>
                        <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" style={{ padding: "2px 6px" }} onClick={() => removeFile(idx)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Instructions pinned to bottom */}
              <div className="jf-form-group" style={{ marginTop: "auto" }}>
                <label className="jf-label">Special Instructions (Optional)</label>
                <textarea
                  className="jf-textarea"
                  rows={3}
                  value={formData.specialInstructions}
                  onChange={(e) => handleInputChange("specialInstructions", e.target.value)}
                  placeholder="Mention specific Pantone codes, packaging requirements or sample signoff instructions..."
                  style={{ minHeight: "68px" }}
                />
              </div>
            </div>
          ) : (
          <div className="jf-card-body-stretch">
            <div
              style={{
                background: "linear-gradient(135deg, #064e3b 0%, #10b981 100%)",
                borderRadius: "8px",
                height: "155px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                textAlign: "center",
                padding: "1rem",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            >
              <div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.5px" }}>PrintZ</div>
                <div style={{ fontSize: "0.8125rem", color: "#a7f3d0", marginTop: "4px" }}>Your Print Partner</div>
                <div style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: "4px", marginTop: "10px", display: "inline-block" }}>
                  {(formData.productType || "New Print Order") + (formData.size ? ` • ${formData.size}` : "")}
                </div>
              </div>
            </div>

            <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
              <div style={{ background: "#f8fafc", padding: "0.875rem", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.8125rem", color: "#475569", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                <div><strong>Specs:</strong> {[formData.paperGsm, formData.paperType].filter(Boolean).join(" ") || "-"}</div>
                <div><strong>Color:</strong> {formData.color ? `${formData.color}${formData.printingSide ? ` (${formData.printingSide})` : ""}` : "-"}</div>
                <div><strong>Finishing:</strong> {otherFinishingServices.length > 0 ? otherFinishingServices.map((s) => s.name).join(", ") : "None"}</div>
                <div><strong>Quantity:</strong> {formData.quantity ? `${formData.quantity} pcs` : "-"}</div>
                <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #e2e8f0", paddingTop: "0.4rem", display: "flex", justifyContent: "space-between" }}>
                  <strong>Product Cost:</strong>
                  <strong style={{ color: "#15803d" }}>₹{productCost.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* CARD 6: Order Summary & Submission (Row 3, Column 2)                       */}
        {/* ========================================================================= */}
        <div className="jf-card" style={{ border: "1px solid #cbd5e1" }}>
          <div className="jf-card-header">
            <h3 className="jf-card-title">Order Summary & Submission</h3>
          </div>

          <div className="jf-card-body-stretch">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem", fontSize: "0.8125rem", background: "#f8fafc", padding: "0.875rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <div><span style={{ color: "#475569" }}>Customer:</span> <strong>{formData.customerName || "Not selected"}</strong></div>
              <div><span style={{ color: "#475569" }}>Branch:</span> {formData.branchName || "Main Branch"}</div>
              <div><span style={{ color: "#475569" }}>Job Title:</span> <strong>{formData.jobTitle || "Not specified"}</strong></div>
              <div><span style={{ color: "#475569" }}>Job Type:</span> {formData.jobType || "-"}</div>
              <div><span style={{ color: "#475569" }}>Specs:</span> {formData.quantity ? `${formData.quantity} pcs (${formData.productType || "Print"})` : "-"}</div>
              <div><span style={{ color: "#475569" }}>Due Date:</span> {formData.targetDueDate || "-"}</div>
              <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #e2e8f0", paddingTop: "0.5rem", marginTop: "0.25rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
                  <span style={{ color: "#475569" }}>Product Cost ({currentQuantity} pcs @ ₹{currentUnitPrice.toFixed(2)}):</span>
                  <strong style={{ color: "#0f172a" }}>₹{productCost.toFixed(2)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
                  <span style={{ color: "#475569" }}>Printing Cost:</span>
                  <span style={{ color: "#0f172a", fontWeight: 600 }}>₹{printingCost.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
                  <span style={{ color: "#475569" }}>Packing Cost:</span>
                  <span style={{ color: "#0f172a", fontWeight: 600 }}>₹{packingCost.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
                  <span style={{ color: "#475569" }}>Finishing Services Total:</span>
                  <span style={{ color: "#475569" }}>₹{otherFinishingTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #cbd5e1", paddingTop: "0.4rem", marginTop: "0.15rem" }}>
                  <strong style={{ color: "#0f172a", fontSize: "0.875rem" }}>Estimated Order Total:</strong>
                  <strong style={{ color: "#15803d", fontSize: "1.125rem" }}>₹{grandTotal.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "auto", paddingTop: "1rem", display: "flex", gap: "0.75rem", justifyContent: "flex-end", alignItems: "center" }}>
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={handleCancelClick}
              >
                Cancel
              </button>
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                onClick={() => handleSubmitJob(false)}
                disabled={loading || editLoading}
              >
                <CheckCircle size={16} /> {loading ? (isEditMode ? "Saving..." : "Creating...") : isEditMode ? "Save Changes" : isDesigner ? "Create Designer Job" : "Create Job Order"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Registration Modal for Quick Customer Add */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSaved={(newCust) => {
          if (newCust) {
            setCustomers((prev) => [newCust, ...prev]);
            selectCustomer(newCust);
          }
        }}
      />
    </>
  );

  if (isModal) {
    return (
      <div className="jf-create-job-modal-wrapper" style={{ padding: 0 }}>
        {formBody}
      </div>
    );
  }

  return (
    <JobFlowLayout
      title={isEditMode ? `Edit Job Order${editJobNo ? ` - ${editJobNo}` : ""}` : isDesigner ? "Create Designer Job Order" : "Create Job Order"}
      actions={
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm"
            onClick={handleCancelClick}
          >
            Cancel
          </button>
          <button
            type="button"
            className="jf-btn jf-btn-primary jf-btn-sm"
            onClick={() => handleSubmitJob(false)}
            disabled={loading || editLoading}
          >
            <CheckCircle size={14} /> {loading ? (isEditMode ? "Saving..." : "Creating...") : isEditMode ? "Save Changes" : isDesigner ? "Create Designer Job" : "Create Job Order"}
          </button>
        </div>
      }
    >
      {formBody}
    </JobFlowLayout>
  );
};

export default CreateJobOrderPage;
