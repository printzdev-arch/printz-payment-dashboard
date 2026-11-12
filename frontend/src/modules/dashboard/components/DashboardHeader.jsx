import React from "react";
import { Bell } from "lucide-react";
import "../styles/dashboard.css";

const DashboardHeader = ({
  title = "Branch Manager Dashboard",
  subtitle,
  userName = "Rajesh Kumar",
  userRole = "Branch Manager",
  branchName = "Branch",
  alertCount = 5,
}) => {
  return (
    <div className="printz-dash-header">
      {/* Left Title & Welcome Greeting */}
      <div className="printz-dash-title-group">
        <h1>{title}</h1>
        <p>
          {subtitle ? (
            subtitle
          ) : (
            <>
              Welcome, <strong>{userName}</strong>
              {branchName ? (
                <>
                  {" "}| <span>{branchName}</span>
                </>
              ) : null}
            </>
          )}
        </p>
      </div>

      {/* Right Actions: Notification Bell + User Profile Avatar matching reference */}
      
    </div>
  );
};

export default DashboardHeader;
