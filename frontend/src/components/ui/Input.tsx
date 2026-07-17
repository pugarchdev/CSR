// Input Component — Premium SaaS with Glass Focus
"use client";

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// Input Component
// ============================================

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  help?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, help, className, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputId = props.id || props.name;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? "text" : type}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? `${inputId}-error` : help ? `${inputId}-help` : undefined}
            className={cn(
              "w-full h-10 px-3.5",
              "bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-xl",
              "text-sm text-slate-900 placeholder:text-slate-400",
              "transition-all duration-200",
              "focus:outline-none focus:border-blue-500/50 focus:bg-white focus:ring-[3px] focus:ring-blue-500/10",
              "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
              error && "border-red-400 focus:border-red-500 focus:ring-red-500/10",
              isPassword && "pr-10",
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {error && <p id={`${inputId}-error`} className="text-sm text-red-600 font-medium" role="alert">{error}</p>}
        {help && !error && <p id={`${inputId}-help`} className="text-sm text-slate-500">{help}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

// ============================================
// TextArea Component
// ============================================

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  help?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, help, className, rows = 4, ...props }, ref) => {
    const inputId = props.id || props.name;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${inputId}-error` : help ? `${inputId}-help` : undefined}
          className={cn(
            "w-full px-3.5 py-2.5",
            "bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-xl",
            "text-sm text-slate-900 placeholder:text-slate-400",
            "transition-all duration-200 resize-y",
            "focus:outline-none focus:border-blue-500/50 focus:bg-white focus:ring-[3px] focus:ring-blue-500/10",
            "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
            error && "border-red-400 focus:border-red-500 focus:ring-red-500/10",
            className
          )}
          {...props}
        />
        {error && <p id={`${inputId}-error`} className="text-sm text-red-600 font-medium" role="alert">{error}</p>}
        {help && !error && <p id={`${inputId}-help`} className="text-sm text-slate-500">{help}</p>}
      </div>
    );
  }
);
TextArea.displayName = "TextArea";

// ============================================
// Select Component
// ============================================

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  help?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, help, options, className, ...props }, ref) => {
    const inputId = props.id || props.name;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${inputId}-error` : help ? `${inputId}-help` : undefined}
          className={cn(
            "w-full h-10 px-3.5 pr-10",
            "bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-xl",
            "text-sm text-slate-900",
            "transition-all duration-200",
            "focus:outline-none focus:border-blue-500/50 focus:bg-white focus:ring-[3px] focus:ring-blue-500/10",
            "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
            error && "border-red-400 focus:border-red-500 focus:ring-red-500/10",
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p id={`${inputId}-error`} className="text-sm text-red-600 font-medium" role="alert">{error}</p>}
        {help && !error && <p id={`${inputId}-help`} className="text-sm text-slate-500">{help}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
