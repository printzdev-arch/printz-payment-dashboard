const SettlementService = require("../../../application/services/settlement/settlement.service");
const PaymentDto = require("../../../application/dto/payment/PaymentDto");
const ResponseHelper = require("../../../shared/response/ResponseHelper");
const asyncHandler = require("../../../shared/asyncHandler");

class SettlementController {
  static getSettlement = asyncHandler(async (req, res) => {
    const settlement = await SettlementService.getSettlement(req.params.id, req.authz, req.user);
    return ResponseHelper.ok(res, "Invoice settlement details retrieved successfully", settlement);
  });

  static collectPayment = asyncHandler(async (req, res) => {
    const result = await SettlementService.collectPayment(req.params.id, req.body, req.user, req.authz);
    return ResponseHelper.created(res, {
      payment: PaymentDto.toResponse(result.payment),
      settlement: result.settlement,
    }, "Payment collected successfully");
  });

  static getPaymentsByInvoice = asyncHandler(async (req, res) => {
    const result = await SettlementService.getPaymentsByInvoice(req.params.id, req.query, req.user, req.authz);
    return ResponseHelper.ok(res, "Invoice payments retrieved successfully", {
      items: PaymentDto.toResponseList(result.items),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  });

  static getPaymentById = asyncHandler(async (req, res) => {
    const payment = await SettlementService.getPaymentById(req.params.id, req.user, req.authz);
    return ResponseHelper.ok(res, "Payment details retrieved successfully", PaymentDto.toResponse(payment));
  });

  static getReceipt = asyncHandler(async (req, res) => {
    const receipt = await SettlementService.generateReceipt(req.params.id, req.user, req.authz);
    if (req.headers.accept && req.headers.accept.includes("text/html")) {
      res.setHeader("Content-Type", "text/html");
      return res.send(receipt.receiptHtml);
    }
    return ResponseHelper.ok(res, "Payment receipt generated successfully", receipt);
  });

  static voidPayment = asyncHandler(async (req, res) => {
    const result = await SettlementService.voidPayment(req.params.id, req.body, req.user, req.authz);
    return ResponseHelper.ok(res, "Payment voided successfully", {
      payment: PaymentDto.toResponse(result.payment),
      settlement: result.settlement,
    });
  });
}

module.exports = SettlementController;
