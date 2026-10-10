/**
 * PrintZ V3 - Job Validation Utilities
 * Rigorous frontend & backend validation for Job Orders and Technical Specifications.
 */

/**
 * Validates a single Job Item
 * @param {Object} item
 * @param {number} index
 * @returns {{ isValid: boolean, errors: Object }}
 */
export function validateJobItem(item, index = 0) {
  const errors = {};

  if (!item.itemName || !item.itemName.trim()) {
    errors[`items[${index}].itemName`] = "Product / Service name is required";
  }

  const rawQty = item.quantity;
  const numQty = Number(rawQty);
  if (rawQty === "" || rawQty === null || rawQty === undefined || isNaN(numQty) || numQty <= 0) {
    errors[`items[${index}].quantity`] = "Quantity must be a positive number greater than 0";
  }

  if (!item.unit) {
    errors[`items[${index}].unit`] = "Unit is required (e.g. PCS, BOX, SHEET)";
  }

  // Size validation
  if (item.size) {
    if (item.size.type === "CUSTOM") {
      const w = Number(item.size.width);
      const h = Number(item.size.height);
      if (!item.size.width || isNaN(w) || w <= 0) {
        errors[`items[${index}].size.width`] = "Valid custom width > 0 is required";
      }
      if (!item.size.height || isNaN(h) || h <= 0) {
        errors[`items[${index}].size.height`] = "Valid custom height > 0 is required";
      }
      if (!item.size.unit) {
        errors[`items[${index}].size.unit`] = "Size unit is required (e.g. INCH, MM, FEET)";
      }
    }
  }

  // Material validation
  if (item.material) {
    if (!item.material.paperType || !item.material.paperType.trim()) {
      errors[`items[${index}].material.paperType`] = "Paper / Material type is required";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates full Job Creation payload
 * @param {Object} formData
 * @param {boolean} isDraft - If saving as draft, validation rules are relaxed
 * @returns {{ isValid: boolean, errors: Object }}
 */
export function validateJobForm(formData, isDraft = false) {
  const errors = {};

  // Customer selection is required (either customerId or customer name + mobile)
  if (!formData.customerId && !formData.customerMobile && !formData.customerPhone) {
    errors.customerId = "Customer selection is required. Please search or select an existing customer.";
  }

  if (isDraft) {
    // Draft only needs customer and at least a temporary title or 1 item
    if (!formData.jobTitle || !formData.jobTitle.trim()) {
      if (!formData.items || formData.items.length === 0) {
        errors.jobTitle = "Please provide either a Job Title or at least one Job Item to save a draft.";
      }
    }
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Strict Validation for REQUIREMENT_CAPTURED submission
  if (!formData.jobTitle || !formData.jobTitle.trim()) {
    errors.jobTitle = "Job Title is required (e.g. 'Visiting Card Printing', 'Brochure for Launch')";
  }

  if (!formData.priority) {
    errors.priority = "Priority level is required";
  }

  // Expected Delivery Date validation
  if (formData.expectedDeliveryDate) {
    const selectedDate = new Date(formData.expectedDeliveryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(selectedDate.getTime())) {
      errors.expectedDeliveryDate = "Please select a valid expected delivery date";
    } else if (selectedDate < today) {
      errors.expectedDeliveryDate = "Expected delivery date cannot be in the past (same-day or future date allowed)";
    }
  }

  // Job Items validation
  if (!formData.items || !Array.isArray(formData.items) || formData.items.length === 0) {
    errors.items = "At least one Job Item with technical specifications is required.";
  } else {
    formData.items.forEach((item, idx) => {
      const itemValidation = validateJobItem(item, idx);
      if (!itemValidation.isValid) {
        Object.assign(errors, itemValidation.errors);
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Normalizes job form data before API dispatch
 * @param {Object} formData
 * @param {boolean} isDraft
 * @returns {Object}
 */
export function normalizeJobData(formData, isDraft = false) {
  const items = (formData.items || []).map((item, idx) => ({
    jobItemId: item.jobItemId || item.id || `item_${idx + 1}`,
    itemName: (item.itemName || "Custom Item").trim(),
    productType: item.productType || item.itemName || "Custom Print",
    quantity: Number(item.quantity) || 1,
    unit: item.unit || "PCS",
    size: {
      type: item.size?.type || "PRESET",
      presetName: item.size?.presetName || "Custom",
      width: item.size?.width ? Number(item.size.width) : null,
      height: item.size?.height ? Number(item.size.height) : null,
      unit: item.size?.unit || "INCH"
    },
    printing: {
      side: item.printing?.side || "SINGLE_SIDE",
      colourMode: item.printing?.colourMode || "COLOUR"
    },
    material: {
      paperType: item.material?.paperType || "Art Card",
      gsm: item.material?.gsm ? Number(item.material.gsm) : 300,
      paperSize: item.material?.paperSize || "",
      notes: item.material?.notes || ""
    },
    finishing: Array.isArray(item.finishing) ? item.finishing : [],
    designRequired: Boolean(item.designRequired),
    designNotes: (item.designNotes || "").trim(),
    notes: (item.notes || "").trim(),
    status: isDraft ? "DRAFT" : "REQUIREMENT_CAPTURED"
  }));

  const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

  const isObjectId = typeof formData.customerId === "string" && /^[0-9a-fA-F]{24}$/.test(formData.customerId);
  const resolvedCustomerId = isObjectId ? formData.customerId : null;
  const phone = formData.customerMobile || formData.customerPhone || "";

  return {
    customerId: resolvedCustomerId,
    customerPhone: phone,
    customerMobile: phone,
    customerName: formData.customerName || "",
    customerCompany: formData.customerCompany || "",
    customerCode: formData.customerCode || "",
    customerSnapshot: {
      name: formData.customerName || "Walk-in Customer",
      mobile: phone,
      company: formData.customerCompany || "",
      customerCode: formData.customerCode || ""
    },
    branchId: formData.branchId || "489571a9af51836599708543",
    branchName: formData.branchName || "Banaswadii",
    jobTitle: (formData.jobTitle || "Untitled Job Order").trim(),
    priority: formData.priority || "NORMAL",
    source: formData.source || "WALK_IN",
    expectedDeliveryDate: formData.expectedDeliveryDate || null,
    notes: (formData.notes || "").trim(),
    status: isDraft ? "DRAFT" : "REQUIREMENT_CAPTURED",
    items,
    totalQuantity,
    itemCount: items.length
  };
}
