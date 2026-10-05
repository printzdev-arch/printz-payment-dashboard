const GetAllPayments = require("../../application/use-cases/payments/GetAllPayments");
const GetPaymentById = require("../../application/use-cases/payments/GetPaymentById");
const CreatePayment = require("../../application/use-cases/payments/CreatePayment");
const UpdatePayment = require("../../application/use-cases/payments/UpdatePayment");
const DeletePayment = require("../../application/use-cases/payments/DeletePayment");
const {
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentResponseDto,
} = require("../../application/dto");

const paymentRepository = require("../../infrastructure/database/mongoose/repositories/MongoPaymentRepository");
const { asyncHandler, ResponseHelper } = require("../../shared");

const getAllPaymentsUseCase = new GetAllPayments({ paymentRepository });
const getPaymentByIdUseCase = new GetPaymentById({ paymentRepository });
const createPaymentUseCase = new CreatePayment({ paymentRepository });
const updatePaymentUseCase = new UpdatePayment({ paymentRepository });
const deletePaymentUseCase = new DeletePayment({ paymentRepository });

const getAllPayments = asyncHandler(async (req, res) => {
  const payments = await getAllPaymentsUseCase.execute(req.query);
  const responseDto = PaymentResponseDto.fromEntities(payments);
  return ResponseHelper.success(res, responseDto, "Payments retrieved successfully");
});

const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await getPaymentByIdUseCase.execute(req.params.id);
  const responseDto = PaymentResponseDto.fromEntity(payment);
  return ResponseHelper.success(res, responseDto, "Payment retrieved successfully");
});

const createPayment = asyncHandler(async (req, res) => {
  const createPaymentDto = CreatePaymentDto.fromRequest(req);
  const payment = await createPaymentUseCase.execute(createPaymentDto);
  const responseDto = PaymentResponseDto.fromEntity(payment);
  return ResponseHelper.created(res, responseDto, "Payment record created successfully");
});

const updatePayment = asyncHandler(async (req, res) => {
  const updatePaymentDto = UpdatePaymentDto.fromRequest(req);
  const payment = await updatePaymentUseCase.execute(req.params.id, updatePaymentDto);
  const responseDto = PaymentResponseDto.fromEntity(payment);
  return ResponseHelper.success(res, responseDto, "Payment record updated successfully");
});

const deletePayment = asyncHandler(async (req, res) => {
  await deletePaymentUseCase.execute(req.params.id);
  return ResponseHelper.success(res, null, "Payment record deleted successfully");
});

module.exports = {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
};
