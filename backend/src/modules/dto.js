/**
 * Centralized DTO Registry Barrel
 */
const authDto = require("./auth/dto");
const BranchDto = require("./branches/dto/BranchDto");
const CategoryDto = require("./categories/dto/CategoryDto");
const CommonDto = require("./general/dto/CommonDto");
const GeneralDto = require("./general/dto/GeneralDto");
const JumboXeroxDto = require("./printers/dto/JumboXeroxDto");
const PastDateRequestDto = require("./past-date-requests/dto/PastDateRequestDto");
const PrinterDto = require("./printers/dto/PrinterDto");
const PrinterReadingDto = require("./printers/dto/PrinterReadingDto");
const StockDto = require("./stocks/dto/StockDto");
const TotalAmountDto = require("./printers/dto/TotalAmountDto");
const commonDto = {
  ...BranchDto,
  ...CategoryDto,
  ...CommonDto,
  ...GeneralDto,
  ...JumboXeroxDto,
  ...PastDateRequestDto,
  ...PrinterDto,
  ...PrinterReadingDto,
  ...StockDto,
  ...TotalAmountDto,
  BranchDto,
  CategoryDto,
  CommonDto,
  GeneralDto,
  JumboXeroxDto,
  PastDateRequestDto,
  PrinterDto,
  PrinterReadingDto,
  StockDto,
  TotalAmountDto,
};
const customerDto = require("./customers/dto/CustomerDto");
const deliveryDto = require("./delivery/dto/DeliveryOrderDto");
const designDto = require("./design/dto/DesignAllocationDto");
const designSampleDto = require("./design/dto/DesignSampleDto");
const designWorkDto = require("./design/dto/DesignWorkDto");
const inventoryDto = require("./inventory/dto");
const invoiceDto = require("./invoices/dto");
const jobOrderDto = require("./job-orders/dto/JobOrderDto");
const jobEstimateDto = require("./job-orders/dto/JobEstimateDto");
const jobFileDto = require("./job-orders/dto/JobFileDto");
const posDto = require("./pos/dto");
const productionDto = require("./production/dto");
const publicApprovalDto = require("./public/dto/PublicDesignApprovalDto");
const publicJobDto = require("./public/dto/PublicJobRequestDto");
const slaDto = require("./sla/dto/SlaStatusDto");
const slaConfigDto = require("./sla/dto/SlaConfigurationDto");
const designerPerformanceDto = require("./sla/dto/DesignerPerformanceDto");
const designerRatingDto = require("./sla/dto/DesignerRatingDto");

module.exports = {
  ...authDto,
  ...commonDto,
  ...customerDto,
  ...deliveryDto,
  ...designDto,
  ...designSampleDto,
  ...designWorkDto,
  ...inventoryDto,
  ...invoiceDto,
  ...jobOrderDto,
  ...jobEstimateDto,
  ...jobFileDto,
  ...posDto,
  ...productionDto,
  ...publicApprovalDto,
  ...publicJobDto,
  ...slaDto,
  ...slaConfigDto,
  ...designerPerformanceDto,
  ...designerRatingDto,
};
