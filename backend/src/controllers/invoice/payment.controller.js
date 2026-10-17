const paymentService = require("../../services/invoice/payment.service");
const {
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentResponseDto,
} = require("../../utils/dto");
const { asyncHandler, ResponseHelper } = require("../../utils");

const getAllPayments = asyncHandler(async (req, res) => {
  const payments = await paymentService.getAllPayments(req.query);
  const responseDto = PaymentResponseDto.fromEntities(payments);
  return ResponseHelper.success(res, responseDto, "Payments retrieved successfully");
});

const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentById(req.params.id);
  const responseDto = PaymentResponseDto.fromEntity(payment);
  return ResponseHelper.success(res, responseDto, "Payment retrieved successfully");
});

const createPayment = asyncHandler(async (req, res) => {
  const createPaymentDto = CreatePaymentDto.fromRequest(req);
  const payment = await paymentService.createPayment(createPaymentDto);
  const responseDto = PaymentResponseDto.fromEntity(payment);
  return ResponseHelper.created(res, responseDto, "Payment record created successfully");
});

const updatePayment = asyncHandler(async (req, res) => {
  const updatePaymentDto = UpdatePaymentDto.fromRequest(req);
  const payment = await paymentService.updatePayment(req.params.id, updatePaymentDto);
  const responseDto = PaymentResponseDto.fromEntity(payment);
  return ResponseHelper.success(res, responseDto, "Payment record updated successfully");
});

const deletePayment = asyncHandler(async (req, res) => {
  await paymentService.deletePayment(req.params.id);
  return ResponseHelper.success(res, null, "Payment record deleted successfully");
});

module.exports = {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
};
