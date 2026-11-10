// Pengaturan database yang tidak bisa diatur lewat Drizzle (trigger).
// Jalankan setelah `npm run db:push`:  npm run db:setup   (aman dijalankan berulang)
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diset (.env.local)");
const sql = neon(process.env.DATABASE_URL);

// M3-03: audit log tidak dapat diubah atau dihapus oleh aplikasi.
await sql`
  CREATE OR REPLACE FUNCTION audit_logs_immutable() RETURNS trigger AS $$
  BEGIN
    RAISE EXCEPTION 'audit_logs hanya boleh ditambah (% ditolak)', TG_OP
      USING ERRCODE = 'insufficient_privilege';
  END;
  $$ LANGUAGE plpgsql`;
await sql`DROP TRIGGER IF EXISTS audit_logs_no_update_delete ON audit_logs`;
await sql`
  CREATE TRIGGER audit_logs_no_update_delete
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable()`;
await sql`DROP TRIGGER IF EXISTS audit_logs_no_truncate ON audit_logs`;
await sql`
  CREATE TRIGGER audit_logs_no_truncate
  BEFORE TRUNCATE ON audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_immutable()`;

console.log("db:setup selesai: trigger audit_logs (hanya INSERT) terpasang.");
