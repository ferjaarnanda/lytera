"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Send, MapPin, Building, ArrowRight, Loader2, RefreshCw } from "lucide-react";
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

export const TetraWidget: React.FC<TetraWidgetProps> = (props) => {
  const { context = {}, className = "" } = props;
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

// Helper sederhana & aman untuk render Markdown ringan (**bold**, *italic*, bullet points, link teks)
function renderFormattedContent(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split("\n");

  return lines.map((line, lIdx) => {
    // Cek apakah list item
    const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ");
    const cleanLine = isBullet ? line.trim().replace(/^[-*]\s+/, "") : line;

    // Parser inline: **bold**, *italic*
    const tokens: React.ReactNode[] = [];
    const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(cleanLine)) !== null) {
      if (match.index > lastIndex) {
        tokens.push(cleanLine.substring(lastIndex, match.index));
      }
      if (match[2]) {
        // **bold**
        tokens.push(
          <strong key={`${lIdx}-${match.index}`} className="font-bold text-[#1B4D3E]">
            {match[2]}
          </strong>
        );
      } else if (match[3]) {
        // *italic*
        tokens.push(
          <em key={`${lIdx}-${match.index}`} className="italic">
            {match[3]}
          </em>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < cleanLine.length) {
      tokens.push(cleanLine.substring(lastIndex));
    }

    if (isBullet) {
      return (
        <div key={lIdx} className="flex items-start gap-1.5 my-0.5 ml-1">
          <span className="text-[#2E7D51] font-bold mt-[-1px] select-none">•</span>
          <span className="flex-1">{tokens}</span>
        </div>
      );
    }

    return (
      <React.Fragment key={lIdx}>
        {tokens}
        {lIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

  return (
    <div className={`fixed bottom-3 right-5 z-40 select-none ${className}`}>
      {/* =========================================================================
          1. FLOATING CHAT PANEL (RINGKAS, NON-BLOCKING SCROLL, DI BAWAH NAVBAR)
          ========================================================================= */}
      {isOpen && (
        <div
          className="fixed bottom-[70px] right-5 w-[370px] sm:w-[410px] max-w-[calc(100vw-36px)] h-[605px] max-h-[calc(100vh-168px)] bg-white rounded-[24px] shadow-2xl border border-[#D1E7DD] flex flex-col overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-3 duration-200"
          style={{ boxShadow: "0 18px 48px -12px rgba(27, 77, 62, 0.24), 0 0 0 1px rgba(46, 125, 81, 0.15)" }}
        >
          {/* A. HEADER PANEL (PALET HIJAU-PUTIH LEMBUT DENGAN ARUS GELOMBANG ANIMASI) */}
          <div className="relative overflow-hidden bg-gradient-to-r from-[#1B4D3E] via-[#246843] to-[#2E7D51] text-white px-4 py-3.5 flex items-center justify-between shrink-0 border-b border-emerald-400/20">
            {/* Arus Gelombang Halus Hijau di Background Header */}
            <div className="absolute inset-0 pointer-events-none opacity-25 overflow-hidden">
              <svg
                className="absolute -top-3 -left-1/4 w-[200%] h-12 text-[#A7F3D0] animate-tetra-wave"
                viewBox="0 0 1200 120"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,0 C150,90 350,-40 500,45 C650,130 900,10 1200,60 L1200,0 L0,0 Z"
                  fill="currentColor"
                />
              </svg>
            </div>

            <div className="relative z-10 flex items-center gap-2.5">
              <TetraMark size="sm" isHovered={true} />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-[15px] tracking-tight text-white leading-none">
                    Tetra
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-[#A7F3D0] border border-white/25 backdrop-blur-xs">
                    {getRoleBadgeLabel()}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-100 block mt-0.5">
                  Asisten Digital Rujukan Lytera
                </span>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                title="Mulai percakapan baru"
                className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                aria-label="Bersihkan chat"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                aria-label="Tutup panel Tetra"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* B. MESSAGES BODY (SCROLLABLE) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FCFA] text-[13px]">
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
                      : "bg-white text-[#1B4D3E] border border-[#D1E7DD] rounded-bl-[4px] shadow-2xs"
                  }`}
                >
                  <div className="select-text">
                    {renderFormattedContent(msg.content)}
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

                        <p className="text-[11.5px] text-slate-500 mt-1.5 leading-snug">
                          {rec.relevance}
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
          <div className="p-3 bg-white border-t border-[#D1E7DD] shrink-0">
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
                className="flex-1 bg-[#F4FAF6] text-[#1B4D3E] text-[13px] px-3.5 py-2.5 rounded-[14px] border border-transparent focus:border-[#2E7D51] focus:bg-white focus:outline-none transition-colors placeholder:text-slate-400"
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
            <div className="text-[10px] text-slate-400 text-center mt-1.5 flex items-center justify-center">
              <span>Bukan alat diagnosis. Untuk kondisi gawat darurat, segera ke IGD terdekat.</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. FLOATING TRIGGER BUTTON (RINGKAS, PALET HIJAU-PUTIH, BORDER BERPUTAR DI SELURUH KELOMPOK BRANDING)
          ========================================================================= */}
      <div
        className="relative group inline-block"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Tombol Utama Tetra: Seluruh kelompok branding (Mark + Teks Tetra) */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative p-[2px] rounded-full overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2E7D51]"
          aria-label={isOpen ? "Tutup asisten Tetra" : "Buka asisten Tetra"}
        >
          {/* Continuous Moving Border Gradient di Sekeliling Seluruh Kelompok Branding */}
          <div
            className={`absolute inset-[-100%] transition-opacity duration-300 pointer-events-none ${
              isHovered ? "opacity-100 animate-tetra-spin" : "opacity-35"
            }`}
            style={{
              background:
                "conic-gradient(from 0deg, #34D399 0%, #10B981 35%, #047857 70%, #022C22 90%, #34D399 100%)",
            }}
            aria-hidden="true"
          />

          {/* Surface Pill Putih Solid Bersih */}
          <div className="relative z-10 flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white text-[#1B4D3E]">
            {/* Mark Tetra Resmi dengan 4 Garis Diagonal */}
            <TetraMark size="sm" isHovered={isHovered} />

            {/* Nama Tetra */}
            <div className="flex items-center pr-1.5">
              <span className="font-extrabold text-[13.5px] text-[#1B4D3E] tracking-tight leading-none group-hover:text-[#2E7D51] transition-colors">
                Tetra
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
