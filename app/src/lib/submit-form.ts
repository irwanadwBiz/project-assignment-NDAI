// Kirim form ke Server Action tanpa reset otomatis.
//
// Jangan pakai <form action={...}> untuk form yang punya <select> atau isian penting:
// React 19 me-reset form setelah action selesai, dan <select> terkontrol kembali ke
// opsi pertama di DOM sementara state React tetap. Simpan berikutnya mengirim nilai
// yang salah tanpa disadari (pernah terjadi: peran berubah ke Superadmin).
// Lihat docs/TESTING.md bagian "Catatan bug yang pernah ditemukan".
import { startTransition, type FormEvent } from "react";

export function submitWith(dispatch: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
}
