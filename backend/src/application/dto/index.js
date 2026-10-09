/**
 * Application Data Transfer Objects (DTOs)
 * Central export index for all domain and request DTOs.
 */

const { LoginDto, RefreshTokenDto, LogoutDto } = require("./AuthDto");
const {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserPermissionsDto,
  UpdateUserRoleDto,
  UserResponseDto,
} = require("./UserDto");
const { CreateBranchDto, UpdateBranchDto, BranchResponseDto } = require("./BranchDto");
const { CreatePaymentDto, UpdatePaymentDto, PaymentResponseDto } = require("./PaymentDto");
const { CreatePrinterDto, UpdatePrinterDto, PrinterResponseDto } = require("./PrinterDto");
const {
  CreatePrinterReadingDto,
  SavePrinterReadingDto,
  UpdatePrinterReadingDto,
  PrinterReadingResponseDto,
  PrinterReadingDto,
} = require("./PrinterReadingDto");
const {
  SaveStockItemDto,
  CreateStockItemDto,
  UpdateStockItemDto,
  StockItemResponseDto,
  SaveStockReadingDto,
  CreateStockReadingDto,
  UpdateStockReadingDto,
  StockReadingResponseDto,
} = require("./StockDto");
const {
  SaveTotalAmountDto,
  CreateTotalAmountDto,
  UpdateTotalAmountDto,
  TotalAmountResponseDto,
} = require("./TotalAmountDto");
const {
  SaveJumboXeroxMachineDto,
  CreateJumboXeroxMachineDto,
  UpdateJumboXeroxMachineDto,
  JumboXeroxMachineResponseDto,
  SaveJumboXeroxReadingDto,
} = require("./JumboXeroxDto");
const {
  CreatePastDateRequestDto,
  UpdatePastDateRequestDto,
  PastDateRequestResponseDto,
} = require("./PastDateRequestDto");
const { CreateCategoryDto, CategoryResponseDto } = require("./CategoryDto");
const { FinalizeDateDto } = require("./GeneralDto");
const { CreateSaleDto, SaleResponseDto } = require("./SaleDto");

const {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  DeactivateEmployeeDto,
} = require("./EmployeeDto");
const { CreateRoleDto, UpdateRoleDto } = require("./RoleDto");

// Production DTOs
const {
  PlanProductionDto,
  UpdateProductionOrderDto,
  ProductionOrderResponseDto,
  StartOperationDto,
  CompleteOperationDto,
  ProductionOperationResponseDto,
  PerformQualityCheckDto,
  QualityCheckResponseDto,
  CreateReprintRequestDto,
  ReprintRequestResponseDto,
  DeliverOrderDto,
  DeliveryOrderResponseDto,
} = require("./production");

// Aliases for backwards compatibility
const UserCreateDto = CreateUserDto;

module.exports = {
  // Auth
  LoginDto,
  RefreshTokenDto,
  LogoutDto,

  // Users
  CreateUserDto,
  UserCreateDto,
  UpdateUserDto,
  UpdateUserPermissionsDto,
  UpdateUserRoleDto,
  UserResponseDto,

  // Employees
  CreateEmployeeDto,
  UpdateEmployeeDto,
  DeactivateEmployeeDto,

  // Roles
  CreateRoleDto,
  UpdateRoleDto,

  // Branches
  CreateBranchDto,
  UpdateBranchDto,
  BranchResponseDto,

  // Payments
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentResponseDto,

  // Printers
  CreatePrinterDto,
  UpdatePrinterDto,
  PrinterResponseDto,

  // Printer Readings
  CreatePrinterReadingDto,
  SavePrinterReadingDto,
  UpdatePrinterReadingDto,
  PrinterReadingResponseDto,
  PrinterReadingDto,

  // Stocks
  SaveStockItemDto,
  CreateStockItemDto,
  UpdateStockItemDto,
  StockItemResponseDto,
  SaveStockReadingDto,
  CreateStockReadingDto,
  UpdateStockReadingDto,
  StockReadingResponseDto,

  // Total Amounts
  SaveTotalAmountDto,
  CreateTotalAmountDto,
  UpdateTotalAmountDto,
  TotalAmountResponseDto,

  // Jumbo Xerox
  SaveJumboXeroxMachineDto,
  CreateJumboXeroxMachineDto,
  UpdateJumboXeroxMachineDto,
  JumboXeroxMachineResponseDto,
  SaveJumboXeroxReadingDto,

  // Past Date Requests
  CreatePastDateRequestDto,
  UpdatePastDateRequestDto,
  PastDateRequestResponseDto,

  // Categories
  CreateCategoryDto,
  CategoryResponseDto,

  // General
  FinalizeDateDto,

  // Sales
  CreateSaleDto,
  SaleResponseDto,

  // Production
  PlanProductionDto,
  UpdateProductionOrderDto,
  ProductionOrderResponseDto,
  StartOperationDto,
  CompleteOperationDto,
  ProductionOperationResponseDto,
  PerformQualityCheckDto,
  QualityCheckResponseDto,
  CreateReprintRequestDto,
  ReprintRequestResponseDto,
  DeliverOrderDto,
  DeliveryOrderResponseDto,
};
