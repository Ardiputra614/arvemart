"use client";

import { useMemo, useRef, useCallback } from "react";

const FormatRupiahInput = ({
  id,
  value,
  onChange,
  className = "",
  placeholder = "0",
  disabled = false,
  required = false,
  onBlur,
  ...props
}) => {
  const inputRef = useRef(null);

  // Format number to Rupiah - dibungkus useCallback
  const formatRupiah = useCallback((number) => {
    if (!number && number !== 0) return "";

    // Remove non-numeric characters
    const numericValue = number.toString().replace(/\D/g, "");

    if (!numericValue) return "";

    // Format to Rupiah
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(numericValue));
  }, []);

  // Parse Rupiah to number
  const parseRupiah = useCallback((formattedString) => {
    if (!formattedString) return "";

    // Remove currency symbol, dots, and spaces
    return formattedString
      .replace("Rp", "")
      .replace(/\./g, "")
      .replace(/\s/g, "")
      .trim();
  }, []);

  // Compute display value from prop - menggunakan useMemo
  const displayValue = useMemo(() => {
    if (value || value === 0) {
      return formatRupiah(value);
    }
    return "";
  }, [value, formatRupiah]);

  const handleChange = (e) => {
    const rawValue = parseRupiah(e.target.value);

    // Call parent onChange with numeric value
    if (onChange) {
      const event = {
        ...e,
        target: {
          ...e.target,
          id: id,
          value: rawValue,
          name: props.name || id,
        },
      };
      onChange(event);
    }
  };

  const handleFocus = () => {
    // Select all text when focused
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  const handleBlur = (e) => {
    if (onBlur) {
      onBlur(e);
    }
  };

  const handleKeyDown = (e) => {
    // Allow: backspace, delete, tab, escape, enter, arrow keys
    const allowedKeys = [
      8,
      9,
      13,
      27,
      46, // backspace, tab, enter, escape, delete
      37,
      38,
      39,
      40, // arrow keys
    ];

    // Allow Ctrl/Command + A, C, V, X
    if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].includes(e.keyCode)) {
      return;
    }

    // Allow numbers
    if (
      (e.keyCode >= 48 && e.keyCode <= 57) || // number keys
      (e.keyCode >= 96 && e.keyCode <= 105) // numpad keys
    ) {
      return;
    }

    // Allow other allowed keys
    if (allowedKeys.includes(e.keyCode)) {
      return;
    }

    // Prevent default for other keys
    e.preventDefault();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");

    // Remove non-numeric characters from pasted text
    const numericText = pastedText.replace(/\D/g, "");

    if (numericText && onChange) {
      const event = {
        ...e,
        target: {
          ...e.target,
          id: id,
          value: numericText,
          name: props.name || id,
        },
      };
      onChange(event);
    }
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span className="text-gray-500">Rp</span>
      </div>
      <input
        ref={inputRef}
        type="text"
        id={id}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className} ${
          disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white"
        }`}
        autoComplete="off"
        inputMode="numeric"
        {...props}
      />
    </div>
  );
};

export default FormatRupiahInput;
