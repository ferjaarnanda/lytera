"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Building2,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { Logo } from "@/components/Logo";
import { OtpInput } from "@/components/OtpInput";
import {
  isValidRole,
  isValidSubRole,
  getRoleMeta,
  getSubRoleMeta,
  RoleId,
} from "@/lib/roles";

interface PageProps {
  params: Promise<{
    peran: string;
    subperan: string;
  }>;
}

export default function MasukPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { peran, subperan } = resolvedParams;

  const valid = isValidRole(peran) && isValidSubRole(peran as RoleId, subperan);

  useEffect(() => {
    if (!valid) {
      router.replace("/");
    }
  }, [valid, router]);

  const roleMeta = getRoleMeta(peran);
  const subRoleMeta = getSubRoleMeta(peran, subperan);

  // Form states
  const [nikOrKk, setNikOrKk] = useState("");
  const [otp, setOtp] = useState("");
  const [emailOrId, setEmailOrId] = useState("");
  const [nip, setNip] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  if (!valid || !roleMeta || !subRoleMeta) {
    return (
      <div className="min-h-screen bg-[#FAF5F2] flex items-center justify-center p-4">
        <p className="text-sm text-[#464858]">Memuat formulir...</p>
      </div>
    );
  }

  const handleKirimOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{16}$/.test(nikOrKk)) {
      setErrorMsg("Masukkan 16 digit NIK atau Nomor Kartu Keluarga yang terdaftar");
      return;
    }
    setErrorMsg("");
    setOtpSent(true);
  };

  const handleMasuk = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (peran === "pasien") {
      if (otp !== "123456") {
        setErrorMsg("Kode OTP salah. Masukkan kode demo: 123456");
        return;
      }
    } else if (peran === "fasilitas") {
      if (!emailOrId.trim()) {
        setErrorMsg("Masukkan email atau ID faskes yang terdaftar");
        return;
      }
      if (password.length < 6) {
        setErrorMsg("Kata sandi minimal 6 karakter");
        return;
      }
    } else if (peran === "verifikator") {
      if (!/^\d{18}$/.test(nip)) {
        setErrorMsg("NIP harus 18 digit angka");
        return;
      }
      if (password.length < 6) {
        setErrorMsg("Kata sandi minimal 6 karakter");
        return;
      }
    }

    // Submit simulation -> redirect to portal
    router.push(`/portal/${peran}/${subperan}`);
  };

  return (
    <div className="min-h-screen bg-[#FAF5F2] text-[#464858] pb-16">
      {/* Top Navigation */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex items-center justify-between">
        <BackButton href="/" label="← Kembali ke Beranda" />
        <Link href="/" className="flex items-center gap-2 group" aria-label="Beranda Lytera">
          <Logo tone="light" />
        </Link>
      </div>

      {/* Main Login Card */}
      <main className="max-w-[520px] mx-auto px-4 sm:px-6 mt-8 sm:mt-12">
        <div className="bg-white rounded-[24px] shadow-sm border border-[#E2E8F0] p-6 sm:p-10">
          {/* Badge & Title */}
          <div className="text-center pb-6 border-b border-[#E2E8F0]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF2F6] text-[#0F3040] mb-3">
              {peran === "pasien" && <User className="w-3.5 h-3.5 text-[#8F5A4E]" />}
              {peran === "fasilitas" && <Building2 className="w-3.5 h-3.5 text-[#8F5A4E]" />}
              {peran === "verifikator" && <ShieldCheck className="w-3.5 h-3.5 text-[#8F5A4E]" />}
              <span>{roleMeta.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-[#0F3040] tracking-tight">
              Masuk Portal {subRoleMeta.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#464858]/80 mt-1">
              Akses rekam medis dan sistem rujukan terintegrasi Lytera.
            </p>
          </div>

          {errorMsg && (
            <div className="mt-5 p-3.5 rounded-[14px] bg-[#FDECEA] border border-[#B3261E]/20 text-[#B3261E] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={peran === "pasien" && !otpSent ? handleKirimOtp : handleMasuk} className="mt-6 space-y-4">
            {peran === "pasien" ? (
              <>
                <div>
                  <label htmlFor="nikOrKk" className="block text-sm font-semibold text-[#0F3040] mb-1.5">
                    {subperan === "keluarga" ? "Nomor Kartu Keluarga (KK)" : "Nomor Induk Kependudukan (NIK)"}
                  </label>
                  <input
                    id="nikOrKk"
                    type="text"
                    maxLength={16}
                    value={nikOrKk}
                    disabled={otpSent}
                    onChange={(e) => setNikOrKk(e.target.value.replace(/\D/g, ""))}
                    placeholder="16 digit angka"
                    className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none tabular-nums text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Kode verifikasi satu kali pakai (OTP) akan dikirimkan ke nomor HP terdaftar.
                  </p>
                </div>

                {otpSent && (
                  <div className="pt-2 animate-[fadeIn_0.3s_ease-out]">
                    <OtpInput
                      value={otp}
                      onChange={setOtp}
                      label="Kode Verifikasi OTP (6 Digit)"
                    />
                    <p className="text-xs text-[#8F5A4E] font-medium mt-2">
                      💡 Kode demo untuk pengujian: <span className="font-bold">123456</span>
                    </p>
                  </div>
                )}

                <div className="pt-4">
                  {!otpSent ? (
                    <button
                      type="submit"
                      className="w-full h-12 rounded-[14px] font-semibold text-sm bg-[#8F5A4E] text-white hover:bg-[#A56F63] active:bg-[#7B4B40] transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <span>Kirim Kode OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="w-full h-12 rounded-[14px] font-semibold text-sm bg-[#8F5A4E] text-white hover:bg-[#A56F63] active:bg-[#7B4B40] transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <span>Masuk ke Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </>
            ) : peran === "fasilitas" ? (
              <>
                <div>
                  <label htmlFor="emailOrId" className="block text-sm font-semibold text-[#0F3040] mb-1.5">
                    Email Resmi atau ID Petugas Faskes
                  </label>
                  <input
                    id="emailOrId"
                    type="text"
                    value={emailOrId}
                    onChange={(e) => setEmailOrId(e.target.value)}
                    placeholder="nama@faskes.id"
                    className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="passwordFaskes" className="text-sm font-semibold text-[#0F3040]">
                      Kata Sandi
                    </label>
                    <button
                      type="button"
                      onClick={() => alert("Fitur lupa kata sandi: Hubungi administrator faskes Anda.")}
                      className="text-xs text-[#8F5A4E] hover:underline"
                    >
                      Lupa kata sandi?
                    </button>
                  </div>
                  <input
                    id="passwordFaskes"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full h-12 rounded-[14px] font-semibold text-sm bg-[#8F5A4E] text-white hover:bg-[#A56F63] active:bg-[#7B4B40] transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>Masuk ke Portal Faskes</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Verifikator */}
                <div>
                  <label htmlFor="nipVerif" className="block text-sm font-semibold text-[#0F3040] mb-1.5">
                    Nomor Induk Pegawai (NIP 18 Digit)
                  </label>
                  <input
                    id="nipVerif"
                    type="text"
                    maxLength={18}
                    value={nip}
                    onChange={(e) => setNip(e.target.value.replace(/\D/g, ""))}
                    placeholder="198701012010011001"
                    className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none tabular-nums text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="passwordVerif" className="text-sm font-semibold text-[#0F3040]">
                      Kata Sandi
                    </label>
                    <button
                      type="button"
                      onClick={() => alert("Hubungi administrator Dinas Kominfo / Dinas Kesehatan daerah.")}
                      className="text-xs text-[#8F5A4E] hover:underline"
                    >
                      Lupa kata sandi?
                    </button>
                  </div>
                  <input
                    id="passwordVerif"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full h-12 rounded-[14px] font-semibold text-sm bg-[#8F5A4E] text-white hover:bg-[#A56F63] active:bg-[#7B4B40] transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>Masuk ke Portal Verifikator</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </form>

          {/* Footer Register Link */}
          <div className="mt-8 pt-6 border-t border-[#E2E8F0] text-center text-xs text-[#464858]">
            <span>Belum memiliki akun {subRoleMeta.name}? </span>
            <Link
              href={`/daftar/${peran}/${subperan}`}
              className="font-semibold text-[#8F5A4E] hover:underline"
            >
              Daftar di sini
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
