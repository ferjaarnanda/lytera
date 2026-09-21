"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Landmark, ArrowRight, AlertCircle, ShieldAlert } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { Logo } from "@/components/Logo";
import { OtpInput } from "@/components/OtpInput";

export default function MasukDinkesPage() {
  const router = useRouter();

  const [accountId, setAccountId] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleMasuk = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!accountId.trim()) {
      setErrorMsg("Masukkan ID Petugas atau Email Dinas Kesehatan");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Kata sandi minimal 6 karakter");
      return;
    }
    if (otp !== "123456") {
      setErrorMsg("Kode keamanan OTP salah. Masukkan kode demo: 123456");
      return;
    }

    // Submit simulation -> redirect to portal dinkes
    router.push("/portal/dinkes");
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
              <Landmark className="w-3.5 h-3.5 text-[#8F5A4E]" />
              <span>Regulator & Pengawas</span>
            </div>
            <h1 className="text-2xl font-bold text-[#0F3040] tracking-tight">
              Portal Dinas Kesehatan
            </h1>
            <p className="text-xs sm:text-sm text-[#464858]/80 mt-1">
              Monitoring rujukan kota/kabupaten dan verifikasi legalitas fasilitas kesehatan.
            </p>
          </div>

          <div className="mt-4 p-3 rounded-[14px] bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#0F3040] shrink-0" />
            <span>
              Akses terbatas untuk administrator dan pejabat Dinas Kesehatan berwenang.
            </span>
          </div>

          {errorMsg && (
            <div className="mt-4 p-3.5 rounded-[14px] bg-[#FDECEA] border border-[#B3261E]/20 text-[#B3261E] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleMasuk} className="mt-6 space-y-4">
            <div>
              <label htmlFor="accountId" className="block text-sm font-semibold text-[#0F3040] mb-1.5">
                ID Petugas / Email Dinas Kesehatan
              </label>
              <input
                id="accountId"
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="dinkes.semarang@jatengprov.go.id"
                className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
              />
            </div>

            <div>
              <label htmlFor="passwordDinkes" className="block text-sm font-semibold text-[#0F3040] mb-1.5">
                Kata Sandi
              </label>
              <input
                id="passwordDinkes"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm"
              />
            </div>

            <div className="pt-2">
              <OtpInput
                value={otp}
                onChange={setOtp}
                label="Kode Keamanan 2FA (OTP)"
              />
              <p className="text-xs text-[#8F5A4E] font-medium mt-2">
                💡 Kode demo 2FA: <span className="font-bold">123456</span>
              </p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full h-12 rounded-[14px] font-semibold text-sm bg-[#0F3040] text-white hover:bg-[#0A2230] active:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Masuk ke Dashboard Dinkes</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Note */}
          <div className="mt-8 pt-6 border-t border-[#E2E8F0] text-center text-xs text-slate-400">
            Pendaftaran akun Dinkes dilakukan secara terpusat oleh Kementerian Kesehatan RI.
          </div>
        </div>
      </main>
    </div>
  );
}
