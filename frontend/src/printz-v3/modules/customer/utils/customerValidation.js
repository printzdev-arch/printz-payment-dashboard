/**
 * PrintZ V3 - Customer Validation Utilities
 * Validates customer inputs and normalizes form data.
 */

// Name validation: required, 2+ characters
export const validateName = (name) => {
  if (!name || !name.trim()) {
    return "Customer name is required";
  }
  if (name.trim().length < 2) {
    return "Customer name must be at least 2 characters";
  }
  if (name.trim().length > 100) {
    return "Customer name cannot exceed 100 characters";
  }
  return null;
};

// Mobile validation: required, 10-digit Indian mobile format
export const validateMobile = (mobile) => {
  if (!mobile || !mobile.trim()) {
    return "Mobile number is required";
  }
  const cleanMobile = mobile.trim().replace(/\D/g, "");
  if (cleanMobile.length !== 10) {
    return "Mobile number must be exactly 10 digits";
  }
  if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
    return "Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9";
  }
  return null;
};

// Email validation: optional, valid format if entered
export const validateEmail = (email) => {
  if (!email || !email.trim()) {
    return null; // Optional
  }
  const trimmed = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return "Please enter a valid email address (e.g., name@example.com)";
  }
  return null;
};

// GSTIN validation: optional, 15 alphanumeric Indian GST format
export const validateGst = (gst) => {
  if (!gst || !gst.trim()) {
    return null; // Optional
  }
  const trimmed = gst.trim().toUpperCase();
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstRegex.test(trimmed)) {
    return "Please enter a valid 15-character GSTIN (e.g. 29ABCDE1234F1Z5)";
  }
  return null;
};

// Pincode validation: optional, 6-digit Indian postal code
export const validatePincode = (pincode) => {
  if (!pincode || !pincode.trim()) {
    return null; // Optional
  }
  const trimmed = pincode.trim().replace(/\D/g, "");
  if (!/^[1-9][0-9]{5}$/.test(trimmed)) {
    return "Please enter a valid 6-digit pincode";
  }
  return null;
};

/**
 * Validates complete customer form data
 * @param {Object} formData
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export const validateCustomerForm = (formData = {}) => {
  const errors = {};

  const nameError = validateName(formData.name);
  if (nameError) errors.name = nameError;

  const mobileError = validateMobile(formData.mobile);
  if (mobileError) errors.mobile = mobileError;

  const emailError = validateEmail(formData.email);
  if (emailError) errors.email = emailError;

  const gstError = validateGst(formData.gstNumber);
  if (gstError) errors.gstNumber = gstError;

  const pincodeError = validatePincode(formData.pincode);
  if (pincodeError) errors.pincode = pincodeError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Normalizes customer payload for API submission
 */
export const normalizeCustomerData = (formData = {}) => {
  const typeMap = { INDIVIDUAL: "WALK_IN", BUSINESS: "B2B", WALK_IN: "WALK_IN", B2B: "B2B", REGULAR: "REGULAR" };
  const mappedType = typeMap[formData.customerType] || formData.customerType || "WALK_IN";
  return {
    customerCode: formData.customerCode,
    name: (formData.name || "").trim(),
    mobile: (formData.mobile || "").trim().replace(/\D/g, ""),
    phone: (formData.mobile || "").trim().replace(/\D/g, ""),
    email: (formData.email || "").trim().toLowerCase(),
    companyName: (formData.companyName || "").trim(),
    company: (formData.companyName || "").trim(),
    gstNumber: (formData.gstNumber || formData.gstin || "").trim().toUpperCase(),
    gstin: (formData.gstNumber || formData.gstin || "").trim().toUpperCase(),
    address: (formData.address || "").trim(),
    city: (formData.city || "").trim(),
    state: (formData.state || "").trim(),
    pincode: (formData.pincode || "").trim().replace(/\D/g, ""),
    customerType: mappedType,
    source: formData.source || "WALK_IN",
    branchId: formData.branchId,
    branchName: formData.branchName,
    whatsAppOptIn: formData.whatsAppOptIn !== false
  };
};
