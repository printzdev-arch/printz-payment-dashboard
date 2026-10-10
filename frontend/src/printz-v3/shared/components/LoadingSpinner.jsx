import React from "react";

export default function LoadingSpinner({ size = "md", text = "Loading...", className = "" }) {
  const sizeClass = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-3"
  }[size] || "w-6 h-6 border-2";

  return (
    <div className={`flex flex-col items-center justify-center p-6 gap-3 ${className}`}>
      <div
        className={`${sizeClass} border-emerald-200 border-t-emerald-700 rounded-full animate-spin`}
      />
      {text && <p className="text-xs text-gray-500 font-medium">{text}</p>}
    </div>
  );
}
