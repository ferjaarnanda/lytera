"use client";

import React, { useState, useRef, useEffect, useId, useMemo } from "react";
import { ChevronDown, Check, X, Search, Loader2, AlertCircle } from "lucide-react";

export interface RegionItem {
  code: string;
  name: string;
}

export interface RegionComboboxProps {
  id?: string;
  label?: string;
  placeholder?: string;
  level?: "province" | "regency" | "district" | "village";
  parentCode?: string;
  options?: (RegionItem | string)[];
  value: string;
  onChange: (selectedName: string, selectedItem?: RegionItem | null) => void;
  disabled?: boolean;
  disabledPlaceholder?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

export const RegionCombobox: React.FC<RegionComboboxProps> = ({
  id,
  label,
  placeholder = "Ketik untuk mencari...",
  level,
  parentCode,
  options,
  value,
  onChange,
  disabled = false,
  disabledPlaceholder = "Pilih wilayah tingkat atas terlebih dahulu",
  error,
  required = false,
  className = "",
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const listboxId = `${inputId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // State data async
  const [asyncItems, setAsyncItems] = useState<RegionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Fetch data per level dari proxy server Next.js (/api/wilayah/...)
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!level) return;
    if (level !== "province" && !parentCode) {
      Promise.resolve().then(() => setAsyncItems([]));
      return;
    }

    let url = "";
    if (level === "province") {
      url = "/api/wilayah/provinces";
    } else if (level === "regency" && parentCode) {
      url = `/api/wilayah/regencies/${encodeURIComponent(parentCode)}`;
    } else if (level === "district" && parentCode) {
      url = `/api/wilayah/districts/${encodeURIComponent(parentCode)}`;
    } else if (level === "village" && parentCode) {
      url = `/api/wilayah/villages/${encodeURIComponent(parentCode)}`;
    }

    if (!url) return;

    const controller = new AbortController();

    Promise.resolve()
      .then(() => {
        if (controller.signal.aborted) return;
        setLoading(true);
        setFetchError(null);
        return fetch(url, { signal: controller.signal });
      })
      .then((res) => {
        if (!res || controller.signal.aborted) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!json || controller.signal.aborted) return;
        const rawList: Array<{ code?: string; name: string }> = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
          ? json.data
          : [];

        const mapped: RegionItem[] = rawList
          .filter((item) => Boolean(item && item.name))
          .map((item) => ({
            code: item.code || item.name,
            name: item.name,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "id", { sensitivity: "base" }));

        setAsyncItems(mapped);
        setFetchError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error(`Gagal mengambil wilayah (${level}):`, err);
        setFetchError("Gagal memuat data wilayah, periksa koneksi internet");
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [level, parentCode, retryCount]);

  // Normalisasi opsi menjadi RegionItem[]
  const allItems: RegionItem[] = useMemo(() => {
    if (options && options.length > 0) {
      return options
        .map((opt) => (typeof opt === "string" ? { code: opt, name: opt } : opt))
        .sort((a, b) => a.name.localeCompare(b.name, "id", { sensitivity: "base" }));
    }
    if (level !== "province" && !parentCode) {
      return [];
    }
    return asyncItems;
  }, [options, asyncItems, level, parentCode]);

  // Filter opsi berdasarkan kata yang diketik (case-insensitive)
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) {
      return allItems;
    }
    if (value && searchTerm.trim().toLowerCase() === value.trim().toLowerCase()) {
      return allItems;
    }
    const q = searchTerm.toLowerCase().trim();
    return allItems.filter((opt) => opt.name.toLowerCase().includes(q));
  }, [allItems, searchTerm, value]);

  // Sinkronisasi state saat prop value berubah
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    if (!isOpen) {
      setSearchTerm(value || "");
    }
  }

  // Tutup dropdown saat klik di luar container
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm(value || "");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  // Gulir item keyboard yang disorot ke dalam view
  useEffect(() => {
    if (
      isOpen &&
      highlightedIndex >= 0 &&
      listboxRef.current &&
      listboxRef.current.children[highlightedIndex]
    ) {
      const el = listboxRef.current.children[highlightedIndex] as HTMLElement;
      el.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, isOpen]);

  // BAGIAN 2: Langsung tutup dropdown saat opsi diklik dan simpan nilai
  const handleSelect = (item: RegionItem) => {
    setIsOpen(false);
    setSearchTerm(item.name);
    setHighlightedIndex(-1);
    onChange(item.name, item);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
    onChange("", null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
        return;
      }
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex]);
      } else if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0]);
      }
    } else if (e.key === "Escape" || e.key === "Tab") {
      setIsOpen(false);
      setSearchTerm(value || "");
    }
  };

  const isFieldDisabled = disabled || (level !== "province" && !parentCode && !options?.length);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-[#0F3040] mb-1.5">
          {label} {required && <span className="text-[#B3261E]">*</span>}
        </label>
      )}

      {/* Input Box Combobox */}
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-haspopup="listbox"
          disabled={isFieldDisabled}
          value={isOpen ? searchTerm : value || ""}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            if (!isFieldDisabled) {
              setIsOpen(true);
              setSearchTerm(value || "");
              setTimeout(() => inputRef.current?.select(), 10);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={isFieldDisabled ? disabledPlaceholder : placeholder}
          className={`w-full h-12 pl-4 pr-16 rounded-[14px] border text-sm transition-colors outline-none ${
            isFieldDisabled
              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed select-none"
              : error || fetchError
              ? "bg-white border-[#B3261E] text-[#0F3040] focus:ring-2 focus:ring-[#B3261E]/20"
              : "bg-white border-[#E2E8F0] text-[#0F3040] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E]"
          }`}
        />

        {/* Action icons right */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400">
          {loading && (
            <Loader2 className="w-4 h-4 animate-spin text-[#8F5A4E] shrink-0" />
          )}

          {!isFieldDisabled && value && !loading && (
            <button
              type="button"
              onClick={handleClear}
              title="Hapus pilihan"
              className="p-1 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            disabled={isFieldDisabled}
            onClick={() => {
              if (!isFieldDisabled) {
                setIsOpen(!isOpen);
                if (!isOpen) {
                  inputRef.current?.focus();
                }
              }
            }}
            className="p-1 hover:text-[#0F3040] transition-colors"
            aria-label="Buka daftar pilihan"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-[#B3261E] mt-1">{error}</p>}
      {fetchError && !error && (
        <p className="text-xs text-[#B3261E] mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{fetchError}</span>
        </p>
      )}

      {/* BAGIAN 3: Dropdown Listbox (HANYA SATU ELEMEN listboxRef YANG overflow-y-auto) */}
      {isOpen && !isFieldDisabled && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-[16px] shadow-lg border border-[#E2E8F0] overflow-hidden animate-in fade-in duration-150">
          <ul
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            className="max-h-60 overflow-y-auto overflow-x-hidden p-1.5 divide-y divide-slate-50 text-xs sm:text-sm"
          >
            {loading ? (
              <li className="p-4 text-center text-xs text-slate-400 select-none flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#8F5A4E]" />
                <span>Memuat data wilayah...</span>
              </li>
            ) : fetchError ? (
              <li className="p-3 text-center text-xs text-[#B3261E] select-none flex flex-col items-center gap-1.5">
                <span>{fetchError}</span>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    setRetryCount((c) => c + 1);
                  }}
                  className="text-xs font-semibold text-[#8F5A4E] underline hover:text-[#A56F63]"
                >
                  Coba lagi
                </button>
              </li>
            ) : filteredOptions.length === 0 ? (
              <li className="p-3 text-center text-xs text-slate-400 select-none">
                <Search className="w-4 h-4 mx-auto mb-1 opacity-50" />
                <span>Tidak ada wilayah yang cocok</span>
              </li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.name.toLowerCase() === (value || "").toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={opt.code || opt.name}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3.5 py-2.5 rounded-[10px] cursor-pointer flex items-center justify-between transition-colors select-none ${
                      isSelected
                        ? "bg-[#EDF7F2] text-[#1B6B4D] font-semibold"
                        : isHighlighted
                        ? "bg-[#FAF5F2] text-[#0F3040]"
                        : "text-[#464858] hover:bg-slate-50"
                    }`}
                  >
                    <span>{opt.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#1B6B4D] shrink-0" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
