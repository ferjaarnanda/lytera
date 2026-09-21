"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  UserRound,
  Hospital,
  ShieldCheck,
  Landmark,
  ArrowRight,
  ArrowLeft,
  X,
  Building2,
  BriefcaseMedical,
  Users,
  Stethoscope,
  Pill,
} from "lucide-react";
import { ROLES, RoleId, SubRoleId } from "@/lib/roles";

export interface RolePickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "masuk" | "daftar";
  initialRole?: RoleId | null;
}

export const RolePickerDialog: React.FC<RolePickerDialogProps> = ({
  isOpen,
  onClose,
  mode = "masuk",
  initialRole = null,
}) => {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(initialRole);
  const [prevProps, setPrevProps] = useState({ isOpen, initialRole });

  // Sinkronisasi selectedRole saat prop isOpen atau initialRole berganti (pola resmi React tanpa useEffect)
  if (prevProps.isOpen !== isOpen || prevProps.initialRole !== initialRole) {
    setPrevProps({ isOpen, initialRole });
    if (isOpen) {
      setSelectedRole(initialRole);
    }
  }

  // Handle ESC key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus dialog on open
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  const handleSelectRole = useCallback(
    (roleId: RoleId) => {
      if (roleId === "dinkes") {
        onClose();
        router.push("/masuk/dinkes");
        return;
      }

      setSelectedRole(roleId);
    },
    [router, onClose]
  );

  const handleSelectSubRole = useCallback(
    (subId: SubRoleId) => {
      if (!selectedRole) return;
      onClose();
      const path =
        mode === "daftar"
          ? `/daftar/${selectedRole}/${subId}`
          : `/masuk/${selectedRole}/${subId}`;
      router.push(path);
    },
    [selectedRole, mode, router, onClose]
  );

  if (!isOpen) return null;

  // Ikon peran utama
  const getRoleIcon = (roleId: RoleId) => {
    switch (roleId) {
      case "pasien":
        return <UserRound className="w-6 h-6 text-[#0A2230]" strokeWidth={1.75} />;
      case "fasilitas":
        return <Hospital className="w-6 h-6 text-[#0A2230]" strokeWidth={1.75} />;
      case "verifikator":
        return <ShieldCheck className="w-6 h-6 text-[#0A2230]" strokeWidth={1.75} />;
      case "dinkes":
        return <Landmark className="w-6 h-6 text-[#0A2230]" strokeWidth={1.75} />;
    }
  };

  // Ikon sub-peran
  const getSubRoleIcon = (subId: SubRoleId) => {
    switch (subId) {
      case "pribadi":
        return <UserRound className="w-6 h-6 text-[#8F5A4E]" strokeWidth={1.75} />;
      case "keluarga":
        return <Users className="w-6 h-6 text-[#8F5A4E]" strokeWidth={1.75} />;
      case "puskesmas":
        return <BriefcaseMedical className="w-6 h-6 text-[#8F5A4E]" strokeWidth={1.75} />;
      case "klinik":
        return <Stethoscope className="w-6 h-6 text-[#8F5A4E]" strokeWidth={1.75} />;
      case "rumah-sakit":
        return <Building2 className="w-6 h-6 text-[#8F5A4E]" strokeWidth={1.75} />;
      case "apotek":
        return <Pill className="w-6 h-6 text-[#8F5A4E]" strokeWidth={1.75} />;
      case "kelurahan":
      case "kecamatan":
      case "dinas-sosial":
        return <ShieldCheck className="w-6 h-6 text-[#8F5A4E]" strokeWidth={1.75} />;
      default:
        return <ArrowRight className="w-6 h-6 text-[#8F5A4E]" strokeWidth={1.75} />;
    }
  };

  const isSubStep = selectedRole !== null && selectedRole !== "dinkes";
  const currentRoleMeta = selectedRole ? ROLES[selectedRole] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A2230]/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-picker-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-[620px] bg-white rounded-[24px] p-6 sm:p-8 shadow-2xl border border-[#E2E8F0] relative transform transition-all animate-in zoom-in-95 duration-200 outline-none"
      >
        {/* Tombol Tutup X */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-[#0A2230] hover:bg-[#FAF5F2] transition-colors"
          aria-label="Tutup dialog"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>

        {/* HEADER DIALOG */}
        <div className="mb-6 text-left">
          {isSubStep && !initialRole && (
            <button
              onClick={() => setSelectedRole(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8F5A4E] hover:text-[#A56F63] mb-3 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke pilihan peran
            </button>
          )}

          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8F5A4E]">
              {mode === "daftar" ? "Pendaftaran Akun" : "Masuk ke Akun"}
            </span>
          </div>

          <h2
            id="role-picker-title"
            className="text-2xl font-extrabold text-[#0A2230] tracking-tight"
          >
            {isSubStep
              ? `${mode === "daftar" ? "Daftar" : "Masuk"} sebagai apa di ${currentRoleMeta?.name}?`
              : `${mode === "daftar" ? "Daftar" : "Masuk"} sebagai apa?`}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {isSubStep
              ? "Pilih kategori yang sesuai untuk diarahkan ke alur yang tepat."
              : "Pilih peranmu untuk masuk ke ruang kerja yang dirancang khusus."}
          </p>
        </div>

        {/* LANGKAH 1: PILIH 4 PERAN UTAMA */}
        {!isSubStep && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {(Object.keys(ROLES) as RoleId[]).map((roleKey) => {
              const role = ROLES[roleKey];
              return (
                <button
                  key={role.id}
                  onClick={() => handleSelectRole(role.id)}
                  className="group flex flex-col p-4 rounded-[20px] bg-[#FAF5F2] border border-[#E2E8F0] hover:border-[#8F5A4E]/35 text-left transition-all duration-[220ms] ease-out hover:-translate-y-1 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8F5A4E]"
                >
                  <div className="flex items-center justify-between w-full mb-2.5">
                    <div className="w-11 h-11 rounded-[14px] bg-white border border-[#E2E8F0] flex items-center justify-center transition-transform duration-[220ms] group-hover:scale-[1.06]">
                      {getRoleIcon(role.id)}
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#8F5A4E] group-hover:translate-x-1 transition-all duration-[220ms]" />
                  </div>
                  <h3 className="text-[16px] font-bold text-[#0A2230] mb-0.5">
                    {role.name}
                  </h3>
                  <p className="text-[12px] text-slate-500 line-clamp-2">
                    {role.description}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* LANGKAH 2: PILIH SUB-PERAN */}
        {isSubStep && currentRoleMeta && (
          <div className="flex flex-col gap-3">
            {currentRoleMeta.subRoles.map((sub) => (
              <button
                key={sub.id}
                onClick={() => handleSelectSubRole(sub.id)}
                className="group flex items-center justify-between p-4 rounded-[18px] bg-[#FAF5F2] border border-[#E2E8F0] hover:border-[#8F5A4E]/35 text-left transition-all duration-[220ms] ease-out hover:-translate-y-1 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8F5A4E]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-[14px] bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0 transition-transform duration-[220ms] group-hover:scale-[1.06]">
                    {getSubRoleIcon(sub.id)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-bold text-[#0A2230] truncate">
                      {sub.name}
                    </h3>
                    <p className="text-[12px] text-slate-500 truncate">
                      {sub.description}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#8F5A4E] group-hover:translate-x-1 transition-all duration-[220ms] shrink-0 ml-3" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
