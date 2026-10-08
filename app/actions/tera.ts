"use server";

import { createClient } from "@/lib/supabase/server";
import { TeraChatRequest, TeraChatResponse, TeraUserContext } from "@/lib/tera/types";
import { executeTeraChat } from "@/lib/tera/engine";

/**
 * Server Action utama untuk berinteraksi dengan Tera AI.
 * Memastikan GROQ_API_KEY dan data sensitif tetap berada di server.
 */
export async function sendTeraMessageAction(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  userInput: string,
  clientContext?: Partial<TeraUserContext>
): Promise<TeraChatResponse> {
  if (!userInput || !userInput.trim()) {
    return {
      success: false,
      message: "Pesan tidak boleh kosong.",
      error: "PESAN_KOSONG",
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Default context jika pengguna belum login (Landing Page)
    let resolvedContext: TeraUserContext = {
      role: clientContext?.role || "landing",
      subRole: clientContext?.subRole || null,
      page: clientContext?.page || "/",
      district: clientContext?.district || null,
      city: clientContext?.city || null,
      province: clientContext?.province || null,
      selectedFamilyMemberId: clientContext?.selectedFamilyMemberId || null,
      selectedFamilyMemberName: clientContext?.selectedFamilyMemberName || null,
    };

    // Jika pengguna sedang login di portal, lengkapi konteks dari profil aman
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, sub_role, full_name, email, status")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        resolvedContext = {
          ...resolvedContext,
          userId: user.id,
          role: (profile.role as TeraUserContext["role"]) || "pasien",
          subRole: profile.sub_role,
          fullName: profile.full_name,
          email: profile.email,
        };

        // Ambil data wilayah pasien jika perannya pasien
        if (profile.role === "pasien") {
          const { data: patient } = await supabase
            .from("patients")
            .select("province, city, district, village, patient_type")
            .eq("id", user.id)
            .maybeSingle();

          if (patient) {
            resolvedContext.province = patient.province;
            resolvedContext.city = patient.city;
            resolvedContext.district = patient.district;
            resolvedContext.village = patient.village;
          }

          // Ambil daftar anggota keluarga jika sub-peran keluarga
          if (profile.sub_role === "keluarga") {
            const { data: family } = await supabase
              .from("family_members")
              .select("id, full_name, relation, dob")
              .eq("guardian_id", user.id);

            if (family && family.length > 0) {
              resolvedContext.familyMembers = family.map((f) => ({
                id: f.id,
                fullName: f.full_name,
                relation: f.relation,
                dob: f.dob,
              }));
            }
          }
        }

        // Ambil fasilitas jika tenaga medis / faskes
        if (
          profile.role === "fasilitas" ||
          profile.role === "dokter" ||
          profile.role === "puskesmas" ||
          profile.role === "klinik" ||
          profile.role === "rumah_sakit"
        ) {
          const { data: staff } = await supabase
            .from("facility_staff")
            .select("facility_id, facilities(id, name, type, city, district)")
            .eq("profile_id", user.id)
            .maybeSingle();

          if (staff && staff.facilities) {
            const fac = staff.facilities as unknown as {
              id: string;
              name: string;
              type: "puskesmas" | "klinik" | "rumah_sakit" | "apotek";
              city: string | null;
              district: string | null;
            };
            resolvedContext.facilityId = fac.id;
            resolvedContext.facilityName = fac.name;
            resolvedContext.facilityType = fac.type;
            resolvedContext.city = fac.city;
            resolvedContext.district = fac.district;
          }
        }
      }
    }

    // Jalankan engine Tera
    const request: TeraChatRequest = {
      messages,
      userInput: userInput.trim(),
      context: resolvedContext,
    };

    return await executeTeraChat(request);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Tera Action Error]:", errorMsg);
    return {
      success: false,
      message: "Tera sedang memproses data rujukan. Silakan coba kembali dalam beberapa saat.",
      error: errorMsg,
    };
  }
}
