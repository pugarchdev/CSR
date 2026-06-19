import { TextareaHTMLAttributes, forwardRef } from "react";

interface GovTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  required?: boolean;
  error?: string;
  help?: string;
}

const GovTextarea = forwardRef<HTMLTextAreaElement, GovTextareaProps>(
  ({ label, required, error, help, className = "", ...props }, ref) => {
    return (
      <div className="gov-field">
        {label && (
          <label className="gov-label">
            {label} {required && <span className="gov-required">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={`gov-textarea ${error ? "error" : ""} ${className}`}
          {...props}
        />
        {error && <div className="gov-error-text">{error}</div>}
        {help && !error && <div className="gov-help">{help}</div>}
      </div>
    );
  }
);

GovTextarea.displayName = "GovTextarea";

export default GovTextarea;

// Made with Bob
