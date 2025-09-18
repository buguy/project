import React from 'react';
import './Select.css';

const Select = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  className = '',
  label,
  error,
  disabled = false,
  ...props
}) => {
  const selectClasses = [
    'select-field',
    error ? 'select-error' : '',
    disabled ? 'select-disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="select-container">
      {label && <label className="select-label">{label}</label>}
      <div className="select-wrapper">
        <select
          value={value}
          onChange={onChange}
          className={selectClasses}
          disabled={disabled}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((option, index) => (
            <option key={index} value={option.value || option}>
              {option.label || option}
            </option>
          ))}
        </select>
        <div className="select-icon">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      {error && <span className="select-error-text">{error}</span>}
    </div>
  );
};

export default Select;