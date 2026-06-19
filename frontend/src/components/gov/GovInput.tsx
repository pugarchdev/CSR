import { InputHTMLAttributes, forwardRef } from "react";

interface GovInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
  help?: string;
}

const GovInput = forwardRef<HTMLInputElement, GovInputProps>(
  ({ label, required, error, help, className = "", ...props }, ref) => {
    return (
      <div className="gov-field">
        {label && (
          <label className="gov-label">
            {label} {required && <span className="gov-required">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`gov-input ${error ? "error" : ""} ${className}`}
          {...props}
        />
        {error && <div className="gov-error-text">{error}</div>}
        {help && !error && <div className="gov-help">{help}</div>}
      </div>
    );
  }
);

GovInput.displayName = "GovInput";

export default GovInput;

// Made with Bob
