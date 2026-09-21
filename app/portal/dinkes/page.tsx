"use client";

import React from "react";
import Link from "next/link";
import {
  Landmark,
  Hospital,
  ArrowRight,
  Sparkles,
  LogOut,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";

export default function PortalDinkesPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#464858]" data-navbar-tone="light">
      {/* Top Navbar with variant dinkes */}
      <Navbar
        variant="dinkes"
        userName="Administrator Dinkes"
        userRole="Dinas Kesehatan Kota Semarang"
      />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        {/* Simulation Banner */}
        <Reveal>
          <div className="mb-8 p-4 rounded-[18px] bg-[#EDF7F2] border border-[#1B6B4D]/25 flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1B6B4D] text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs sm:text-sm text-[#0F3040]">
                <span className="font-bold">Mode Simulasi Interaktif: </span>
                <span>
                  Portal Pengawas Dinas Kesehatan menampilkan monitoring jaringan rujukan digital dan verifikasi fasilitas wilayah Kota Semarang tanpa data riil.
                </span>
              </div>
            </div>
            <Link
              href="/"
              className="shrink-0 text-xs font-semibold text-[#1B6B4D] hover:underline inline-flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar
            </Link>
          </div>
        </Reveal>

        {/* Welcome Header */}
        <Reveal delayMs={100}>
          <div className="bg-white rounded-[24px] border border-[#E2E8F0] p-6 sm:p-8 shadow-sm mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF2F6] text-[#0F3040] mb-2">
                  <Landmark className="w-3.5 h-3.5 text-[#8F5A4E]" />
                  <span>Dinas Kesehatan Daerah</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#0F3040]">
                  Pusat Kendali & Monitoring Rujukan Faskes
                </h1>
                <p className="text-sm text-[#464858]/80 mt-1 max-w-2xl">
                  Pemerintah Kota Semarang &bull; Koordinasi integrasi rekam medis bersama antar-Puskesmas, Klinik Pratama, Rumah Sakit Umum/Khusus, dan Apotek.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#EDF7F2] text-[#1B6B4D]">
                  <span className="w-2 h-2 rounded-full bg-[#1B6B4D] animate-pulse" />
                  SatuSehat Terhubung
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Analytics Statistics Row */}
        <Reveal delayMs={200}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <div className="bg-white p-5 rounded-[22px] border border-[#E2E8F0] shadow-sm">
              <span className="text-xs font-medium text-slate-500">Total Faskes Terintegrasi</span>
              <p className="text-3xl font-bold text-[#0F3040] mt-2 tabular-nums">48</p>
              <span className="text-xs text-[#1B6B4D] font-medium inline-flex items-center gap-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5" />
                +4 faskes bulan ini
              </span>
            </div>

            <div className="bg-white p-5 rounded-[22px] border border-[#E2E8F0] shadow-sm">
              <span className="text-xs font-medium text-slate-500">Volume Rujukan Harian</span>
              <p className="text-3xl font-bold text-[#0F3040] mt-2 tabular-nums">1.284</p>
              <span className="text-xs text-slate-500 font-medium inline-flex items-center gap-1 mt-1">
                <Activity className="w-3.5 h-3.5" />
                Rata-rata respon 4.2 menit
              </span>
            </div>

            <div className="bg-white p-5 rounded-[22px] border border-[#E2E8F0] shadow-sm">
              <span className="text-xs font-medium text-slate-500">Permohonan Izin Faskes</span>
              <p className="text-3xl font-bold text-[#8F5A4E] mt-2 tabular-nums">3</p>
              <span className="text-xs text-[#8F5A4E] font-medium inline-flex items-center gap-1 mt-1">
                <Clock className="w-3.5 h-3.5" />
                Menunggu verifikasi berkas
              </span>
            </div>

            <div className="bg-white p-5 rounded-[22px] border border-[#E2E8F0] shadow-sm">
              <span className="text-xs font-medium text-slate-500">Kepatuhan Interoperabilitas</span>
              <p className="text-3xl font-bold text-[#1B6B4D] mt-2 tabular-nums">98.4%</p>
              <span className="text-xs text-[#1B6B4D] font-medium inline-flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sesuai standar HL7 FHIR
              </span>
            </div>
          </div>
        </Reveal>

        {/* Verification Queue Section */}
        <Reveal delayMs={300}>
          <div className="bg-white rounded-[24px] border border-[#E2E8F0] p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-[#0F3040] mb-4">
              Antrean Verifikasi Fasilitas Kesehatan Baru
            </h2>
            <div className="divide-y divide-[#E2E8F0]">
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FAF5F2] flex items-center justify-center text-[#8F5A4E] shrink-0">
                    <Hospital className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F3040]">Klinik Pratama Sehat Bersama</h3>
                    <p className="text-xs text-slate-500">
                      Kecamatan Pedurungan &bull; No. Izin: 440/12/KP/2026
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-3 py-1 rounded-full bg-[#FFF4D6] text-[#7A5200] font-medium">
                    Berkas Ditinjau
                  </span>
                  <button
                    type="button"
                    onClick={() => alert("Simulasi: Berkas izin operasional valid.")}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#0F3040] text-white hover:bg-[#0A2230]"
                  >
                    Periksa
                  </button>
                </div>
              </div>

              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FAF5F2] flex items-center justify-center text-[#8F5A4E] shrink-0">
                    <Hospital className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F3040]">Apotek Kimia Farma Pandanaran</h3>
                    <p className="text-xs text-slate-500">
                      Kecamatan Semarang Tengah &bull; No. SIA: 503/42/SIA/2026
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-3 py-1 rounded-full bg-[#EDF7F2] text-[#1B6B4D] font-medium">
                    Lolos Inspeksi
                  </span>
                  <button
                    type="button"
                    onClick={() => alert("Simulasi: Izin fasilitas disetujui.")}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#1B6B4D] text-white hover:bg-[#15533b]"
                  >
                    Setujui
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Back to Home CTA */}
        <Reveal delayMs={400}>
          <div className="mt-12 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[14px] text-sm font-semibold bg-[#0F3040] text-white hover:bg-[#0A2230] transition-colors"
            >
              <span>Kembali ke Beranda Utama</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
      </main>
    </div>
  );
}
