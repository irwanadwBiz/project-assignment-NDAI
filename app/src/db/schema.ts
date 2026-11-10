// Tabel untuk M1 (Autentikasi), M2 (RBAC), M3 (Audit Log), dan master merchant/perangkat. Lihat PRD bagian 3 dan 8.
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  bigserial,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// Merchant tidak punya akun aplikasi (lapor lewat chat Vanya), jadi tidak ada di sini.
export const roleEnum = pgEnum("role", [
  "superadmin",
  "supervisor",
  "teknisi",
  "manajer",
  "analis",
]);

export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  nama: varchar("nama", { length: 100 }).notNull().unique(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nama: varchar("nama", { length: 150 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  aktif: boolean("aktif").notNull().default(true),
  dibuatPada: timestamp("dibuat_pada", { withTimezone: true }).notNull().defaultNow(),
});

// M2-01: satu peran, nol atau lebih wilayah.
export const userRegions = pgTable(
  "user_regions",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    regionId: integer("region_id")
      .notNull()
      .references(() => regions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.regionId] })],
);

// M1-03: sesi berbasis token. Yang disimpan hanya hash SHA-256 dari token.
export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kedaluwarsa: timestamp("kedaluwarsa", { withTimezone: true }).notNull(),
    dibuatPada: timestamp("dibuat_pada", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

// Master merchant (PRD bagian 8). Satu merchant punya satu atau banyak perangkat.
export const merchants = pgTable(
  "merchants",
  {
    id: serial("id").primaryKey(),
    // MRC-xxxxxx. Diisi petugas, tidak bisa diubah (dipakai Vanya untuk validasi aduan).
    kodeMerchant: varchar("kode_merchant", { length: 10 }).notNull().unique(),
    nama: varchar("nama", { length: 200 }).notNull(),
    pemilik: varchar("pemilik", { length: 150 }).notNull(), // owner / PIC toko
    alamat: text("alamat").notNull(),
    kabupaten: varchar("kabupaten", { length: 100 }).notNull(),
    telepon: varchar("telepon", { length: 20 }).notNull(),
    email: varchar("email", { length: 255 }),
    regionId: integer("region_id")
      .notNull()
      .references(() => regions.id),
    status: varchar("status", { length: 20 }).notNull().default("aktif"), // aktif | nonaktif
    // Petugas yang mendaftarkan. Null untuk data awal (seed) atau bila akunnya dihapus.
    didaftarkanOleh: integer("didaftarkan_oleh").references(() => users.id, { onDelete: "set null" }),
    dibuatPada: timestamp("dibuat_pada", { withTimezone: true }).notNull().defaultNow(),
    diperbaruiPada: timestamp("diperbarui_pada", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("merchants_region_idx").on(t.regionId)],
);

// Kode perangkat EDC-xxxxx dibuat otomatis dari sequence ini.
export const perangkatKodeSeq = pgSequence("perangkat_kode_seq", { startWith: 10001 });

// Master perangkat EDC (PRD bagian 8).
export const devices = pgTable(
  "devices",
  {
    id: serial("id").primaryKey(),
    kodePerangkat: varchar("kode_perangkat", { length: 12 })
      .notNull()
      .unique()
      .default(sql`'EDC-' || lpad(nextval('perangkat_kode_seq')::text, 5, '0')`),
    merchantId: integer("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "restrict" }),
    serialNumber: varchar("serial_number", { length: 40 }).notNull().unique(),
    merk: varchar("merk", { length: 50 }).notNull(),
    tipePerangkat: varchar("tipe_perangkat", { length: 50 }).notNull(),
    firmwareTerakhir: varchar("firmware_terakhir", { length: 50 }).notNull(),
    dibuatPada: timestamp("dibuat_pada", { withTimezone: true }).notNull().defaultNow(),
    diperbaruiPada: timestamp("diperbarui_pada", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("devices_merchant_idx").on(t.merchantId)],
);

// M3: audit log. Hanya boleh INSERT; UPDATE/DELETE/TRUNCATE diblokir trigger
// (lihat scripts/db-setup.mts). Sengaja tanpa foreign key ke users supaya log tetap
// utuh walau akunnya dihapus; email disimpan sebagai salinan saat kejadian.
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: integer("user_id"), // null untuk kejadian tanpa login (mis. login gagal)
    userEmail: varchar("user_email", { length: 255 }),
    userRole: roleEnum("user_role"),
    aksi: varchar("aksi", { length: 64 }).notNull(), // mis. auth.login, user.dibuat, tanya_data.query
    objek: varchar("objek", { length: 255 }), // mis. user:12, aduan:ADU-0001
    pertanyaan: text("pertanyaan"), // M3-01: pertanyaan Tanya Data
    sql: text("sql"), // M3-01: SQL yang dihasilkan/dijalankan
    jumlahBaris: integer("jumlah_baris"), // M3-01
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    ip: varchar("ip", { length: 64 }),
    waktu: timestamp("waktu", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_waktu_idx").on(t.waktu),
    index("audit_logs_aksi_idx").on(t.aksi),
    index("audit_logs_user_idx").on(t.userId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  userRegions: many(userRegions),
}));

export const regionsRelations = relations(regions, ({ many }) => ({
  userRegions: many(userRegions),
  merchants: many(merchants),
}));

export const userRegionsRelations = relations(userRegions, ({ one }) => ({
  user: one(users, { fields: [userRegions.userId], references: [users.id] }),
  region: one(regions, { fields: [userRegions.regionId], references: [regions.id] }),
}));

export const merchantsRelations = relations(merchants, ({ one, many }) => ({
  region: one(regions, { fields: [merchants.regionId], references: [regions.id] }),
  pendaftar: one(users, { fields: [merchants.didaftarkanOleh], references: [users.id] }),
  devices: many(devices),
}));

export const devicesRelations = relations(devices, ({ one }) => ({
  merchant: one(merchants, { fields: [devices.merchantId], references: [merchants.id] }),
}));

export type Role = (typeof roleEnum.enumValues)[number];
