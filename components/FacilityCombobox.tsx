"use client";

import React, { useState, useEffect, useRef, useId, useCallback } from "react";
import { Search, Loader2, Check, X, ChevronDown, Building2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatFacilityLocation } from "@/lib/region-utils";

export interface ActiveFacility {
  id: string;
  name: string;
  type: string;
  city: string | null;
  district: string | null;
}

interface FacilityComboboxProps {
  id?: string;
  subperan?: string;
  value: string; // facility_id (UUID)
  selectedName?: string;
  onChange: (facilityId: string, facility: ActiveFacility | null) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const TYPE_LABELS: Record<string, string> = {
  puskesmas: "Puskesmas",
  klinik: "Klinik",
  rumah_sakit: "Rumah Sakit",
  apotek: "Apotek",
};

export const FacilityCombobox: React.FC<FacilityComboboxProps> = ({
  id,
  subperan,
  value,
  selectedName = "",
  onChange,
  error,
  required = false,
  disabled = false,
  placeholder = "Ketik untuk mencari fasilitas kesehatan aktif...",
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const listboxId = `${inputId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(selectedName);
  const [facilities, setFacilities] = useState<ActiveFacility[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<ActiveFacility | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Map subperan URL to p_type expected by list_active_facilities RPC
  const getMappedType = useCallback((): "puskesmas" | "klinik" | "rumah_sakit" | "apotek" | null => {
    if (!subperan) return null;
    const sp = subperan.toLowerCase();
    if (sp === "puskesmas") return "puskesmas";
    if (sp === "klinik") return "klinik";
    if (sp === "rumah-sakit" || sp === "rumah_sakit") return "rumah_sakit";
    if (sp === "apotek") return "apotek";
    return null;
  }, [subperan]);

  // Fetch active facilities from Supabase RPC
  const fetchFacilities = useCallback(
    async (queryText: string) => {
      setLoading(true);
      setFetchError(null);
      try {
        const supabase = createClient();
        const pType = getMappedType();
        const pQuery = queryText.trim() ? queryText.trim() : null;

        const { data, error: rpcError } = await supabase.rpc("list_active_facilities", {
          p_type: pType,
          p_query: pQuery,
          p_limit: 30,
        });

        if (rpcError) {
          console.error("Gagal memuat fasilitas aktif (RPC):", rpcError);
          setFetchError("Gagal memuat fasilitas aktif, periksa koneksi internet");
          setFacilities([]);
        } else {
          const list = Array.isArray(data) ? (data as ActiveFacility[]) : [];
          setFacilities(list);

          // Jika value sudah ada tapi belum ada objek selectedFacility, cari di daftar
          if (value && !selectedFacility) {
            const found = list.find((f) => f.id === value);
            if (found) {
              setSelectedFacility(found);
              setSearchTerm(found.name);
            }
          }
        }
      } catch (err) {
        console.error("Kesalahan jaringan saat memuat fasilitas:", err);
        setFetchError("Gagal memuat fasilitas aktif, periksa koneksi internet");
        setFacilities([]);
      } finally {
        setLoading(false);
      }
    },
    [getMappedType, value, selectedFacility]
  );

  // Debounced search saat searchTerm berubah
  useEffect(() => {
    if (!isOpen && value && searchTerm === selectedName) {
      return;
    }

    const timer = setTimeout(() => {
      // Jika searchTerm sama dengan nama fasilitas yang sedang terpilih, cari dengan query kosong
      const q = selectedFacility && searchTerm === selectedFacility.name ? "" : searchTerm;
      fetchFacilities(q);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, isOpen, value, selectedName, selectedFacility, fetchFacilities]);

  // Sinkronisasi state saat prop selectedName berubah
  const [prevSelectedName, setPrevSelectedName] = useState(selectedName);
  if (prevSelectedName !== selectedName) {
    setPrevSelectedName(selectedName);
    if (!isOpen) {
      setSearchTerm(selectedName || "");
    }
  }

  // Tutup dropdown saat klik di luar container
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (selectedFacility) {
          setSearchTerm(selectedFacility.name);
        } else if (!value) {
          setSearchTerm("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedFacility, value]);

  const handleSelect = (fac: ActiveFacility) => {
    setSelectedFacility(fac);
    setSearchTerm(fac.name);
    setIsOpen(false);
    onChange(fac.id, fac);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedFacility(null);
    setSearchTerm("");
    onChange("", null);
    inputRef.current?.focus();
    fetchFacilities("");
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={listboxId}
          disabled={disabled}
          required={required}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              if (facilities.length === 0) {
                fetchFacilities("");
              }
              setTimeout(() => inputRef.current?.select(), 10);
            }
          }}
          placeholder={disabled ? "Fasilitas tidak dapat dipilih" : placeholder}
          className={`w-full h-12 pl-10 pr-16 rounded-[14px] border text-sm transition-colors outline-none ${
            disabled
              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed select-none"
              : error || fetchError
              ? "bg-white border-[#B3261E] text-[#0F3040] focus:ring-2 focus:ring-[#B3261E]/20"
              : "bg-white border-[#E2E8F0] text-[#0F3040] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E]"
          }`}
        />

        {/* Icon kiri */}
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Building2 className="w-4 h-4 text-[#8F5A4E]" />
        </div>

        {/* Action icons kanan */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-[#8F5A4E] shrink-0" />}

          {!disabled && (value || searchTerm) && !loading && (
            <button
              type="button"
              onClick={handleClear}
              title="Hapus pilihan faskes"
              className="p-1 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                const nextOpen = !isOpen;
                setIsOpen(nextOpen);
                if (nextOpen) {
                  inputRef.current?.focus();
                  if (facilities.length === 0) fetchFacilities(searchTerm);
                }
              }
            }}
            className="p-1 hover:text-[#0F3040] transition-colors"
            aria-label="Buka daftar fasilitas"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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

      {/* Dropdown Options */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-[16px] shadow-lg border border-[#E2E8F0] overflow-hidden animate-in fade-in duration-150">
          <ul
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            className="max-h-60 overflow-y-auto overflow-x-hidden p-1.5 divide-y divide-slate-50 text-xs sm:text-sm"
          >
            {loading && facilities.length === 0 ? (
              <li className="p-4 text-center text-xs text-slate-400 select-none flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#8F5A4E]" />
                <span>Mencari fasilitas kesehatan aktif...</span>
              </li>
            ) : fetchError ? (
              <li className="p-3 text-center text-xs text-[#B3261E] select-none flex flex-col items-center gap-1.5">
                <span>{fetchError}</span>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => fetchFacilities(searchTerm)}
                  className="text-xs font-semibold text-[#8F5A4E] underline hover:text-[#A56F63]"
                >
                  Coba lagi
                </button>
              </li>
            ) : facilities.length === 0 ? (
              <li className="p-4 text-center text-xs text-slate-500 select-none">
                <Search className="w-4 h-4 mx-auto mb-1.5 opacity-40 text-slate-400" />
                <p className="font-semibold text-slate-700">Tidak ada fasilitas aktif yang cocok</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {subperan
                    ? `Belum ada ${TYPE_LABELS[getMappedType() || ""] || "fasilitas"} berstatus aktif dengan kata kunci ini`
                    : "Coba kata kunci lain atau hubungi admin fasilitas Anda"}
                </p>
              </li>
            ) : (
              facilities.map((fac) => {
                const isSelected = fac.id === value;
                const typeLabel = TYPE_LABELS[fac.type] || fac.type;
                const locationStr = formatFacilityLocation({ district: fac.district, city: fac.city }) || null;

                return (
                  <li
                    key={fac.id}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(fac)}
                    className={`px-3.5 py-2.5 rounded-[10px] cursor-pointer flex items-center justify-between transition-colors select-none ${
                      isSelected
                        ? "bg-[#EDF7F2] text-[#1B6B4D] font-semibold"
                        : "text-[#464858] hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#0F3040] truncate">{fac.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EBF2F6] text-[#0F3040] uppercase tracking-wider shrink-0">
                          {typeLabel}
                        </span>
                      </div>
                      {locationStr && (
                        <span className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {locationStr}
                        </span>
                      )}
                    </div>
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
