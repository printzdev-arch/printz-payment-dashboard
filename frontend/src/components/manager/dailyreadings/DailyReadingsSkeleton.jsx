import React from "react";
import { Loader2 } from "lucide-react";
import "../../../styles/printerreadings.css";

const DailyReadingsSkeleton = ({ message = "Loading data...", subtitle = "Syncing records..." }) => {
  return (
    <div className="daily-skeleton-container">
      {/* Centered Premium Loader Card */}
      <div className="daily-skeleton-loader-card">
        <div className="daily-skeleton-spinner-wrap">
          <div className="daily-skeleton-pulse-ring"></div>
          <div className="daily-skeleton-spinner-ring"></div>
          <div className="daily-skeleton-spinner-center">
            <Loader2 className="daily-skeleton-icon-spin" size={20} />
          </div>
        </div>
        <div className="daily-skeleton-text-group">
          <h4 className="daily-skeleton-title">{message}</h4>
          <p className="daily-skeleton-subtitle">{subtitle}</p>
        </div>
      </div>

      {/* Shimmering Table Skeleton Placeholder */}
      <div className="daily-skeleton-table-card">
        {/* Skeleton Top Bar */}
        <div className="daily-skeleton-topbar">
          <div className="daily-skeleton-shimmer-box daily-skeleton-badge"></div>
          <div className="daily-skeleton-shimmer-box daily-skeleton-search"></div>
        </div>

        {/* Skeleton Header */}
        <div className="daily-skeleton-table-header">
          <div className="daily-skeleton-shimmer-box daily-skeleton-col-sm"></div>
          <div className="daily-skeleton-shimmer-box daily-skeleton-col-lg"></div>
          <div className="daily-skeleton-shimmer-box daily-skeleton-col-md"></div>
          <div className="daily-skeleton-shimmer-box daily-skeleton-col-sm"></div>
          <div className="daily-skeleton-shimmer-box daily-skeleton-col-md"></div>
          <div className="daily-skeleton-shimmer-box daily-skeleton-col-md"></div>
        </div>

        {/* Skeleton Rows */}
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="daily-skeleton-table-row">
            <div className="daily-skeleton-shimmer-box daily-skeleton-col-sm"></div>
            <div className="daily-skeleton-shimmer-box daily-skeleton-col-lg" style={{ width: `${60 + (item % 3) * 15}%` }}></div>
            <div className="daily-skeleton-shimmer-box daily-skeleton-col-md"></div>
            <div className="daily-skeleton-shimmer-box daily-skeleton-col-sm"></div>
            <div className="daily-skeleton-shimmer-box daily-skeleton-col-md"></div>
            <div className="daily-skeleton-shimmer-box daily-skeleton-col-md"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyReadingsSkeleton;
