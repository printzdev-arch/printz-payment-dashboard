import React from "react";
import ProductionDashboardPage from "./ProductionDashboardPage";

/**
 * ProductionPage
 * Re-routes/renders ProductionDashboardPage.
 * Individual dedicated production pages now handle each sub-domain directly.
 */
export const ProductionPage = (props) => {
  return <ProductionDashboardPage {...props} />;
};

export default ProductionPage;
