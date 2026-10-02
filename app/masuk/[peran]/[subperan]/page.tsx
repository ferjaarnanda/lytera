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
  Loader2,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { Logo } from "@/components/Logo";
import {
  isValidRole,
  isValidSubRole,
  getRoleMeta,
  getSubRoleMeta,
  RoleId,
} from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";

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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  if (!valid || !roleMeta || !subRoleMeta) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${peran === "verifikator" ? "bg-[#FAF5F2]" : ""}`}>
        <p className="text-sm text-[#464858]">Memuat formulir...</p>
      </div>
    );
  }

  const handleMasuk = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim()) {
      setErrorMsg("Masukkan alamat email Anda");
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

      // Berhasil — arahkan ke portal sesuai peran
      router.push(`/portal/${peran}/${subperan}`);
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen text-[#464858] pb-16 ${peran === "verifikator" ? "bg-[#FAF5F2]" : ""}`} data-portal-wallpaper={peran !== "verifikator" ? "true" : undefined}>
      {/* Top Navigation: Logo kiri, BackButton kanan */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex items-center justify-between">
        <Logo tone={peran === "verifikator" ? "light" : "dark"} size="sm" />
        <BackButton href="/" label="Kembali ke Beranda" />
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

          {/* Form */}
          <form onSubmit={handleMasuk} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor={`email-${peran}`}
                className="block text-sm font-semibold text-[#0F3040] mb-1.5"
              >
                {peran === "pasien" ? "Alamat Email" : "Email Resmi"}
              </label>
              <input
                id={`email-${peran}`}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  peran === "pasien"
                    ? "nama@email.com"
                    : peran === "fasilitas"
                    ? "nama@faskes.id"
                    : "nama@instansi.go.id"
                }
                className="w-full h-12 px-4 rounded-[14px] border border-[#E2E8F0] focus:ring-2 focus:ring-[#8F5A4E]/30 focus:border-[#8F5A4E] outline-none text-sm bg-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor={`password-${peran}`}
                  className="text-sm font-semibold text-[#0F3040]"
                >
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() =>
                    alert(
                      peran === "pasien"
                        ? "Hubungi administrator Lytera untuk atur ulang kata sandi."
                        : peran === "fasilitas"
                        ? "Fitur lupa kata sandi: Hubungi administrator faskes Anda."
                        : "Hubungi administrator Dinas Kominfo / Dinas Kesehatan daerah."
                    )
                  }
                  className="text-xs text-[#8F5A4E] hover:underline"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <input
                id={`password-${peran}`}
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
                className="w-full h-12 rounded-[14px] font-semibold text-sm bg-[#8F5A4E] text-white hover:bg-[#A56F63] active:bg-[#7B4B40] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
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
