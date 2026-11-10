// M3-04: samarkan nama pemilik, nomor kartu, dan kontak sebelum data dikirim ke model
// (Vanna, Vanya, CV/VLM). Fungsi murni, tanpa dependensi.

/** "Budi Santoso" → "B*** S***" */
export function maskName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0] + "***")
    .join(" ");
}

/** "budi.santoso@mail.com" → "b***@mail.com" */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local[0] ?? ""}***@${domain}`;
}

/** Sisakan 4 digit terakhir: "081234567890" → "********7890" */
export function maskDigits(value: string, keepLast = 4): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= keepLast) return "*".repeat(digits.length);
  return "*".repeat(digits.length - keepLast) + digits.slice(-keepLast);
}

// Nomor kartu 13-19 digit (boleh dipisah spasi/strip), juga menangkap NIK 16 digit.
const CARD_RE = /\b(?:\d[ -]?){12,18}\d\b/g;
// Telepon Indonesia: +62 / 62 / 0 diikuti 8-13 digit (boleh dipisah spasi/strip).
const PHONE_RE = /(?:\+62|\b62|\b0)[ -]?8(?:[ -]?\d){7,12}\b/g;
const EMAIL_RE = /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g;

/**
 * Samarkan data sensitif di teks bebas (keluhan merchant, pertanyaan, catatan).
 * Nama orang tidak bisa dideteksi andal dari teks bebas, jadi pakai maskRecord
 * untuk kolom nama yang terstruktur.
 */
export function maskPII(text: string): string {
  return text
    .replace(EMAIL_RE, (m) => maskEmail(m))
    .replace(PHONE_RE, (m) => maskDigits(m))
    .replace(CARD_RE, (m) => maskDigits(m));
}

// Nama kolom yang dianggap sensitif (cocok sebagian, tidak peka huruf besar/kecil).
const NAME_KEYS = /(^|_)(nama_pemilik|pemilik|owner|nama_pelapor|pelapor)($|_)/i;
const CARD_KEYS = /(kartu|card|pan|nik)/i;
const CONTACT_KEYS = /(telepon|telp|phone|hp|kontak|contact|whatsapp|wa)$/i;
const EMAIL_KEYS = /email/i;

/** Samarkan satu baris data (mis. hasil query) sebelum dikirim ke model. */
export function maskRecord<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (typeof value !== "string") {
      out[key] = value;
    } else if (NAME_KEYS.test(key)) {
      out[key] = maskName(value);
    } else if (EMAIL_KEYS.test(key)) {
      out[key] = maskEmail(value);
    } else if (CARD_KEYS.test(key) || CONTACT_KEYS.test(key)) {
      out[key] = maskDigits(value);
    } else {
      out[key] = maskPII(value);
    }
  }
  return out as T;
}
