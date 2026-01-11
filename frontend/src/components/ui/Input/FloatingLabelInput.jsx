import React from 'react';

/**
 * FloatingLabelInput Component
 *
 * A reusable input component with floating label animation.
 * Supports text, email, password, and select input types.
 *
 * Props:
 * - type: 'text' | 'email' | 'password' | 'select'
 * - label: Label text that floats on focus/value
 * - value: Current input value
 * - onChange: Change handler function
 * - required: Boolean for required validation
 * - error: Error message string (optional)
 * - options: Array of {value, label} for select inputs
 * - placeholder: Placeholder text (optional)
 * - minLength: Minimum length for validation (optional)
 */
const FloatingLabelInput = ({
  type = 'text',
  label,
  value,
  onChange,
  required = false,
  error = '',
  options = [],
  placeholder = '',
  minLength,
  ...rest
}) => {
  const inputId = `floating-${label?.replace(/\s+/g, '-').toLowerCase()}`;
  const isSelect = type === 'select';

  // Base classes for input
  const inputClasses = `
    floating-input
    ${error ? 'error' : ''}
    ${isSelect ? 'select' : ''}
  `.trim();

  // Label classes
  const labelClasses = `floating-label`;

  return (
    <div className="floating-input-container">
      {isSelect ? (
        <>
          <select
            id={inputId}
            value={value}
            onChange={onChange}
            required={required}
            className={inputClasses}
            aria-label={label}
            aria-required={required}
            aria-invalid={!!error}
            {...rest}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label htmlFor={inputId} className={labelClasses}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        </>
      ) : (
        <>
          <input
            id={inputId}
            type={type}
            value={value}
            onChange={onChange}
            required={required}
            placeholder=" "
            minLength={minLength}
            className={inputClasses}
            aria-label={label}
            aria-required={required}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...rest}
          />
          <label htmlFor={inputId} className={labelClasses}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        </>
      )}

      {error && (
        <p
          id={`${inputId}-error`}
          className="text-xs text-red-500 dark:text-red-400 mt-1 ml-1"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default FloatingLabelInput;
