/**
 * PrintZ V3 - Enterprise Job Order Flow Modular Architecture
 */
// Stage-by-Stage Feature Modules
export * as customerModule from "./modules/customer";
export * as jobModule from "./modules/job";
export * as estimateModule from "./modules/estimate";
export * as designModule from "./modules/design";
export * as productionModule from "./modules/production";
export * as qualityModule from "./modules/quality";
export * as deliveryModule from "./modules/delivery";
export * as sharedModule from "./shared";

// Customer Foundation (Step 1)
export { default as CustomerEntryPage } from "./modules/customer/pages/CustomerEntryPage";
export { default as MobileCustomerRegisterPage } from "./modules/customer/pages/MobileCustomerRegisterPage";
export { default as CustomerEntry } from "./modules/customer/components/CustomerEntry";
export { default as WalkInRegistrationForm } from "./modules/customer/components/WalkInRegistrationForm";
export { default as CustomerSearch } from "./modules/customer/components/CustomerSearch";
export { default as CustomerSearchPanel } from "./modules/customer/components/CustomerSearchPanel";
export { default as CustomerDetailsView } from "./modules/customer/components/CustomerDetailsView";
export { default as CustomerList } from "./modules/customer/components/CustomerList";
export { default as QrRegistrationModal } from "./modules/customer/components/QrRegistrationModal";
export * as customerApi from "./modules/customer/api/customerApi";
export * as customerValidation from "./modules/customer/utils/customerValidation";

// Job Creation & Requirement Capture (Step 2)
export { default as CreateJobPage } from "./modules/job/pages/CreateJobPage";
export { default as JobListPage } from "./modules/job/pages/JobListPage";
export { default as JobDetailsPage } from "./modules/job/pages/JobDetailsPage";
export { default as JobCreationForm } from "./modules/job/components/JobCreationForm";
export { default as JobList } from "./modules/job/components/JobList";
export { default as JobDetailsView } from "./modules/job/components/JobDetailsView";
export { default as CustomerSelectorCard } from "./modules/job/components/CustomerSelectorCard";
export { default as JobBasicInfoCard } from "./modules/job/components/JobBasicInfoCard";
export { default as JobItemCard } from "./modules/job/components/JobItemCard";
export { default as JobReviewSummary } from "./modules/job/components/JobReviewSummary";
export * as jobApi from "./modules/job/api/jobApi";
export * as jobValidation from "./modules/job/utils/jobValidation";
export * as jobConstants from "./modules/job/constants/jobConstants";

// Estimate & Quotation (Step 3)
export { default as EstimateListPage } from "./modules/estimate/pages/EstimateListPage";
export { default as CreateEstimatePage } from "./modules/estimate/pages/CreateEstimatePage";
export { default as EditEstimatePage } from "./modules/estimate/pages/EditEstimatePage";
export { default as EstimateDetailsPage } from "./modules/estimate/pages/EstimateDetailsPage";
export { default as EstimateList } from "./modules/estimate/components/EstimateList";
export { default as EstimateForm } from "./modules/estimate/components/EstimateForm";
export { default as EstimateLineItemRow } from "./modules/estimate/components/EstimateLineItemRow";
export { default as EstimateDetailsView } from "./modules/estimate/components/EstimateDetailsView";
export { default as EstimatePreviewModal } from "./modules/estimate/components/EstimatePreviewModal";
export { default as SendEstimateModal } from "./modules/estimate/components/SendEstimateModal";
export * as estimateApi from "./modules/estimate/api/estimateApi";
export * as estimateCalculations from "./modules/estimate/utils/estimateCalculations";
// Customer Estimate Review & Approval (Step 4)
export { default as CustomerEstimateReviewPage } from "./modules/estimate/pages/CustomerEstimateReviewPage";
export { default as CustomerEstimateReviewView } from "./modules/customer/components/CustomerEstimateReviewView";
export { default as CustomerAcceptModal } from "./modules/customer/components/CustomerAcceptModal";
export { default as CustomerRejectModal } from "./modules/customer/components/CustomerRejectModal";
export * as estimateConstants from "./modules/estimate/constants/estimateConstants";

