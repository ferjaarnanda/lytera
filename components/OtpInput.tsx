"use client";

import React, { useRef } from "react";

export interface OtpInputProps {
  /** Number of digits. Default 6 */
  length?: number;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  error?: string;
  id?: string;
  label?: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false,
  error,
  id = "otp-input",
  label = "Kode Verifikasi",
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.padEnd(length, "").split("").slice(0, length);

  const focus = (idx: number) => {
    if (idx >= 0 && idx < length) {
      inputsRef.current[idx]?.focus();
      inputsRef.current[idx]?.select();
    }
  };

  const handleChange = (idx: number, char: string) => {
    const digit = char.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    const next = digits.slice();
    next[idx] = digit;
    onChange(next.join(""));
    focus(idx + 1);
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[idx]) {
        const next = digits.slice();
        next[idx] = "";
        onChange(next.join("").trimEnd());
      } else {
        focus(idx - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(idx - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(idx + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted.padEnd(0, ""));
    focus(Math.min(pasted.length, length - 1));
  };

  return (
    <div className="w-full">
      <label
        className="block text-sm font-semibold text-[#0F3040] mb-3"
        htmlFor={`${id}-0`}
      >
        {label}
      </label>
      <div
        className="flex gap-2 sm:gap-3"
        role="group"
        aria-label={label}
      >
        {Array.from({ length }).map((_, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputsRef.current[idx] = el;
            }}
            id={idx === 0 ? `${id}-0` : undefined}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={1}
            value={digits[idx] ?? ""}
            disabled={disabled}
            autoComplete="one-time-code"
            aria-label={`Digit ${idx + 1} dari ${length}`}
            aria-invalid={!!error}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={[
              "w-10 h-12 sm:w-12 sm:h-14 rounded-xl border-2 text-center text-lg font-bold tabular-nums",
              "transition-colors duration-150 outline-none",
              "focus:border-[#0F3040] focus:ring-4 focus:ring-[#0F3040]/10",
              disabled
                ? "bg-[#F8FAFC] border-[#E2E8F0] text-slate-400 cursor-not-allowed"
                : error
                  ? "bg-[#FDECEA] border-[#B3261E] text-[#B3261E]"
                  : digits[idx]
                    ? "bg-[#0A2230] border-[#0A2230] text-white"
                    : "bg-white border-[#E2E8F0] text-[#0F3040]",
            ].join(" ")}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs text-[#B3261E] mt-2">
          {error}
        </p>
      )}
    </div>
  );
};
