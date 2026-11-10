/**
 * JobFlow API Aggregator
 * Composes domain-specific APIs for complete workflow compatibility.
 * All domain endpoints are maintained in their respective feature folders:
 * - customers/api/customersApi
 * - job-orders/api/jobOrdersApi
 * - estimation/api/estimationApi
 * - design/api/designApi
 * - production/api/productionApi
 * - quality-control/api/qcApi
 * - delivery/api/deliveryApi
 * - settlement/api/settlementApi
 * - dashboard/api/dashboardApi
 */

import { customersApi } from "../../customers/api/customersApi";
import { jobOrdersApi } from "../../job-orders/api/jobOrdersApi";
import { estimationApi } from "../../estimation/api/estimationApi";
import { designApi } from "../../design/api/designApi";
import { productionApi } from "../../production/api/productionApi";
import { qcApi } from "../../quality-control/api/qcApi";
import { deliveryApi } from "../../delivery/api/deliveryApi";
import { invoiceApi } from "../../invoice/api/invoiceApi";
import { settlementApi } from "../../settlement/api/settlementApi";
import { dashboardApi } from "../../dashboard/api/dashboardApi";

export const jobFlowApi = {
  ...customersApi,
  ...jobOrdersApi,
  ...estimationApi,
  ...designApi,
  ...productionApi,
  ...qcApi,
  ...deliveryApi,
  ...invoiceApi,
  ...settlementApi,
  ...dashboardApi,
};

export default jobFlowApi;

