"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
} from "react";
import { ChevronLeft, Calendar } from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────────
// Konstanta & utilitas
// ──────────────────────────────────────────────────────────────────────────────

const BULAN_LABELS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const HARI_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function padZ(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Format nilai ISO "YYYY-MM-DD" → "DD MMMM YYYY" */
function formatDisplayDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${padZ(d)} ${BULAN_LABELS[m - 1]} ${y}`;
}

/** Parse ISO string → { year, month, day } */
function parseISO(iso: string): { year: number; month: number; day: number } | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

/** Jumlah hari di bulan (1-indexed) */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Hari mulai minggu pertama dalam bulan (0 = Min) */
function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1930;
const ALL_YEARS: number[] = [];
for (let y = CURRENT_YEAR; y >= MIN_YEAR; y--) ALL_YEARS.push(y);

// ──────────────────────────────────────────────────────────────────────────────
// Tipe prop
// ──────────────────────────────────────────────────────────────────────────────

export interface DatePickerProps {
  /** Nilai ISO "YYYY-MM-DD" */
  value: string;
  /** Dipanggil setiap kali tanggal dipilih lengkap */
  onChange: (iso: string) => void;
  id?: string;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  /** Class tambahan untuk wrapper luar */
  className?: string;
  /** ukuran field – "sm" untuk anggota keluarga, default "md" */
  size?: "sm" | "md";
}

// ──────────────────────────────────────────────────────────────────────────────
// Komponen utama
// ──────────────────────────────────────────────────────────────────────────────

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  id,
  disabled = false,
  error,
  placeholder = "Pilih tanggal lahir",
  className = "",
  size = "md",
}) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  // Langkah: "year" | "month" | "day"
  type Step = "year" | "month" | "day";
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("year");

  const parsed = parseISO(value);

  // Sementara selama navigasi di popover
  const [pickedYear, setPickedYear] = useState<number | null>(() => parsed?.year ?? null);
  const [pickedMonth, setPickedMonth] = useState<number | null>(() => parsed?.month ?? null);

  // Input cepat tahun
  const [yearInput, setYearInput] = useState("");

  const wrapperRef = useRef<HTMLDivElement>(null);
  const yearInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const yearGridRef = useRef<HTMLDivElement>(null);

  // Tutup saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Fokus input tahun saat popover buka
  useEffect(() => {
    if (open && step === "year") {
      setTimeout(() => yearInputRef.current?.focus({ preventScroll: true }), 50);
    }
  }, [open, step]);

  // Scroll ke tahun yang dipilih di grid (hanya menggeser container grid internal tanpa memicu window scroll)
  useEffect(() => {
    if (open && step === "year" && yearGridRef.current) {
      const container = yearGridRef.current;
      const selected = container.querySelector("[data-selected=true]") as HTMLElement;
      if (selected) {
        const offset = selected.offsetTop - container.offsetTop;
        container.scrollTop = offset - container.clientHeight / 2 + selected.clientHeight / 2;
      }
    }
  }, [open, step]);

  const openPicker = () => {
    if (disabled) return;
    const currentParsed = parseISO(value);
    setPickedYear(currentParsed?.year ?? null);
    setPickedMonth(currentParsed?.month ?? null);
    setStep("year");
    setYearInput("");
    setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  // ── Langkah 1: Pilih Tahun ──────────────────────────────────────────────
  const handleYearPick = useCallback((y: number) => {
    setPickedYear(y);
    setPickedMonth(null);
    setStep("month");
  }, []);

  const filteredYears =
    yearInput.trim() !== ""
      ? ALL_YEARS.filter((y) => y.toString().startsWith(yearInput.trim()))
      : ALL_YEARS;

  // ── Langkah 2: Pilih Bulan ─────────────────────────────────────────────
  const handleMonthPick = useCallback((m: number) => {
    setPickedMonth(m);
    setStep("day");
  }, []);

  // ── Langkah 3: Pilih Hari ──────────────────────────────────────────────
  const handleDayPick = useCallback(
    (d: number) => {
      if (!pickedYear || !pickedMonth) return;
      const iso = `${pickedYear}-${padZ(pickedMonth)}-${padZ(d)}`;
      onChange(iso);
      setOpen(false);
    },
    [pickedYear, pickedMonth, onChange]
  );

  // Build grid kalender
  const buildCalendar = () => {
    if (!pickedYear || !pickedMonth) return null;
    const total = daysInMonth(pickedYear, pickedMonth);
    const startDay = firstDayOfMonth(pickedYear, pickedMonth);
    const cells: (number | null)[] = Array(startDay).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    // Pad akhir supaya grid penuh 7 kolom
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const calendarCells = step === "day" ? buildCalendar() : null;

  // ── Gaya dinamis ───────────────────────────────────────────────────────
  const isSmall = size === "sm";
  const fieldHeight = isSmall ? "h-10" : "h-12";
  const fieldPx = isSmall ? "px-3" : "px-4";
  const fieldText = isSmall ? "text-xs" : "text-sm";
  const fieldRadius = isSmall ? "rounded-[10px]" : "rounded-[14px]";

  const displayValue = parsed ? formatDisplayDate(value) : "";
  const hasError = !!error;

  return (
    <div
      ref={wrapperRef}
      className={`relative ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* ── Trigger Field ── */}
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={openPicker}
        className={[
          "w-full flex items-center gap-2 text-left",
          fieldHeight,
          fieldPx,
          fieldText,
          fieldRadius,
          "border outline-none transition-colors duration-150",
          hasError
            ? "border-[#B3261E] focus:ring-2 focus:ring-[#B3261E]/30"
            : "border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E]",
          "bg-white disabled:opacity-50 disabled:cursor-not-allowed",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Calendar
          className={`${isSmall ? "w-3.5 h-3.5" : "w-4 h-4"} text-[#8F5A4E] shrink-0`}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span className={displayValue ? "text-[#0F3040]" : "text-slate-400"}>
          {displayValue || placeholder}
        </span>
      </button>

      {/* ── Popover ── */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pilih tanggal lahir"
          className={[
            "absolute z-50 top-full mt-1.5 left-0",
            "bg-white rounded-[18px] border border-[#E2E8F0] shadow-xl",
            "w-[300px] p-4 overflow-hidden",
            "animate-in fade-in zoom-in-95 duration-150",
          ].join(" ")}
          style={{ transformOrigin: "top left" }}
        >
          {/* ── STEP 1: Tahun ── */}
          {step === "year" && (
            <div>
              <p className="text-xs font-bold text-[#0F3040] mb-2">
                Pilih Tahun
              </p>

              {/* Input cepat ketik tahun */}
              <input
                ref={yearInputRef}
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={yearInput}
                onChange={(e) =>
                  setYearInput(e.target.value.replace(/\D/g, ""))
                }
                placeholder="Ketik tahun (mis. 1985)"
                className="w-full h-8 px-3 rounded-[10px] border border-[#E2E8F0] text-xs outline-none focus:border-[#8F5A4E] mb-2"
              />

              {/* Grid tahun */}
              <div
                ref={yearGridRef}
                className="max-h-[220px] overflow-y-auto overflow-x-hidden grid grid-cols-4 gap-1.5 pr-0.5"
              >
                {filteredYears.length === 0 && (
                  <p className="col-span-4 text-center text-xs text-slate-400 py-4">
                    Tahun tidak ditemukan
                  </p>
                )}
                {filteredYears.map((y) => {
                  const isCurrentYear = y === CURRENT_YEAR;
                  const isSelected = y === pickedYear;
                  return (
                    <button
                      key={y}
                      type="button"
                      data-selected={isSelected}
                      onClick={() => handleYearPick(y)}
                      className={[
                        "py-1.5 rounded-[8px] text-xs font-semibold transition-colors duration-100",
                        isSelected
                          ? "bg-[#8F5A4E] text-white"
                          : isCurrentYear
                          ? "bg-[#FAF5F2] text-[#8F5A4E] border border-[#8F5A4E]/30"
                          : "text-[#0F3040] hover:bg-[#EBF2F6]",
                      ].join(" ")}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 2: Bulan ── */}
          {step === "month" && pickedYear && (
            <div>
              {/* Header dengan tombol kembali */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setStep("year")}
                  className="p-1 rounded-full hover:bg-[#EBF2F6] text-[#0F3040] transition-colors"
                  aria-label="Kembali ke pilih tahun"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <p className="text-xs font-bold text-[#0F3040]">
                  Pilih Bulan — {pickedYear}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {BULAN_LABELS.map((label, idx) => {
                  const monthNum = idx + 1;
                  const isSelected =
                    monthNum === pickedMonth &&
                    pickedYear === parsed?.year;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleMonthPick(monthNum)}
                      className={[
                        "py-2 rounded-[10px] text-xs font-semibold transition-colors duration-100",
                        isSelected
                          ? "bg-[#8F5A4E] text-white"
                          : "text-[#0F3040] hover:bg-[#EBF2F6]",
                      ].join(" ")}
                    >
                      {label.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 3: Hari ── */}
          {step === "day" && pickedYear && pickedMonth && (
            <div>
              {/* Header dengan tombol kembali */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setStep("month")}
                  className="p-1 rounded-full hover:bg-[#EBF2F6] text-[#0F3040] transition-colors"
                  aria-label="Kembali ke pilih bulan"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <p className="text-xs font-bold text-[#0F3040]">
                  {BULAN_LABELS[pickedMonth - 1]} {pickedYear}
                </p>
              </div>

              {/* Header hari minggu */}
              <div className="grid grid-cols-7 mb-1">
                {HARI_LABELS.map((h) => (
                  <div
                    key={h}
                    className="text-center text-[10px] font-bold text-slate-400 py-1"
                  >
                    {h}
                  </div>
                ))}
              </div>

              {/* Grid tanggal */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {calendarCells?.map((cell, i) => {
                  if (cell === null) {
                    return <div key={`e-${i}`} />;
                  }
                  const isSelected =
                    parsed?.year === pickedYear &&
                    parsed?.month === pickedMonth &&
                    parsed?.day === cell;
                  return (
                    <button
                      key={cell}
                      type="button"
                      onClick={() => handleDayPick(cell)}
                      className={[
                        "aspect-square flex items-center justify-center rounded-full text-xs font-medium transition-colors duration-100",
                        isSelected
                          ? "bg-[#8F5A4E] text-white font-bold"
                          : "text-[#0F3040] hover:bg-[#EBF2F6]",
                      ].join(" ")}
                    >
                      {cell}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
