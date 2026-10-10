import React from "react";
import "../../modules/customer/styles/customerV3.css";

export default function FormInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  error,
  helperText,
  icon: Icon,
  disabled = false,
  maxLength,
  className = "",
  autoComplete = "off"
}) {
  const hasError = Boolean(error);

  return (
    <div className={`v3-form-group ${className}`}>
      {label && (
        <label htmlFor={name} className="v3-form-label">
          {label}
          {required && <span className="v3-required-star">*</span>}
        </label>
      )}

      <div className="v3-input-wrapper">
        {Icon && (
          <div className="v3-input-icon">
            <Icon size={16} />
          </div>
        )}

        <input
          id={name}
          name={name}
          type={type}
          value={value ?? ""}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete={autoComplete}
          className={`v3-input ${hasError ? "has-error" : ""} ${!Icon ? "no-icon" : ""}`}
        />
      </div>

      {hasError ? (
        <p className="v3-error-text">⚠️ {error}</p>
      ) : helperText ? (
        <p className="v3-helper-text">{helperText}</p>
      ) : null}
    </div>
  );
}
