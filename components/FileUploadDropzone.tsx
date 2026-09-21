"use client";

import React, { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, X, AlertCircle } from "lucide-react";

export interface FileUploadDropzoneProps {
  label?: string;
  hint?: string;
  /** Accepted MIME types, e.g. ["application/pdf","image/jpeg","image/png"] */
  accept?: string[];
  /** Max size in bytes. Default 5 MB */
  maxBytes?: number;
  /** Called when a valid file is picked */
  onFile?: (file: File) => void;
  /** Called when file is removed */
  onClear?: () => void;
  /** Current file (controlled) */
  value?: File | null;
  disabled?: boolean;
  /** For react-hook-form field error */
  error?: string;
  /** id for the hidden input — required for aria label association */
  id?: string;
}

const FIVE_MB = 5 * 1024 * 1024;
const DEFAULT_ACCEPT = ["application/pdf", "image/jpeg", "image/png"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FileUploadDropzone: React.FC<FileUploadDropzoneProps> = ({
  label = "Unggah Dokumen",
  hint,
  accept = DEFAULT_ACCEPT,
  maxBytes = FIVE_MB,
  onFile,
  onClear,
  value,
  disabled = false,
  error,
  id = "file-dropzone",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string>("");

  const displayError = error ?? localError;

  const validate = useCallback(
    (file: File): string => {
      if (!accept.includes(file.type)) {
        return `Format tidak didukung. Gunakan: ${accept
          .map((t) => t.split("/")[1].toUpperCase())
          .join(", ")}`;
      }
      if (file.size > maxBytes) {
        return `Ukuran file terlalu besar. Maks ${formatBytes(maxBytes)}.`;
      }
      return "";
    },
    [accept, maxBytes],
  );

  const handleFile = useCallback(
    (file: File) => {
      const err = validate(file);
      if (err) {
        setLocalError(err);
        return;
      }
      setLocalError("");
      onFile?.(file);
    },
    [validate, onFile],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected after clear
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalError("");
    onClear?.();
  };

  const acceptAttr = accept.join(",");

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-semibold text-[#0F3040] mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Hidden native input */}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={acceptAttr}
        className="sr-only"
        onChange={onInputChange}
        disabled={disabled}
        aria-describedby={displayError ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />

      {value ? (
        /* ── File selected state ── */
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#1B6B4D] bg-[#EDF7F2]">
          <FileText className="w-5 h-5 text-[#1B6B4D] shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-semibold text-[#0F3040] truncate"
              title={value.name}
            >
              {value.name}
            </p>
            <p className="text-xs text-[#1B6B4D]">{formatBytes(value.size)}</p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={clearFile}
              aria-label="Hapus file"
              className="shrink-0 p-1 rounded-full text-[#1B6B4D] hover:bg-[#1B6B4D]/10 transition-colors"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          )}
        </div>
      ) : (
        /* ── Drop zone ── */
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={`${label}. Klik atau seret file ke sini.`}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openPicker();
            }
          }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={[
            "flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-2xl border-2 border-dashed transition-colors duration-200 cursor-pointer select-none",
            disabled
              ? "border-[#E2E8F0] bg-[#F8FAFC] cursor-not-allowed opacity-50"
              : isDragging
                ? "border-[#8F5A4E] bg-[#FAF5F2]"
                : displayError
                  ? "border-[#B3261E] bg-[#FDECEA]"
                  : "border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#8F5A4E] hover:bg-[#FAF5F2]",
          ].join(" ")}
        >
          <UploadCloud
            className={`w-8 h-8 ${displayError ? "text-[#B3261E]" : isDragging ? "text-[#8F5A4E]" : "text-[#464858]/50"}`}
            aria-hidden
          />
          <div className="text-center">
            <p className="text-sm font-semibold text-[#0F3040]">
              Seret file ke sini atau{" "}
              <span className="text-[#8F5A4E] underline underline-offset-2">
                pilih dari perangkat
              </span>
            </p>
            {hint && (
              <p
                id={`${id}-hint`}
                className="text-xs text-[#464858]/70 mt-0.5"
              >
                {hint}
              </p>
            )}
          </div>
        </div>
      )}

      {displayError && (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-center gap-1.5 text-xs text-[#B3261E] mt-1.5"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
          {displayError}
        </p>
      )}
    </div>
  );
};
