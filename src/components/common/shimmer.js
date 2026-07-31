// DashboardCardSkeleton.js
import React from 'react';

// A simple, reusable skeleton element component
const SkeletonElement = ({ type, style }) => {
  const classes = `skeleton ${type}`;
  return <div className={classes} style={style}></div>;
};

// A reusable component for sidebar navigation items
const SkeletonNavItem = () => (
  <div className="skeleton-nav-item">
    <SkeletonElement type="circle" style={{ height: '24px', width: '24px' }} />
    <SkeletonElement type="text" style={{ height: '16px', flex: 1, marginLeft: '12px' }} />
  </div>
);

const Shimmer = () => {
  return (
    <>
      {/* All CSS is now self-contained within the component */}
      <style>{`
        /* Keyframes for the shimmer animation */
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        /* Base styles for all skeleton elements */
        .skeleton {
          background-color: #e7e7e7;
          border-radius: 4px;
          animation: shimmer 2s infinite linear;
          background-image: linear-gradient(to right, #e7e7e7 0%, #f0f0f0 50%, #e7e7e7 100%);
          background-repeat: no-repeat;
          background-size: 2000px 100%;
          display: inline-block;
          line-height: 1;
        }
        
        .skeleton.circle { border-radius: 50%; }

        /* Main full-screen flex container */
        .dashboard-layout-skeleton {
          display: flex;
          width: 100%;
          height: 100vh;
          background-color: #f4f4f5;
          box-sizing: border-box;
          overflow: hidden; /* Prevent scrollbars from the layout itself */
        }

        /* Sidebar Skeleton Styles */
        .skeleton-sidebar {
          width: 260px;
          flex-shrink: 0; /* Prevent sidebar from shrinking */
          background-color: #fff;
          padding: 25px 20px;
          border-right: 1px solid #e0e0e0;
          box-sizing: border-box;
        }
        
        .skeleton-logo {
          margin-bottom: 40px;
        }

        .skeleton-nav-item {
          display: flex;
          align-items: center;
          margin-bottom: 22px;
        }

        /* Main Content Skeleton Styles */
        .skeleton-main-content {
          flex-grow: 1; /* Allow main content to fill remaining space */
          padding: 30px 40px;
          box-sizing: border-box;
          overflow-y: auto; /* Allow scrolling if content overflows */
        }

        .skeleton-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        
        .skeleton-user-profile {
          display: flex;
          align-items: center;
        }

        /* Card styles (re-using .skeleton-inner-box) */
        .skeleton-inner-box {
          background-color: #fff;
          border-radius: 12px;
          padding: 30px 40px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.07);
          box-sizing: border-box;
        }

        .card-header-skeleton {
          display: flex;
          align-items: center;
          margin-bottom: 25px;
        }

        .header-text-skeleton {
          margin-left: 15px;
          width: calc(100% - 65px);
        }

        .header-text-skeleton .skeleton:first-child {
          margin-bottom: 8px;
        }
        
        .card-content-skeleton .skeleton:not(:last-child) {
           margin-bottom: 12px;
        }
        .card-content-skeleton .chart-placeholder-skeleton {
          margin-top: 20px;
          border-radius: 6px;
          overflow: hidden;
        }
      `}</style>

      {/* The main layout container */}
      <div className="dashboard-layout-skeleton">
        
        {/* Sidebar */}
        <div className="skeleton-sidebar">
          <div className="skeleton-logo">
            <SkeletonElement type="text" style={{ height: '30px', width: '70%' }} />
          </div>
          <SkeletonNavItem />
          <SkeletonNavItem />
          <SkeletonNavItem />
          <SkeletonNavItem />
          <SkeletonNavItem />
        </div>

        {/* Main Content Area */}
        <div className="skeleton-main-content">
          <div className="skeleton-header">
            <SkeletonElement type="text" style={{ height: '24px', width: '200px' }} />
            <div className="skeleton-user-profile">
              <SkeletonElement type="text" style={{ height: '20px', width: '80px', marginRight: '15px' }} />
              <SkeletonElement type="circle" style={{ height: '36px', width: '36px' }} />
            </div>
          </div>
          
          <div className="skeleton-inner-box">
            <div className="card-header-skeleton">
              <SkeletonElement type="circle" style={{ height: '50px', width: '50px' }} />
              <div className="header-text-skeleton">
                <SkeletonElement type="text" style={{ height: '22px', width: '70%' }} /> 
                <SkeletonElement type="text" style={{ height: '16px', width: '40%' }} /> 
              </div>
            </div>

            <div className="card-content-skeleton">
              <SkeletonElement type="text" style={{ height: '14px', width: '95%' }} />
              <SkeletonElement type="text" style={{ height: '14px', width: '90%' }} />
              <div className="chart-placeholder-skeleton">
                <SkeletonElement type="block" style={{ height: '120px', width: '100%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Shimmer;

