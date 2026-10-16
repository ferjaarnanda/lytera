"use server";

import { createClient } from "@/lib/supabase/server";
import { TetraChatRequest, TetraChatResponse, TetraUserContext } from "@/lib/tetra/types";
import { executeTetraChat } from "@/lib/tetra/engine";
import { detectPrivacyIntent, TetraPrivacyContext } from "@/lib/tetra/privacy";

/**
 * Server Action utama untuk berinteraksi dengan Tetra AI.
 * Memastikan GROQ_API_KEY dan data sensitif tetap berada di server.
 */
export async function sendTetraMessageAction(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  userInput: string,
  clientContext?: Partial<TetraUserContext>
): Promise<TetraChatResponse> {
  if (!userInput || !userInput.trim()) {
    return {
      success: false,
      message: "Pesan tidak boleh kosong.",
      error: "PESAN_KOSONG",
    };
  }

  try {
    const isLanding = clientContext?.role === "landing";

    // Konteks dasar
    let resolvedContext: TetraUserContext = {
      role: clientContext?.role || "landing",
      subRole: isLanding ? null : clientContext?.subRole || null,
      page: clientContext?.page || "/",
      district: isLanding ? null : clientContext?.district || null,
      city: isLanding ? null : clientContext?.city || null,
      province: isLanding ? null : clientContext?.province || null,
      selectedFamilyMemberId: isLanding ? null : clientContext?.selectedFamilyMemberId || null,
      selectedFamilyMemberName: isLanding ? null : clientContext?.selectedFamilyMemberName || null,
    };

    // HANYA jika BUKAN landing page, periksa sesi auth di server
    if (!isLanding) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: profile } = user
        ? await supabase
            .from("profiles")
            .select("role, sub_role, full_name, email, status")
            .eq("id", user.id)
            .maybeSingle()
        : { data: null };

      if (!user || !profile) {
        // Tanpa sesi yang sah, konteks dari klien TIDAK dipercaya sebagai identitas.
        resolvedContext = {
          role: "landing",
          subRole: null,
          page: resolvedContext.page,
          district: null,
          city: null,
          province: null,
          selectedFamilyMemberId: null,
          selectedFamilyMemberName: null,
        };
      }

      if (user && profile) {
        {
          resolvedContext = {
            ...resolvedContext,
            userId: user.id,
            role: (profile.role as TetraUserContext["role"]) || "pasien",
            subRole: profile.sub_role,
            fullName: profile.full_name,
            email: profile.email,
          };

          // Ambil data wilayah pasien jika perannya pasien (RLS: hanya baris milik sendiri)
          if (profile.role === "pasien") {
            const wantsOwnAddress =
              detectPrivacyIntent(userInput, messages).address?.subject === "self";
            const { data: patient } = await supabase
              .from("patients")
              .select(
                wantsOwnAddress
                  ? "province, city, district, village, address"
                  : "province, city, district, village"
              )
              .eq("id", user.id)
              .maybeSingle<{
                province: string | null;
                city: string | null;
                district: string | null;
                village: string | null;
                address?: string | null;
              }>();

            if (patient) {
              resolvedContext.province = patient.province;
              resolvedContext.city = patient.city;
              resolvedContext.district = patient.district;
              resolvedContext.village = patient.village;
            }

            if (wantsOwnAddress) {
              (resolvedContext as TetraPrivacyContext).ownAddress = patient
                ? {
                    province: patient.province,
                    city: patient.city,
                    district: patient.district,
                    village: patient.village,
                    address: patient.address ?? null,
                  }
                : null;
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
    }

    // Jalankan engine Tetra
    const request: TetraChatRequest = {
      messages,
      userInput: userInput.trim(),
      context: resolvedContext,
    };

    return await executeTetraChat(request);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Tetra Action Error]:", errorMsg);
    return {
      success: false,
      message: "Tetra sedang memproses data rujukan. Silakan coba kembali dalam beberapa saat.",
      error: errorMsg,
    };
  }
}
