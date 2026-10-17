/**
 * Centralized DTO Registry Barrel
 */
const authDto = require("./auth");
const commonDto = require("./common");
const customerDto = require("./customer/CustomerDto");
const deliveryDto = require("./delivery/DeliveryOrderDto");
const designDto = require("./design/DesignAllocationDto");
const designSampleDto = require("./design/DesignSampleDto");
const designWorkDto = require("./design/DesignWorkDto");
const inventoryDto = require("./inventory");
const invoiceDto = require("./invoice");
const jobOrderDto = require("./job-order/JobOrderDto");
const jobEstimateDto = require("./job-order/JobEstimateDto");
const jobFileDto = require("./job-order/JobFileDto");
const posDto = require("./pos");
const productOrderDto = require("./product-order");
const productionDto = require("./production");
const publicApprovalDto = require("./public/PublicDesignApprovalDto");
const publicJobDto = require("./public/PublicJobRequestDto");
const slaDto = require("./sla/SlaStatusDto");
const slaConfigDto = require("./sla/SlaConfigurationDto");
const designerPerformanceDto = require("./sla/DesignerPerformanceDto");
const designerRatingDto = require("./sla/DesignerRatingDto");

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
  ...productOrderDto,
  ...productionDto,
  ...publicApprovalDto,
  ...publicJobDto,
  ...slaDto,
  ...slaConfigDto,
  ...designerPerformanceDto,
  ...designerRatingDto,
};
