/**
 * Public Customer QR Job Request DTO
 */

class PublicJobRequestDto {
  constructor(data = {}) {
    // ── Branch Identifier ──
    this.branchCode =
      typeof data.branchCode === "string"
        ? data.branchCode.trim().toUpperCase()
        : typeof data.branch === "string"
        ? data.branch.trim().toUpperCase()
        : "";

    // ── Customer Details ──
    this.customerName = (data.customerName || data.name || "").trim();
    this.customerPhone = (data.customerPhone || data.mobile || data.phone || "").trim();
    this.customerEmail = (data.customerEmail || data.email || "").trim().toLowerCase() || null;
    this.customerCompany = (data.customerCompany || data.company || "").trim() || "";
    this.customerAddress = (data.customerAddress || data.address || "").trim() || "";
    this.customerGstin = (data.customerGstin || data.gstin || "").trim().toUpperCase() || null;

    // ── Job Details ──
    this.title = (data.title || data.jobName || data.jobType || "Print Job Request").trim();
    this.jobType = (data.jobType || "PRINT_JOB").trim().toUpperCase();
    this.quantity = Math.max(1, Number(data.quantity) || 1);
    this.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    this.customerRequirements = (data.customerRequirements || data.requirements || data.description || "").trim();
    this.remarks = (data.remarks || data.additionalInstructions || data.notes || "").trim();

    // ── Item Specifications ──
    this.paperSize = (data.paperSize || data.dimensions || data.size || "").trim();
    this.paperType = (data.paperType || data.material || "").trim();
    this.printingType = (data.printingType || data.specification || "").trim();
    this.colorMode = (data.colorMode || "CMYK").trim().toUpperCase();
    this.sides = (data.sides || "SINGLE").trim().toUpperCase();

    // ── Finishing Options ──
    this.finishing = Array.isArray(data.finishing)
      ? data.finishing.map((f, i) => {
          if (typeof f === "string") return { code: f.trim().toUpperCase(), name: f.trim(), sequence: i + 1 };
          return {
            code: (f.code || f.process || "FINISHING").trim().toUpperCase(),
            name: f.name || f.option || "",
            notes: f.notes || "",
            sequence: f.sequence || i + 1,
          };
        })
      : [];

    // ── Reference Files / Attachments ──
    this.attachments = Array.isArray(data.attachments || data.referenceFiles)
      ? (data.attachments || data.referenceFiles).map((a) => ({
          fileName: a.fileName || a.name || "reference-file",
          fileUrl: a.fileUrl || a.url || "",
          fileCategory: a.fileCategory || "REFERENCE",
          attachmentId: a.attachmentId || null,
          fileSize: Number(a.fileSize || a.size) || 0,
          mimeType: a.mimeType || "",
        }))
      : [];

    // ── Idempotency Key ──
    this.idempotencyKey = data.idempotencyKey || null;
  }

  static fromRequest(req) {
    const raw = req.body || {};
    // Extract idempotency key from headers if present
    const headerIdempotency =
      req.headers["idempotency-key"] ||
      req.headers["x-idempotency-key"] ||
      req.query?.idempotencyKey ||
      null;

    const branchFromQuery = req.query?.branchCode || req.query?.branch;

    return new PublicJobRequestDto({
      ...raw,
      branchCode: raw.branchCode || branchFromQuery,
      idempotencyKey: raw.idempotencyKey || headerIdempotency,
    });
  }
}

module.exports = {
  PublicJobRequestDto,
};
