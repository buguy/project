import React from 'react';
import './Input.css';

const Input = ({
  type = 'text',
  placeholder = '',
  value,
  onChange,
  className = '',
  label,
  error,
  disabled = false,
  ...props
}) => {
  const inputClasses = [
    'input-field',
    error ? 'input-error' : '',
    disabled ? 'input-disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="input-container">
      {label && <label className="input-label">{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={inputClasses}
        disabled={disabled}
        {...props}
      />
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
};

export default Input;