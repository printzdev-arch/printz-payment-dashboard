const mongoose = require("mongoose");
const Customer = require("../../../infrastructure/database/mongoose/models/customer/Customer");
const customerRepository = require("../../../infrastructure/database/mongoose/repositories/customer/MongooseCustomerRepository");
const numberSequenceService = require("../common/numberSequence.service");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const { emitCustomerEvent } = require("../../../shared/events/customer/customerEvents.emitter");

class CustomerMatchingService {
  /**
   * Normalize a phone number to standard digits.
   * Strips spaces, dashes, formatting, and country codes (+91, 91 prefix when 12 digits, leading 0).
   */
  static normalizePhone(phone) {
    if (!phone) return "";
    let cleaned = String(phone).replace(/[^\d+]/g, "").trim();

    if (cleaned.startsWith("+91")) {
      cleaned = cleaned.slice(3);
    } else if (cleaned.startsWith("+")) {
      cleaned = cleaned.slice(1);
    } else if (cleaned.startsWith("91") && cleaned.length === 12) {
      cleaned = cleaned.slice(2);
    } else if (cleaned.startsWith("0") && cleaned.length === 11) {
      cleaned = cleaned.slice(1);
    }

    return cleaned.trim();
  }

  /**
   * Normalize email address (lowercase, trim).
   */
  static normalizeEmail(email) {
    if (!email || typeof email !== "string") return null;
    const trimmed = email.trim().toLowerCase();
    return trimmed.includes("@") ? trimmed : null;
  }

  /**
   * Escape special regex characters.
   */
  static escapeRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Search for an existing customer using reliable identifiers:
   * 1. customerId (exact ObjectId)
   * 2. customerCode (exact code, case-insensitive)
   * 3. mobile (normalized digits or raw digits)
   * 4. email (normalized email)
   *
   * Note: Name alone is NEVER used as a match identifier to prevent
   * merging different customers with similar/identical names.
   */
  static async findExistingCustomer({ customerId, customerCode, mobile, phone, email } = {}) {
    // 1. Check direct ObjectId match
    if (customerId && mongoose.Types.ObjectId.isValid(String(customerId))) {
      const byId = await Customer.findById(customerId).lean();
      if (byId) return byId;
    }

    // 2. Check customerCode match
    if (customerCode && String(customerCode).trim()) {
      const code = String(customerCode).trim().toUpperCase();
      const byCode = await Customer.findOne({ customerCode: code }).lean();
      if (byCode) return byCode;
    }

    // 3. Check mobile match (normalized and raw)
    const rawMobile = String(mobile || phone || "").trim();
    if (rawMobile) {
      const normalizedMobile = this.normalizePhone(rawMobile);
      const mobileConditions = [{ mobile: rawMobile }, { phone: rawMobile }];
      if (normalizedMobile) {
        mobileConditions.push({ mobile: normalizedMobile });
        mobileConditions.push({ phone: normalizedMobile });
        // Also support matching with +91 if legacy stored with +91
        mobileConditions.push({ mobile: `+91${normalizedMobile}` });
      }

      const byMobile = await Customer.findOne({ $or: mobileConditions }).lean();
      if (byMobile) return byMobile;
    }

    // 4. Check email match
    const normalizedEmail = this.normalizeEmail(email);
    if (normalizedEmail) {
      const byEmail = await Customer.findOne({ email: normalizedEmail }).lean();
      if (byEmail) return byEmail;
    }

    return null;
  }

