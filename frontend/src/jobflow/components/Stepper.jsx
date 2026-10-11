import React from "react";
import { Check } from "lucide-react";

export const Stepper = ({ steps = [], currentStep = 1, onStepClick }) => {
  return (
    <div className="jf-stepper">
      {steps.map((step, idx) => {
        const stepNum = idx + 1;
        const isActive = currentStep === stepNum;
        const isCompleted = currentStep > stepNum;

        let statusClass = "";
        if (isActive) statusClass = "active";
        else if (isCompleted) statusClass = "completed";

        return (
          <React.Fragment key={idx}>
            <div
              className={`jf-step-item ${statusClass}`}
              onClick={() => onStepClick && isCompleted && onStepClick(stepNum)}
              style={{ cursor: isCompleted ? "pointer" : "default" }}
            >
              <div className="jf-step-circle">
                {isCompleted ? <Check size={16} strokeWidth={3} /> : stepNum}
              </div>
              <span className="jf-step-label">{step}</span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className="jf-step-line"
                style={{
                  backgroundColor: isCompleted ? "var(--jf-primary)" : "#e2e8f0",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Stepper;
