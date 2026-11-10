"use client";

import Link from "next/link";
import { cloneElement, useActionState, useId } from "react";
import { submitWith } from "@/lib/submit-form";
import { createDevice, createMerchant, updateDevice, updateMerchant, type FormState } from "./actions";

const input = "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none";
const labelCls = "block text-xs font-medium text-zinc-600";
const btn =
  "rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60";

function Message({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p role="status" className="text-sm text-red-700">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="text-sm text-green-700">
        {state.ok}
      </p>
    );
  return null;
}

// Petunjuk diletakkan di luar <label> (dihubungkan lewat aria-describedby) supaya
// nama aksesibel isian tetap persis labelnya, mis. "Email", bukan "Email Opsional."
function Field({ label, children, hint }: { label: string; children: React.ReactElement; hint?: string }) {
  const hintId = useId();
  return (
    <div>
      <label className={labelCls}>
        {label}
        <span className="mt-1 block">
          {hint ? cloneElement(children as React.ReactElement<{ "aria-describedby"?: string }>, { "aria-describedby": hintId }) : children}
        </span>
      </label>
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-zinc-400">
          {hint}
        </p>
      )}
    </div>
  );
}

type Region = { id: number; nama: string };

export type MerchantInitial = {
  id: number;
  kodeMerchant: string;
  nama: string;
  pemilik: string;
  alamat: string;
  kabupaten: string;
  telepon: string;
  email: string | null;
  regionId: number;
  status: string;
};

export function MerchantForm({ regions, initial }: { regions: Region[]; initial?: MerchantInitial }) {
  const editing = !!initial;
  const [state, action, pending] = useActionState(editing ? updateMerchant : createMerchant, {});

  return (
    <form onSubmit={submitWith(action)} className="grid gap-4 sm:grid-cols-2">
      {editing && <input type="hidden" name="id" value={initial.id} />}
      <Field label="Kode merchant" hint={editing ? "Tidak bisa diubah." : "Format MRC-xxxxxx, mis. MRC-000123."}>
        <input
          name="kodeMerchant"
          defaultValue={initial?.kodeMerchant}
          disabled={editing}
          required={!editing}
          placeholder="MRC-000123"
          className={`${input} font-mono disabled:bg-zinc-100`}
        />
      </Field>
      <Field label="Nama merchant">
        <input name="nama" defaultValue={initial?.nama} required maxLength={200} className={input} />
      </Field>
      <Field label="Owner / PIC toko">
        <input name="pemilik" defaultValue={initial?.pemilik} required maxLength={150} className={input} />
      </Field>
      <Field label="Nomor telepon">
        <input
          name="telepon"
          type="tel"
          defaultValue={initial?.telepon}
          required
          placeholder="081234567890"
          className={input}
        />
      </Field>
      <Field label="Email" hint="Opsional.">
        <input name="email" type="email" defaultValue={initial?.email ?? ""} className={input} />
      </Field>
      <Field label="Wilayah">
        <select name="regionId" defaultValue={initial?.regionId ?? regions[0]?.id} required className={input}>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nama}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Alamat">
          <textarea name="alamat" defaultValue={initial?.alamat} required rows={2} className={input} />
        </Field>
      </div>
      <Field label="Kabupaten / kota">
        <input
          name="kabupaten"
          defaultValue={initial?.kabupaten}
          required
          maxLength={100}
          placeholder="Kota Bandung"
          className={input}
        />
      </Field>
      {editing && (
        <Field label="Status">
          <select name="status" defaultValue={initial.status} className={input}>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
        </Field>
      )}
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className={btn}>
          {pending ? "Menyimpan…" : editing ? "Simpan perubahan" : "Daftarkan merchant"}
        </button>
        <Link href={editing ? `/merchants/${initial.id}` : "/merchants"} className="text-sm text-zinc-500 hover:underline">
          Batal
        </Link>
        <Message state={state} />
      </div>
    </form>
  );
}

export type DeviceInitial = {
  id: number;
  merchantId: number;
  serialNumber: string;
  merk: string;
  tipePerangkat: string;
  firmwareTerakhir: string;
};

export function DeviceForm({
  merchantId,
  initial,
  merkSaran,
  tipeSaran,
}: {
  merchantId?: number;
  initial?: DeviceInitial;
  merkSaran: string[];
  tipeSaran: string[];
}) {
  const editing = !!initial;
  const [state, action, pending] = useActionState(editing ? updateDevice : createDevice, {});

  return (
    // key: setelah perangkat berhasil ditambahkan, form dikosongkan untuk perangkat berikutnya.
    <form key={state.ok ?? "baru"} onSubmit={submitWith(action)} className="grid gap-3 sm:grid-cols-4">
      {editing ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : (
        <input type="hidden" name="merchantId" value={merchantId} />
      )}
      <Field label="Serial number">
        <input
          name="serialNumber"
          defaultValue={initial?.serialNumber}
          required
          placeholder="SN-PAX-2001"
          className={`${input} font-mono`}
        />
      </Field>
      <Field label="Merk">
        <input name="merk" list="merk-saran" defaultValue={initial?.merk} required className={input} />
      </Field>
      <Field label="Tipe perangkat">
        <input name="tipePerangkat" list="tipe-saran" defaultValue={initial?.tipePerangkat} required className={input} />
      </Field>
      <Field label="Firmware terakhir">
        <input
          name="firmwareTerakhir"
          defaultValue={initial?.firmwareTerakhir}
          required
          placeholder="v8.1.0"
          className={`${input} font-mono`}
        />
      </Field>
      <datalist id="merk-saran">
        {merkSaran.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <datalist id="tipe-saran">
        {tipeSaran.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <div className="flex items-center gap-3 sm:col-span-4">
        <button type="submit" disabled={pending} className={btn}>
          {pending ? "Menyimpan…" : editing ? "Simpan perangkat" : "Tambah perangkat"}
        </button>
        {editing && (
          <Link href={`/merchants/${initial.merchantId}`} className="text-sm text-zinc-500 hover:underline">
            Batal
          </Link>
        )}
        <Message state={state} />
      </div>
    </form>
  );
}
