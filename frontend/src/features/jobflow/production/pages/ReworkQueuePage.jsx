import React from "react";
import ReprintBatchesPage from "./ReprintBatchesPage";

/**
 * Rework and Reprint now live on one page with two tabs.
 * This file only keeps the old route/import working: it opens the same page on the Rework tab.
 * Once your router points to ReprintBatchesPage, you can remove this route.
 */
export const ReworkQueuePage = () => <ReprintBatchesPage initialTab="REWORK" />;

export default ReworkQueuePage;