"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface LogoutButtonProps {
  /** Kelas tambahan untuk tombol */
  className?: string;
  /** Label teks (default: "Keluar") */
  label?: string;
}

/**
 * Tombol Keluar yang memanggil supabase.auth.signOut() lalu
 * mengarahkan ke halaman utama. Aman dipakai di mana pun dalam
 * komponen klien.
 */
export function LogoutButton({
  className = "",
  label = "Keluar",
}: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <LogOut className="w-3.5 h-3.5" />
      )}
      <span>{loading ? "Keluar..." : label}</span>
    </button>
  );
}
