import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="mx-auto max-w-md p-10 text-center">
      <p className="text-sm font-semibold text-red-700">403</p>
      <h1 className="mt-1 text-xl font-semibold">Akses ditolak</h1>
      <p className="mt-2 text-sm text-zinc-600">Peran Anda tidak memiliki izin untuk membuka halaman ini.</p>
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-blue-700 hover:underline">
        Kembali ke halaman utama
      </Link>
    </main>
  );
}
