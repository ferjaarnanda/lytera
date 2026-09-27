"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, ArrowRight, AlertCircle, ShieldAlert, Loader2 } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function MasukDinkesPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleMasuk = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim()) {
      setErrorMsg("Masukkan Email Dinas Kesehatan");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg("Format email tidak valid");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Kata sandi minimal 6 karakter");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("invalid login") ||
          error.message.toLowerCase().includes("invalid credentials") ||
          error.message.toLowerCase().includes("invalid email or password")
        ) {
          setErrorMsg("Email atau kata sandi salah. Silakan coba lagi.");
        } else if (error.message.toLowerCase().includes("email not confirmed")) {
          setErrorMsg(
            "Email belum dikonfirmasi. Periksa kotak masuk Anda dan klik tautan verifikasi."
          );
        } else if (error.message.toLowerCase().includes("too many requests")) {
          setErrorMsg(
            "Terlalu banyak percobaan masuk. Tunggu beberapa menit lalu coba lagi."
          );
        } else {
          setErrorMsg("Gagal masuk: " + error.message);
        }
        return;
      }

      // Berhasil — arahkan ke portal dinkes
      router.push("/portal/dinkes");
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF5F2] text-[#464858] pb-16">
      {/* Top Navigation: Logo kiri, BackButton kanan */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex items-center justify-between">
        <Logo tone="light" size="sm" />
        <BackButton href="/" label="Kembali ke Beranda" />
      </div>

      {/* Main Login Card */}
      <main className="max-w-[520px] mx-auto px-4 sm:px-6 mt-8 sm:mt-12">
        <div className="bg-white rounded-[24px] shadow-sm border border-[#E2E8F0] p-6 sm:p-10">
          {/* Badge & Title */}
          <div className="text-center pb-6 border-b border-[#E2E8F0]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF2F6] text-[#0F3040] mb-3">
              <Landmark className="w-3.5 h-3.5 text-[#8F5A4E]" />
              <span>Regulator &amp; Pengawas</span>
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

          {/* Form */}
          <form onSubmit={handleMasuk} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="emailDinkes"
                className="block text-sm font-semibold text-[#0F3040] mb-1.5"
              >
                Email Dinas Kesehatan
              </label>
              <input
                id="emailDinkes"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dinkes.semarang@jatengprov.go.id"
                className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm bg-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="passwordDinkes"
                  className="text-sm font-semibold text-[#0F3040]"
                >
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() =>
                    alert("Hubungi administrator Dinas Kominfo / Dinas Kesehatan daerah.")
                  }
                  className="text-xs text-[#8F5A4E] hover:underline"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <input
                id="passwordDinkes"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm bg-white"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-[14px] font-semibold text-sm bg-[#0F3040] text-white hover:bg-[#0A2230] active:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Dashboard Dinkes</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
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
