"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, MapPin, Building, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { TetraMark } from "./TetraMark";
import { TetraMessage, TetraUserContext } from "@/lib/tetra/types";
import { sendTetraMessageAction } from "@/app/actions/tetra";
import { getQuickSuggestions } from "@/lib/tetra/context";

export interface TetraWidgetProps {
  /** Mode tampilan tombol pemicu: 'landing' menampilkan Mark + Teks 'Tetra', 'portal' menampilkan Mark saja */
  variant?: "landing" | "portal";
  /** Konteks user / halaman */
  context?: Partial<TetraUserContext>;
  className?: string;
}

let msgSequence = 1;
function generateMsgId(prefix: string): string {
  msgSequence += 1;
  return `${prefix}-${msgSequence}`;
}

export const TetraWidget: React.FC<TetraWidgetProps> = ({
  variant = "landing",
  context = {},
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Initial greeting berdasarkan role
  const getInitialGreeting = (): string => {
    const role = context.role || "landing";
    if (role === "landing") {
      return "Halo! Saya **Tetra**, asisten digital resmi Lytera. Saya bisa bantu mencari informasi fasilitas kesehatan aktif, dokter spesialis, alur rujukan berjenjang, dan panduan izin akses rekam medis. Kamu sedang mencari apa hari ini?";
    }
    if (role === "pasien") {
      const nama = context.fullName ? `, ${context.fullName}` : "";
      return `Halo${nama}! Tetra siap membantu mengecek faskes rujukan, panduan pembuatan kode izin rekam medis 6 digit, atau informasi penjamin biaya.`;
    }
    if (role === "dokter" || role === "puskesmas" || role === "klinik") {
      return `Halo Dok! Tetra siap membantu penapisan fasilitas rujukan lanjutan (Rumah Sakit) dan ketersediaan dokter spesialis untuk kebutuhan rujukan pasien.`;
    }
    if (role === "rumah_sakit") {
      return `Halo! Tetra siap membantu informasi layanan spesialis dan alternatif rujukan faskes di sistem Lytera.`;
    }
    if (role === "verifikator") {
      return `Halo Petugas! Tetra siap membantu panduan verifikasi dokumen administratif (domisili warga dan SKTM kurang mampu).`;
    }
    if (role === "dinkes") {
      return `Halo Dinas Kesehatan! Tetra siap menyajikan ringkasan fasilitas kesehatan aktif dan alur verifikasi legalitas faskes di daerah.`;
    }
    return "Halo! Saya Tetra, asisten AI Lytera. Ada yang bisa saya bantu?";
  };

  const [messages, setMessages] = useState<TetraMessage[]>([
    {
      id: "init-1",
      sender: "tetra",
      content: getInitialGreeting(),
      timestamp: 1,
      suggestions: getQuickSuggestions({
        role: context.role || "landing",
        subRole: context.subRole || null,
        city: context.city,
        district: context.district,
      }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll ke bawah saat pesan baru bertambah
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || isLoading) return;

    const userMsg: TetraMessage = {
      id: generateMsgId("user"),
      sender: "user",
      content: text,
      timestamp: 1,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsLoading(true);

    try {
      const chatHistory = [...messages, userMsg].map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      }));

      const res = await sendTetraMessageAction(chatHistory, text, context);

      if (res.success) {
        const tetraMsg: TetraMessage = {
          id: generateMsgId("tetra"),
          sender: "tetra",
          content: res.message,
          timestamp: 1,
          recommendations: res.recommendations,
          suggestions: res.suggestions,
          navigation: res.navigation,
        };
        setMessages((prev) => [...prev, tetraMsg]);
      } else {
        const errorMsg: TetraMessage = {
          id: generateMsgId("tetra-err"),
          sender: "tetra",
          content:
            res.message ||
            "Maaf, Tetra sedang memproses data rujukan. Silakan coba kembali dalam beberapa saat.",
          timestamp: 1,
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch {
      const errorMsg: TetraMessage = {
        id: generateMsgId("tetra-err"),
        sender: "tetra",
        content:
          "Terjadi kendala jaringan saat menghubungi asisten Tetra. Silakan periksa koneksi internetmu.",
        timestamp: 1,
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: generateMsgId("reset"),
        sender: "tetra",
        content: getInitialGreeting(),
        timestamp: 1,
        suggestions: getQuickSuggestions({
          role: context.role || "landing",
          subRole: context.subRole || null,
          city: context.city,
          district: context.district,
        }),
      },
    ]);
  };

  // Badge role di header panel
  const getRoleBadgeLabel = (): string => {
    const role = context.role || "landing";
    if (role === "landing") return "Panduan Umum";
    if (role === "pasien") return context.subRole === "keluarga" ? "Pasien Keluarga" : "Pasien Mandiri";
    if (role === "dokter" || role === "puskesmas" || role === "klinik") return "Tenaga Medis";
    if (role === "rumah_sakit") return "Rumah Sakit";
    if (role === "verifikator") return "Verifikator";
    if (role === "dinkes") return "Dinas Kesehatan";
    return "Asisten AI";
  };

  return (
    <div className={`fixed bottom-6 right-6 z-40 select-none ${className}`}>
      {/* =========================================================================
          1. FLOATING CHAT PANEL (RINGKAS, NON-BLOCKING SCROLL, TANPA BACKDROP BLUR)
          ========================================================================= */}
      {isOpen && (
        <div
          className="fixed bottom-[88px] right-6 w-[360px] sm:w-[390px] h-[520px] max-h-[calc(100vh-110px)] bg-white rounded-[24px] shadow-2xl border border-[#E2E8F0] flex flex-col overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-3 duration-200"
          style={{ boxShadow: "0 18px 48px -12px rgba(10, 34, 48, 0.28), 0 0 0 1px rgba(46, 125, 81, 0.12)" }}
        >
          {/* A. HEADER PANEL */}
          <div className="bg-[#0A2230] text-white px-4 py-3.5 flex items-center justify-between shrink-0 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <TetraMark size="sm" isHovered={true} />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-[15px] tracking-tight text-white leading-none">
                    Tetra
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30">
                    {getRoleBadgeLabel()}
                  </span>
                </div>
                <span className="text-[11px] text-slate-300 block mt-0.5">
                  Asisten Digital Rujukan Lytera
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                title="Mulai percakapan baru"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Bersihkan chat"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Tutup panel Tetra"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* B. MESSAGES BODY (SCROLLABLE) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F8FAF9] text-[13px]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                {/* Bubble Chat */}
                <div
                  className={`p-3 rounded-[16px] max-w-[88%] leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#2E7D51] text-white rounded-br-[4px] shadow-xs"
                      : msg.isError
                      ? "bg-[#FDECEA] text-[#B3261E] border border-[#B3261E]/20 rounded-bl-[4px]"
                      : "bg-white text-[#0A2230] border border-[#E2E8F0] rounded-bl-[4px] shadow-2xs"
                  }`}
                >
                  <div className="whitespace-pre-line select-text">
                    {msg.content}
                  </div>
                </div>

                {/* Structured Recommendations Cards: HANYA TAMPIL JIKA ADA REKOMENDASI NYATA */}
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="w-full mt-2.5 space-y-2">
                    <span className="text-[11px] font-bold text-[#2E7D51] tracking-wider uppercase block">
                      Rekomendasi Terpilih di Lytera:
                    </span>
                    {msg.recommendations.map((rec, rIdx) => (
                      <div
                        key={rIdx}
                        className="bg-white rounded-[14px] p-3 border border-[#2E7D51]/20 shadow-2xs text-left transition-all hover:border-[#2E7D51]/40"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0">
                            <h4 className="font-bold text-[13px] text-[#0A2230] leading-tight truncate">
                              {rec.name}
                            </h4>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Building className="w-3 h-3 text-[#2E7D51] shrink-0" />
                              {rec.category || "Fasilitas Kesehatan"}
                            </span>
                          </div>
                          {rec.badge && (
                            <span className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E8F5EE] text-[#2E7D51] border border-[#2E7D51]/25 shrink-0">
                              {rec.badge}
                            </span>
                          )}
                        </div>

                        {rec.location && (
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1.5 truncate">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            {rec.location}
                          </p>
                        )}

                        <p className="text-[11.5px] text-slate-600 mt-1.5 bg-[#F4FAF6] p-2 rounded-[8px] border border-[#2E7D51]/10 leading-snug">
                          💡 {rec.relevance}
                        </p>

                        {rec.actionUrl && (
                          <a
                            href={rec.actionUrl}
                            className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-bold text-[#2E7D51] hover:underline"
                          >
                            <span>{rec.actionLabel || "Lihat Detail"}</span>
                            <ArrowRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Suggestion Chips */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 max-w-full">
                    {msg.suggestions.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => handleSendMessage(sug)}
                        disabled={isLoading}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white text-[#2E7D51] border border-[#2E7D51]/25 hover:bg-[#E8F5EE] transition-colors cursor-pointer text-left truncate max-w-full disabled:opacity-50"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-slate-500 text-[12px] bg-white p-2.5 rounded-[12px] border border-[#E2E8F0] w-fit">
                <Loader2 className="w-3.5 h-3.5 text-[#2E7D51] animate-spin" />
                <span>Tetra sedang memproses...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* C. INPUT BAR */}
          <div className="p-3 bg-white border-t border-[#E2E8F0] shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tanya Tetra (misal: RS rujukan, alur rujukan)..."
                disabled={isLoading}
                className="flex-1 bg-[#F1F5F3] text-[#0A2230] text-[13px] px-3.5 py-2.5 rounded-[14px] border border-transparent focus:border-[#2E7D51] focus:bg-white focus:outline-none transition-colors placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!inputVal.trim() || isLoading}
                className="w-10 h-10 rounded-[14px] bg-[#2E7D51] hover:bg-[#246843] active:scale-95 disabled:opacity-40 disabled:hover:bg-[#2E7D51] text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs"
                aria-label="Kirim pesan"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="text-[10px] text-slate-400 text-center mt-1.5 flex items-center justify-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-[#2E7D51]" />
              <span>Bukan alat diagnosis. Untuk kondisi gawat darurat, segera ke IGD terdekat.</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. FLOATING TRIGGER BUTTON (DENGAN CONTINUOUS BORDER ANIMATION SAAT HOVER)
          ========================================================================= */}
      <div
        className="relative group inline-block"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Micro-label / Tooltip "Tetra" */}
        <div
          className={`absolute bottom-full right-1/2 translate-x-1/2 mb-2 px-2.5 py-1 rounded-md bg-[#0A2230] text-white text-[11px] font-bold tracking-wide shadow-md pointer-events-none transition-all duration-200 z-50 whitespace-nowrap ${
            isHovered && !isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
          }`}
        >
          Tetra
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#0A2230]" />
        </div>

        {/* Tombol Utama Tetra */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-2.5 p-1.5 pr-4 rounded-full bg-white shadow-xl border border-[#E2E8F0] hover:border-[#2E7D51]/40 transition-all duration-200 cursor-pointer active:scale-95 ${
            variant === "portal" ? "pr-1.5" : "pr-4"
          }`}
          aria-label={isOpen ? "Tutup asisten Tetra" : "Buka asisten Tetra"}
        >
          {/* Mark Tetra dengan 4 Garis Diagonal & Continuous Rotating Border Gradient */}
          <TetraMark size="md" isHovered={isHovered} />

          {/* Label Teks "Tetra" (HANYA DITAMPILKAN DI LANDING PAGE) */}
          {variant === "landing" && (
            <div className="text-left flex flex-col justify-center pr-1">
              <span className="font-extrabold text-[14px] text-[#0A2230] leading-none group-hover:text-[#2E7D51] transition-colors">
                Tetra
              </span>
              <span className="text-[10.5px] text-slate-500 leading-tight block mt-0.5">
                Tanya Rujukan
              </span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
};
