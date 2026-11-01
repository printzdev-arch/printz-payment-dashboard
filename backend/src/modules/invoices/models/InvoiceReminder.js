const mongoose = require("mongoose");

const invoiceReminderSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
      index: true,
    },
    jobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Customer",
      default: null,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    reminderType: {
      type: String,
      enum: ["DUE", "OVERDUE", "PAYMENT_FOLLOW_UP"],
      default: "PAYMENT_FOLLOW_UP",
      required: true,
    },
    channel: {
      type: String,
      enum: ["EMAIL", "SMS", "WHATSAPP", "MANUAL"],
      default: "MANUAL",
    },
    status: {
      type: String,
      enum: ["PENDING", "SENT", "FAILED"],
      default: "PENDING",
      index: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    attemptCount: {
      type: Number,
      default: 1,
    },
    lastError: {
      type: String,
      default: null,
    },
    remarks: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "invoiceReminders",
  }
);

invoiceReminderSchema.index({ invoiceId: 1, status: 1, scheduledAt: -1 });
invoiceReminderSchema.index({ branchId: 1, scheduledAt: -1 });

const InvoiceReminder =
  mongoose.models.InvoiceReminder ||
  mongoose.model("InvoiceReminder", invoiceReminderSchema);

module.exports = InvoiceReminder;
