import { redirect } from "next/navigation";

/**
 * Halaman utama portal Dinkes dialihkan ke pusat pemantauan fasilitas kesehatan wilayah.
 */
export default function PortalDinkesPage() {
  redirect("/portal/dinkes/pemantauan");
}