  /**
   * Match or safely create a centralized customer record.
   * Ensures customers are shared across all branches without duplication.
   */
  static async matchOrCreateCustomer(customerData = {}, context = {}) {
    const rawName = String(customerData.name || customerData.customerName || "").trim();
    const rawMobile = String(customerData.mobile || customerData.phone || customerData.customerPhone || "").trim();
    const rawEmail = customerData.email || customerData.customerEmail || null;
    const rawCompany = String(
      customerData.company || customerData.companyName || customerData.customerCompany || ""
    ).trim();
    const rawAddress = customerData.address || customerData.customerAddress || null;
    const rawGstin = customerData.gstin || customerData.customerGstin || null;
    const customerCode = customerData.customerCode ? String(customerData.customerCode).trim().toUpperCase() : null;
    const branchId = context.branchId || customerData.branchId || null;

    const normalizedMobile = this.normalizePhone(rawMobile) || rawMobile;
    const normalizedEmail = this.normalizeEmail(rawEmail);

    // 1. Search for existing customer using reliable identifiers
    let existing = await this.findExistingCustomer({
      customerId: customerData.customerId || customerData._id,
      customerCode,
      mobile: normalizedMobile,
      phone: rawMobile,
      email: normalizedEmail,
    });

    if (existing) {
      // Record branch visit if visited at a new branch
      if (branchId) {
        const branchStr = String(branchId);
        const visitedList = Array.isArray(existing.visitedBranches)
          ? existing.visitedBranches.map((b) => (b && b._id ? String(b._id) : String(b)))
          : [];

        if (!visitedList.includes(branchStr)) {
          await Customer.findByIdAndUpdate(
            existing._id,
            { $addToSet: { visitedBranches: branchId } },
            { new: true }
          ).catch(() => {});

          if (!existing.visitedBranches) existing.visitedBranches = [];
          existing.visitedBranches.push(branchId);
        }
      }

      // Safely fill in any missing contact/company details if previously empty
      const updates = {};
      if (!existing.email && normalizedEmail) updates.email = normalizedEmail;
      if ((!existing.company || !existing.companyName) && rawCompany) {
        updates.company = rawCompany;
        updates.companyName = rawCompany;
      }
      if (!existing.address && rawAddress) updates.address = rawAddress;
      if (!existing.gstin && rawGstin) updates.gstin = rawGstin;

      if (Object.keys(updates).length > 0) {
        const updated = await Customer.findByIdAndUpdate(
          existing._id,
          { $set: updates },
          { new: true }
        ).lean();
        if (updated) existing = updated;
      }

      return { customer: existing, isNew: false };
    }

    // 2. Validate mandatory fields for new customer creation
    if (!rawName) {
      throw ErrorHelper.badRequest("Customer name is required.");
    }
    if (!normalizedMobile) {
      throw ErrorHelper.badRequest("Customer mobile number is required.");
    }

    // 3. Generate unique customer code
    let finalCode = customerCode;
    if (!finalCode) {
      try {
        finalCode = await numberSequenceService.generateBusinessNumber("CUSTOMER", {
          prefix: "CUST",
          padLength: 5,
        });
      } catch (_) {
        finalCode = `CUST-${Date.now().toString().slice(-6)}`;
      }
    }

    const initialVisited = branchId ? [branchId] : [];

    const newCustomerPayload = {
      customerCode: finalCode,
      name: rawName,
      mobile: normalizedMobile,
      phone: normalizedMobile,
      email: normalizedEmail,
      company: rawCompany,
      companyName: rawCompany,
      address: rawAddress,
      gstin: rawGstin,
      customerType: customerData.customerType || "WALK_IN",
      branchId: branchId || null,
      primaryBranchId: branchId || null,
      visitedBranches: initialVisited,
      isActive: true,
    };

    // 4. Save new customer with concurrency guard
    try {
      const created = await Customer.create(newCustomerPayload);
      const createdObj = created.toObject ? created.toObject() : created;
      emitCustomerEvent("created", createdObj);
      return { customer: createdObj, isNew: true };
    } catch (err) {
      // Concurrency race: another request just created a customer with this mobile or code
      if (err.code === 11000) {
        const concurrentExisting = await this.findExistingCustomer({
          customerCode: finalCode,
          mobile: normalizedMobile,
          email: normalizedEmail,
        });
        if (concurrentExisting) {
          if (branchId) {
            await Customer.findByIdAndUpdate(
              concurrentExisting._id,
              { $addToSet: { visitedBranches: branchId } }
            ).catch(() => {});
          }
          return { customer: concurrentExisting, isNew: false };
        }
      }
      throw err;
    }
  }
}

module.exports = CustomerMatchingService;
