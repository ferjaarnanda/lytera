"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Clock, ShieldCheck, CheckCircle2, FileText } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { Logo } from "@/components/Logo";
import { StatusIcon } from "@/components/StatusIcon";

function SelesaiContent() {
  const searchParams = useSearchParams();
  const peran = searchParams.get("peran") || "pasien";
  const sub = searchParams.get("sub") || "pribadi";
  const tipe = searchParams.get("tipe");

  // Determine role status presentation
  const isPribadi = peran === "pasien" && sub === "pribadi";
  const isKeluarga = peran === "pasien" && sub === "keluarga";
  const isFaskesAdmin = peran === "fasilitas" && tipe === "admin";
  const isFaskesNakes = peran === "fasilitas" && tipe === "nakes";
  const isVerifikator = peran === "verifikator";

  // Dummy registration code
  const regNumber = "REG-LYT-2026-8941";

  return (
    <div className="bg-white rounded-[24px] shadow-sm border border-[#E2E8F0] p-6 sm:p-10 text-center">
      {/* Icon Status */}
      <div className="flex justify-center mb-5">
        {isPribadi ? (
          <StatusIcon status="selesai" size="xl" />
        ) : (
          <StatusIcon status="proses" size="xl" />
        )}
      </div>

      {/* Main Title & Status Badge */}
      {isPribadi && (
        <>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDF7F2] text-[#1B6B4D] mb-3">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Akun Siap Digunakan
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F3040] tracking-tight">
            Pendaftaran Berhasil!
          </h1>
          <p className="text-sm text-[#464858]/80 mt-2 max-w-md mx-auto">
            Identitas KTP Anda telah berhasil divalidasi. Anda kini dapat masuk menggunakan NIK dan kode verifikasi nomor HP Anda.
          </p>
        </>
      )}

      {isKeluarga && (
        <>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF4D6] text-[#7A5200] mb-3">
            <Clock className="w-3.5 h-3.5" />
            Dalam Pemeriksaan
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F3040] tracking-tight">
            Pendaftaran Pasien Keluarga Diajukan
          </h1>
          <p className="text-sm text-[#464858]/80 mt-2 max-w-md mx-auto">
            Berkas Kartu Keluarga (KK) Anda sedang ditinjau oleh tim verifikator untuk memastikan keabsahan perwalian data medis.
          </p>
        </>
      )}

      {isFaskesAdmin && (
        <>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF4D6] text-[#7A5200] mb-3">
            <Clock className="w-3.5 h-3.5" />
            Menunggu Verifikasi Dinkes
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F3040] tracking-tight">
            Pendaftaran Fasilitas Kesehatan Diajukan
          </h1>
          <p className="text-sm text-[#464858]/80 mt-2 max-w-md mx-auto">
            Izin operasional fasilitas Anda sedang divalidasi oleh Dinas Kesehatan Kota Semarang. Estimasi peninjauan 2–3 hari kerja.
          </p>
        </>
      )}

      {isFaskesNakes && (
        <>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF4D6] text-[#7A5200] mb-3">
            <Clock className="w-3.5 h-3.5" />
            Menunggu Persetujuan Faskes
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F3040] tracking-tight">
            Pendaftaran Tenaga Medis Diajukan
          </h1>
          <p className="text-sm text-[#464858]/80 mt-2 max-w-md mx-auto">
            Permohonan bergabung telah dikirimkan ke administrator fasilitas kesehatan penugasan Anda.
          </p>
        </>
      )}

      {isVerifikator && (
        <>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF4D6] text-[#7A5200] mb-3">
            <Clock className="w-3.5 h-3.5" />
            Verifikasi Administrator Daerah
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F3040] tracking-tight">
            Akun Petugas Verifikator Diajukan
          </h1>
          <p className="text-sm text-[#464858]/80 mt-2 max-w-md mx-auto">
            Surat tugas dan NIP Anda sedang dikonfirmasi oleh pengelola sistem wilayah Pemerintah Kota Semarang.
          </p>
        </>
      )}

      {/* Info Card: Registration Code */}
      <div className="mt-8 p-5 rounded-[18px] bg-[#FAF5F2] border border-[#E2E8F0] text-left">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Nomor Registrasi
          </span>
          <span className="text-sm font-bold text-[#0F3040] tabular-nums tracking-wide">
            {regNumber}
          </span>
        </div>
        <div className="flex items-start gap-2.5 text-xs text-[#464858]">
          <ShieldCheck className="w-4 h-4 text-[#8F5A4E] shrink-0 mt-0.5" />
          <span>
            Simpan nomor ini untuk keperluan konfirmasi pelayanan atau pengecekan status bantuan teknis.
          </span>
        </div>
      </div>

      {/* Next Steps List */}
      <div className="mt-6 text-left space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Tahapan Selanjutnya
        </h2>
        <div className="flex items-start gap-3 p-3.5 rounded-[14px] bg-slate-50 border border-slate-100">
          <FileText className="w-4 h-4 text-[#0F3040] shrink-0 mt-0.5" />
          <div className="text-xs text-[#0F3040]">
            <p className="font-semibold">
              {isPribadi
                ? "Mulai Rujukan Digital Pertama"
                : "Pemberitahuan Status via WhatsApp / Email"}
            </p>
            <p className="text-slate-500 mt-0.5">
              {isPribadi
                ? "Masuk ke portal pasien untuk melihat status fasilitas kesehatan dan token rekam medismu."
                : "Notifikasi akan dikirimkan segera setelah peninjauan dokumen resmi selesai."}
            </p>
          </div>
        </div>
      </div>

      {/* Action CTA */}
      <div className="mt-8 pt-6 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-center gap-3">
        {isPribadi ? (
          <Link
            href={`/masuk/pasien/pribadi`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-[14px] text-sm font-semibold bg-[#8F5A4E] text-white hover:bg-[#A56F63] transition-colors shadow-sm"
          >
            <span>Masuk ke Akun Saya</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-[14px] text-sm font-semibold bg-[#0F3040] text-white hover:bg-[#0A2230] transition-colors"
          >
            <span>Kembali ke Beranda</span>
          </Link>
        )}
      </div>
    </div>
  );
}

export default function PendaftaranSelesaiPage() {
  return (
    <div className="min-h-screen bg-[#FAF5F2] text-[#464858] pb-16">
      {/* Top Bar with BackButton */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex items-center justify-between">
        <BackButton href="/" label="← Kembali ke Beranda" />
        <Link href="/" className="flex items-center gap-2 group" aria-label="Beranda Lytera">
          <Logo tone="light" />
        </Link>
      </div>

      {/* Main Card Container */}
      <main className="max-w-[640px] mx-auto px-4 sm:px-6 mt-8">
        <Suspense
          fallback={
            <div className="bg-white rounded-[24px] p-12 text-center text-sm text-slate-400">
              Memuat status pendaftaran...
            </div>
          }
        >
          <SelesaiContent />
        </Suspense>
      </main>
    </div>
  );
}