// Design Assignment & Design Workspace (Step 5)
export { default as DesignQueuePage } from "./modules/design/pages/DesignQueuePage";
export { default as DesignerQueuePage } from "./modules/design/pages/DesignerQueuePage";
export { default as DesignWorkspacePage } from "./modules/design/pages/DesignWorkspacePage";
export { default as DesignWorkspaceView } from "./modules/design/components/DesignWorkspaceView";
export { default as DesignerAllocationSequence } from "./modules/design/components/DesignerAllocationSequence";
export { default as DesignerPoolPanel } from "./modules/design/components/DesignerPoolPanel";
export { default as DesignQueueTable } from "./modules/design/components/DesignQueueTable";
export { default as AssignDesignerModal } from "./modules/design/components/AssignDesignerModal";
export { default as RejectAssignmentModal } from "./modules/design/components/RejectAssignmentModal";
export * as designApi from "./modules/design/api/designApi";
export * as designConstants from "./modules/design/constants/designConstants";

// Customer Design Proof Approval & Decision Workflow (Step 6)
export { default as CustomerProofReviewPage } from "./modules/design/pages/CustomerProofReviewPage";
export { default as ManagerSampleApprovalPage } from "./modules/design/pages/ManagerSampleApprovalPage";
export { default as CustomerProofApprovalView } from "./modules/design/components/CustomerProofApprovalView";
export { default as CustomerApproveProofModal } from "./modules/design/components/CustomerApproveProofModal";
export { default as CustomerRequestProofChangesModal } from "./modules/design/components/CustomerRequestProofChangesModal";
export { default as ProofCompareModal } from "./modules/design/components/ProofCompareModal";
export { default as CustomerDesignApprovalCard } from "./modules/customer/components/CustomerDesignApprovalCard";
export * as designProofApi from "./modules/design/api/designProofApi";

// Step 8 & Step 9: Production Planning, Orders, Queue & Execution
export { default as ProductionMasterPage } from "./modules/production/pages/ProductionMasterPage";
export { default as ProductionPlanningView } from "./modules/production/components/ProductionPlanningView";
export { default as ProductionPlanningDetailView } from "./modules/production/components/ProductionPlanningDetailView";
export { default as ProductionOrdersView } from "./modules/production/components/ProductionOrdersView";
export { default as ProductionOrderDetailView } from "./modules/production/components/ProductionOrderDetailView";
export { default as ProductionQueueView } from "./modules/production/components/ProductionQueueView";
export { default as OperationExecutionView } from "./modules/production/components/OperationExecutionView";
export { default as StartOperationModal } from "./modules/production/components/StartOperationModal";
export { default as CompleteOperationModal } from "./modules/production/components/CompleteOperationModal";
export { default as HoldOrderModal } from "./modules/production/components/HoldOrderModal";
export { default as JobCardPrintModal } from "./modules/production/components/JobCardPrintModal";
export { default as CreateOrderConfirmModal } from "./modules/production/components/CreateOrderConfirmModal";
export { default as OrderCreatedSuccessModal } from "./modules/production/components/OrderCreatedSuccessModal";
export * as productionApi from "./modules/production/api/productionApi";

// Step 10: Quality Control & Rework / Reprint
export { default as QualityControlMasterPage } from "./modules/quality/pages/QualityControlMasterPage";
export { default as QualityControlQueueView } from "./modules/quality/components/QualityControlQueueView";
export { default as QualityControlDetailView } from "./modules/quality/components/QualityControlDetailView";
export { default as ReprintRequestsView } from "./modules/quality/components/ReprintRequestsView";
export { default as QualityPassConfirmModal } from "./modules/quality/components/QualityPassConfirmModal";
export { default as QualityIssueConfirmModal } from "./modules/quality/components/QualityIssueConfirmModal";
export { default as ReprintDetailModal } from "./modules/quality/components/ReprintDetailModal";
export { default as QcHistoryTimelineModal } from "./modules/quality/components/QcHistoryTimelineModal";
export * as qualityApi from "./modules/quality/api/qualityApi";

// Sequential Machine Operator Console & Timers (Module 08)
export { default as OperatorConsolePage } from "./modules/production/pages/OperatorConsolePage";

// Step 15: Delivery & Dispatch (Module 09)
export * as deliveryApi from "./modules/delivery/api/deliveryApi";

// Shared / Reusable Enterprise UI Components
export { default as DataTable } from "./shared/components/DataTable";
export { default as Pagination } from "./shared/components/Pagination";
export { default as Badge } from "./shared/components/Badge";
export { default as Card } from "./shared/components/Card";
export { default as FormInput } from "./shared/components/FormInput";
export { default as LoadingSpinner } from "./shared/components/LoadingSpinner";
