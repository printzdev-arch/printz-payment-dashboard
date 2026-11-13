const mongoose = require("mongoose");
const PrinterReading = require("../models/PrinterReading");
const Branch = require("../../branches/models/Branch");
const FinalizedDate = require("../../past-date-requests/models/FinalizedDate");
const SaleReceipt = require("../../pos/models/SaleReceipt");
const SaleReceiptItem = require("../../pos/models/SaleReceiptItem");
const ApiError = require("../../../utils/errors/ApiError");

/**
 * Scan check: compares the Color Scan / B&W Scan pages sold in POS with the
 * COLOUR SCAN / B/W SCAN meter copies on the account sheet.
 *
 * POS window for a sheet date:
 *   start = when the previous finalized sheet of the branch was finalized
 *           (capped to the start of the selected date), or the beginning if none
 *   end   = end of the selected date (or the finalize time of that sheet)
 * Days that were never finalized therefore keep adding up until a sheet is finalized.
 */

const IST_OFFSET = "+05:30"; // branch days are IST days
const dayStart = (date) => new Date(`${date}T00:00:00.000${IST_OFFSET}`);
const dayEnd = (date) => new Date(`${date}T23:59:59.999${IST_OFFSET}`);

const ROW_MATCHERS = {
  color: /^colou?r\s*scan$/i,
  bw: /^b\s*\/?\s*w\s*scan$/i,
};

const PRINT_LINE_ID = /^SVC-PRINT-(COLOR|BW)-(SINGLE|DOUBLE)-/;

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const finalizedAtOf = (doc) => {
  const raw = doc?.finalizedAt || doc?.updatedAt || doc?.createdAt;
  const d = raw ? new Date(raw) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

class ScanCheckService {
  async _resolveBranch(identifier) {
    const trimmed = String(identifier || "").trim();
    if (!trimmed) return null;
    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      const byId = await Branch.findById(trimmed).lean();
      if (byId) return byId;
    }
    const exact = new RegExp(`^${escapeRegex(trimmed)}$`, "i");
    return Branch.findOne({ $or: [{ name: exact }, { code: exact }] }).lean();
  }

  /** Pages sold in POS (completed sales only) between start (inclusive, may be null) and end. */
  async _posPages(branch, start, end) {
    const variants = [String(branch._id), branch._id];
    const saleDate = { $lte: end };
    if (start) saleDate.$gte = start;

    const receipts = await SaleReceipt.find({
      branchId: { $in: variants },
      status: "COMPLETED",
      saleDate,
    })
      .select("_id")
      .lean();

    const totals = { color: 0, bw: 0 };
    if (!receipts.length) return totals;

    const items = await SaleReceiptItem.find({
      receiptId: { $in: receipts.map((r) => r._id) },
      productId: { $regex: PRINT_LINE_ID },
    })
      .select("productId quantity")
      .lean();

    for (const item of items) {
      const match = PRINT_LINE_ID.exec(String(item.productId));
      if (!match) continue;
      const pages = Number(item.quantity || 0) * (match[2] === "DOUBLE" ? 2 : 1);
      if (match[1] === "COLOR") totals.color += pages;
      else totals.bw += pages;
    }
    return totals;
  }

  /** Meter copies (final - start) of the scan rows, added across every printer of the sheet. */
  async _meterCopies(branch, date) {
    const reading = await PrinterReading.findOne({
      date,
      $or: [
        { branchId: branch._id },
        { branchId: String(branch._id) },
        { branchName: new RegExp(`^${escapeRegex(branch.name)}$`, "i") },
      ],
    }).lean();

    const totals = { color: 0, bw: 0 };
    const readings = reading?.readings || {};
    for (const rows of Object.values(readings)) {
      if (!rows || typeof rows !== "object") continue;
      for (const [rowName, data] of Object.entries(rows)) {
        const key = Object.keys(ROW_MATCHERS).find((k) => ROW_MATCHERS[k].test(String(rowName).trim()));
        if (!key || !data) continue;
        const start = Number(data.STARTING);
        const final = Number(data["FINAL READING"]);
        let copies = Number(data.noOfCopies);
        if (data["FINAL READING"] !== "" && data.STARTING !== "" && !Number.isNaN(start) && !Number.isNaN(final)) {
          copies = Math.max(0, final - start);
        }
        totals[key] += Number.isFinite(copies) ? copies : 0;
      }
    }
    return totals;
  }

  _build(pos, meter, extra = {}) {
    const row = (p, m) => ({ pos: p, meter: m, difference: m - p });
    return {
      color: row(pos.color, meter.color),
      bw: row(pos.bw, meter.bw),
      ...extra,
    };
  }

  /**
   * Compute the check for a branch/date. `endAt` caps the POS window (used when finalizing).
   */
  async compute({ branchName, date, endAt = null, finalized = null }) {
    const branch = await this._resolveBranch(branchName);
    if (!branch) throw ApiError.notFound(`Branch '${branchName}' not found`);

    const previous = await FinalizedDate.findOne({
      branchName: { $regex: new RegExp(`^${escapeRegex(branch.name)}$`, "i") },
      date: { $lt: date },
      isFinalized: { $ne: false },
    })
      .sort({ date: -1 })
      .lean();

    const dayBegins = dayStart(date);
    const prevAt = finalizedAtOf(previous);
    const start = prevAt ? new Date(Math.min(prevAt.getTime(), dayBegins.getTime())) : null;

    let end = dayEnd(date);
    if (endAt && endAt < end) end = endAt;

    const [pos, meter] = await Promise.all([this._posPages(branch, start, end), this._meterCopies(branch, date)]);

    return this._build(pos, meter, {
      branchName: branch.name,
      date,
      finalized: Boolean(finalized),
      windowStart: start,
      windowEnd: end,
      calculatedAt: new Date(),
    });
  }

  /** Read side: saved snapshot when the sheet is finalized, live numbers otherwise. */
  async getScanCheck({ branchName, date }) {
    if (!branchName || !date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      throw ApiError.badRequest("branchName and date (YYYY-MM-DD) are required");
    }
    const branch = await this._resolveBranch(branchName);
    if (!branch) throw ApiError.notFound(`Branch '${branchName}' not found`);

    const finalizedDoc = await FinalizedDate.findOne({
      branchName: { $regex: new RegExp(`^${escapeRegex(branch.name)}$`, "i") },
      date,
      isFinalized: { $ne: false },
    }).lean();

    if (finalizedDoc?.scanCheck) {
      return { ...finalizedDoc.scanCheck, finalized: true, source: "snapshot" };
    }

    const result = await this.compute({
      branchName: branch.name,
      date,
      endAt: finalizedDoc ? finalizedAtOf(finalizedDoc) : null,
      finalized: Boolean(finalizedDoc),
    });
    return { ...result, source: "live" };
  }
}

module.exports = new ScanCheckService();
