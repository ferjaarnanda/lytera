import { redirect } from "next/navigation";

/**
 * Halaman utama portal Dinkes dialihkan ke pusat verifikasi fasilitas kesehatan
 * menggantikan dashboard simulasi placeholder sebelumnya.
 */
export default function PortalDinkesPage() {
  redirect("/portal/dinkes/verifikasi-faskes");
}
