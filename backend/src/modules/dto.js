/**
 * Centralized DTO Registry Barrel
 */
const authDto = require("./auth/models/dto");
const BranchDto = require("./branches/models/BranchDto");
const CategoryDto = require("./categories/models/CategoryDto");
const CommonDto = require("./general/models/CommonDto");
const GeneralDto = require("./general/models/GeneralDto");
const JumboXeroxDto = require("./printers/models/JumboXeroxDto");
const PastDateRequestDto = require("./past-date-requests/models/PastDateRequestDto");
const PrinterDto = require("./printers/models/PrinterDto");
const PrinterReadingDto = require("./printers/models/PrinterReadingDto");
const StockDto = require("./stocks/models/StockDto");
const TotalAmountDto = require("./printers/models/TotalAmountDto");
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
const customerDto = require("./customers/models/CustomerDto");
const deliveryDto = require("./delivery/models/DeliveryOrderDto");
const designDto = require("./design/models/DesignAllocationDto");
const designSampleDto = require("./design/models/DesignSampleDto");
const designWorkDto = require("./design/models/DesignWorkDto");
const inventoryDto = require("./inventory/models/dto");
const invoiceDto = require("./invoices/models/dto");
const jobOrderDto = require("./job-orders/models/JobOrderDto");
const jobEstimateDto = require("./job-orders/models/JobEstimateDto");
const jobFileDto = require("./job-orders/models/JobFileDto");
const posDto = require("./pos/models/dto");
const productionDto = require("./production/models/dto");
const publicApprovalDto = require("./public/models/PublicDesignApprovalDto");
const publicJobDto = require("./public/models/PublicJobRequestDto");
const slaDto = require("./sla/models/SlaStatusDto");
const slaConfigDto = require("./sla/models/SlaConfigurationDto");
const designerPerformanceDto = require("./sla/models/DesignerPerformanceDto");
const designerRatingDto = require("./sla/models/DesignerRatingDto");

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
