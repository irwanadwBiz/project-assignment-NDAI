# Business Requirements Document (BRD)
## Pusat Kendali Jaringan Merchant dan Perangkat

**Versi:** 0.1 (Draf) | **Tanggal:** November 2026  
**Dokumen:** Business Requirements Document (BRD)  
**Inisiatif:** Pusat Kendali Jaringan Merchant dan Perangkat  

---

### Informasi Dokumen

| Atribut | Keterangan |
| :--- | :--- |
| **Nama dokumen** | Business Requirements Document (BRD) |
| **Inisiatif** | Pusat Kendali Jaringan Merchant dan Perangkat |
| **Versi** | v0.1 |
| **Tanggal** | Nov 2026 |
| **Perubahan** | Draf awal |

---

## 1. Latar Belakang dan Masalah Bisnis

| Masalah Saat Ini | Dampak Bisnis | Penyebab Utama |
| :--- | :--- | :--- |
| **Gangguan baru diketahui setelah merchant melapor** | Transaksi hilang, keluhan merchant, risiko merchant berhenti menggunakan EDC. | Tidak ada pemantauan proaktif lintas data secara otomatis. |
| **Data transaksi, tiket, dan kunjungan terpisah** | Penyebab massal (seperti bug firmware, degradasi jaringan) sulit terlihat lebih cepat. | Sistem berdiri sendiri (*siloed*), proses korelasi dilakukan manual. |
| **Laporan disusun manual oleh tim data** | Lambat dan sangat bergantung pada beberapa analis/orang tertentu. | Belum ada pelaporan atau pipeline analitik otomatis. |
| **Foto kunjungan hanya diarsipkan** | Kondisi fisik perangkat tidak bisa dianalisis secara terstruktur dan berkala. | Tidak ada ekstraksi data otomatis berbasis Computer Vision dari foto. |
| **Supervisor harus meminta data ke tim data** | Pengambilan keputusan tertunda, antrean permintaan analisis menumpuk. | Tidak ada akses tanya-jawab data mandiri (*self-service text-to-SQL*). |

---

## 2. Visi Solusi: Dari Reaktif ke Proaktif

```
[Kondisi Saat Ini: Reaktif]            ───►   [Target: Proaktif]
• Menunggu laporan dari merchant               • Anomali terdeteksi setiap pagi
• Data dikumpulkan secara manual               • Data tersatukan otomatis
• Foto kunjungan hanya menjadi arsip           • Foto menjadi data terstruktur (CV)
• Laporan mingguan atau bulanan                • Tanya-jawab data mandiri kapan saja (Vanna)
• Penyebab massal terlambat terlihat           • Penyebab massal terlihat dalam hitungan jam
```

---

## 3. Tujuan Bisnis dan Indikator Keberhasilan

| ID | Tujuan Bisnis | Indikator Keberhasilan | Target |
| :--- | :--- | :--- | :--- |
| **BO-01** | Mempercepat deteksi dan penanganan gangguan | Waktu dari anomali muncul sampai teknisi ditugaskan | Di bawah 4 jam |
| **BO-02** | Mengurangi gangguan yang diketahui dari laporan merchant | Gangguan terdeteksi sebelum merchant melapor | Di atas 60% |
| **BO-03** | Memberi supervisor akses data mandiri | Akurasi SQL pada set uji 30–50 pertanyaan | Di atas 90% |
| **BO-04** | Mengurangi beban pelaporan manual | Jam kerja pembuatan laporan yang dihemat | Turun minimal 70% |
| **BO-05** | Memulihkan volume transaksi lebih cepat | Pemulihan transaksi setelah tindakan | Dalam 7 hari pada mayoritas kasus |

> *Catatan:* Baseline diukur 2–4 minggu sebelum percontohan agar peningkatan performa dapat dibuktikan secara empiris.

---

## 4. Ruang Lingkup

### Fase 1: MVP Percontohan
- Ekstraksi foto kunjungan dengan Computer Vision.
- Tanya-jawab data untuk satu wilayah percontohan (Text-to-SQL).
- Laporan harian dan deteksi anomali sederhana.
- Antrean cek manusia (*human-in-the-loop*).

### Fase 2: Triase dan Persetujuan
- Agen triase otomatis dan pembuatan hipotesis penyebab masalah.
- Alur persetujuan supervisor untuk tindakan mitigasi.
- Integrasi keluhan merchant (misalnya via WhatsApp/chatbot).
- Perluasan cakupan implementasi ke semua wilayah.

### Fase 3: Prediktif
- Prediksi perangkat yang berisiko rusak (*predictive maintenance*).
- Rekomendasi jadwal dan rute dinamis untuk teknisi lapangan.
- Analitik kamera tambahan (dengan persetujuan).

### Di Luar Lingkup
- Keputusan akhir blokir perangkat, penangguhan merchant, atau penetapan fraud tanpa persetujuan manusia.
- Pengganti sistem inti transaksi dan sistem tiket utama.
- Pengenalan wajah (*face recognition*), pemantauan individu merchant/pelanggan, dan penulisan langsung ke database transaksi produksi.

---

## 5. Pemangku Kepentingan dan Persona Pengguna

### 5.1 Pemangku Kepentingan

| Pemangku Kepentingan | Peran | Kepentingan Utama | Keterlibatan |
| :--- | :--- | :--- | :--- |
| **Sponsor Bisnis** | Pemberi keputusan dan anggaran | Hasil bisnis dan pengendalian risiko operasional | Tinjauan bulanan |
| **Divisi Operasional Merchant** | Pemilik proses | Mengurangi gangguan EDC dan menjaga kepuasan merchant | Aktif |
| **Supervisor Wilayah** | Pengguna utama | Daftar prioritas penugasan dan persetujuan tindakan | Aktif |
| **Teknisi Lapangan** | Pengguna lapangan | Kemudahan unggah foto dan kejelasan daftar tugas | Aktif |
| **Tim Data dan Analitik** | Pengelola data latih | Akurasi query SQL, pemeliharaan model, dan view semantik | Aktif |
| **TI dan Keamanan** | Penyedia infrastruktur | Integrasi sistem, pembatasan akses, dan perlindungan data | Konsultatif |
| **Risiko dan Kepatuhan** | Pengawas regulasi | Kepatuhan audit, privasi data, dan UU PDP | Persetujuan |
| **Vendor Perangkat EDC** | Mitra perangkat | Penanganan cacat firmware dan ketersediaan suku cadang | Konsultatif |

### 5.2 Persona Pengguna

- **Supervisor Wilayah**  
  - *Tujuan:* Mengetahui merchant mana yang harus ditangani lebih dulu secara cepat.  
  - *Kendala:* Sering menunggu laporan berkala yang lambat dari tim data pusat.
- **Teknisi Lapangan**  
  - *Tujuan:* Unggah foto kunjungan dengan cepat dan mengetahui rincian tugas berikutnya.  
  - *Kendala:* Foto sering ditolak karena buram tanpa ada panduan langsung saat di lapangan.
- **Manajer Operasional**  
  - *Tujuan:* Mendapatkan ringkasan harian performa dan komparasi antarwilayah.  
  - *Kendala:* Pembuatan laporan manual memakan waktu lama dan sering terlambat.
- **Analis Data**  
  - *Tujuan:* Mengelola data latih AI, skema semantik, dan aturan batas (*threshold*) anomali.  
  - *Kendala:* Kewalahan menangani permintaan *ad-hoc query* berulang dari berbagai tim.

---

## 6. Proses Bisnis

### 6.1 Kondisi Saat Ini (As-Is: Reaktif)
1. **Merchant melapor gangguan** ke Call Center.
2. **Call Center mencatat keluhan** ke dalam sistem.
3. **Tiket gangguan dibuat** secara manual.
4. **Teknisi dijadwalkan** untuk melakukan kunjungan.
5. **Kunjungan dan foto diarsipkan** tanpa pemrosesan terstruktur lebih lanjut.

*Kelemahan As-Is:*
- **Terlambat:** Penanganan baru dimulai setelah transaksi terlanjur hilang.
- **Terpisah:** Data transaksi historis tidak dikaitkan saat tiket dibuat, sehingga pola kegagalan massal terlewat.
- **Tidak terpakai:** Foto kunjungan teknisi hanya menumpuk di media penyimpanan tanpa dianalisis.

### 6.2 Kondisi Target (To-Be: Proaktif)
1. **Unggah Foto:** Teknisi mengirimkan foto bukti kunjungan dan ID perangkat melalui aplikasi.
2. **Ekstraksi CV:** Model Computer Vision mengubah foto menjadi data terstruktur dilengkapi skor keyakinan (*confidence score*).
3. **Validasi:** Foto dengan skor keyakinan rendah dialihkan ke antrean verifikasi manusia (*human-in-the-loop*).
4. **Deteksi Anomali:** Mesin anomali mengeksekusi pemeriksaan berkala secara otomatis setiap pagi.
5. **Korelasi Data:** AI menganalisis relasi silang antara performa transaksi, tiket, dan kunjungan.
6. **Triase Agen:** Pengelompokan anomali, perumusan hipotesis penyebab masalah, penentuan prioritas, dan pembuatan draf tindakan.
7. **Persetujuan:** Supervisor meninjau dan menyetujui rekomendasi tindakan yang berisiko.
8. **Eksekusi & Pembelajaran:** Tiket penugasan diterbitkan otomatis, dan hasil umpan balik dicatat ke basis data latih.

> *Catatan:* Tindakan rutin berisiko rendah dapat berjalan otomatis, sedangkan tindakan berisiko selalu memerlukan persetujuan manusia.

---

## 7. Spesifikasi Foto Kunjungan & Computer Vision

### 7.1 Daftar Foto yang Diambil Setiap Kunjungan

| No | Jenis Foto | Tujuan dan Data yang Diperoleh | Status Wajib |
| :---: | :--- | :--- | :--- |
| **1** | Perangkat utuh dari depan | Kondisi fisik perangkat: mendeteksi retak, penyok, layar mati. | Wajib (Diproses AI) |
| **2** | Label ID perangkat | Pencocokan nomor seri dengan master database; wajib terbaca jelas. | Wajib (Diproses AI) |
| **3** | Layar menyala (info firmware) | Membaca versi firmware untuk pelacakan anomali versi/rilis. | Wajib (Diproses AI) |
| **4** | Kabel dan koneksi | Mengecek kabel adaptor, slot SIM, port data, dan indikator sinyal. | Wajib (Diproses AI) |
| **5** | Stiker QRIS dan area kasir | Mengecek kelengkapan stiker QRIS, ketersediaan kertas struk, tata letak. | Wajib (Diproses AI) |
| **6** | Kerusakan (jarak dekat) | Bukti pendukung klaim garansi vendor atau penggantian unit EDC. | Bila ada masalah |
| **7** | Hasil uji transaksi | Bukti struk bahwa perangkat telah berfungsi normal pasca-perbaikan. | Bila ada masalah |

### 7.2 Contoh Hasil Ekstraksi JSON

#### Contoh 1: Keyakinan Tinggi (Otomatis Lolos)
```json
{
  "kunjungan_id": "KJ-20261101-0042",
  "merchant_id": "MRC-003917",
  "perangkat_id": "EDC-77120",
  "id_perangkat_terbaca": "EDC-77120",
  "kondisi_fisik": "baik",
  "kelengkapan": {
    "stiker_qris": true,
    "kabel_daya": true,
    "kertas_struk": true
  },
  "kualitas_foto": "baik",
  "catatan": "Layar menyala normal, tidak ada retak.",
  "keyakinan": {
    "id_perangkat": 0.98,
    "kondisi_fisik": 0.94,
    "kelengkapan": 0.91
  },
  "status_validasi": "otomatis_lolos"
}
```

#### Contoh 2: Keyakinan Rendah (Masuk Antrean Cek Manusia)
```json
{
  "kunjungan_id": "KJ-20261101-0043",
  "merchant_id": "MRC-004120",
  "perangkat_id": "EDC-77455",
  "id_perangkat_terbaca": null,
  "kondisi_fisik": "rusak_ringan",
  "kelengkapan": {
    "stiker_qris": false,
    "kabel_daya": true,
    "kertas_struk": null
  },
  "kualitas_foto": "buram",
  "catatan": "Label ID tertutup bayangan. Ada retakan di sudut layar.",
  "keyakinan": {
    "id_perangkat": 0.35,
    "kondisi_fisik": 0.62,
    "kelengkapan": 0.48
  },
  "status_validasi": "perlu_cek_manusia",
  "tindakan_disarankan": "Minta teknisi unggah ulang foto label perangkat."
}
```

### 7.3 Aturan Pengambilan Foto
- **Aturan Pemotretan:**
  - Ambil tegak lurus dari depan, tidak miring, dan dengan pencahayaan merata.
  - Hindari bayangan tangan dan pantulan cahaya (*glare*) pada layar EDC.
  - **Dilarang memotret wajah pelanggan/staf;** jika terekam, sistem wajib memburamkan (*blur*) atau menolak foto.
  - **Dilarang memotret nomor kartu pelanggan, kode PIN, atau data sensitif kartu.**
  - Setiap foto harus terasosiasi langsung dengan ID merchant dan ID perangkat saat proses unggah.
- **Data yang Diekstrak:** ID perangkat, kondisi fisik, kelengkapan (QRIS/kabel/kertas), kualitas foto, serta skor keyakinan per bidang.
- **Kriteria Penolakan:** Foto buram atau label ID tidak terbaca akan ditolak otomatis dan diminta unggah ulang; foto dengan skor keyakinan `< 0.80` dialihkan ke antrean review manusia.

---

## 8. Skenario & Deteksi Anomali

### 8.1 Contoh Kasus: Anomali Firmware Bermasalah
Ilustrasi data anomali:
| Merchant | Transaksi 7 Hari | Rata-rata 4 Minggu | Perubahan | Seri / Firmware |
| :--- | :---: | :---: | :---: | :--- |
| **MRC-003917** | 412 | 690 | -40% | X200 / v2.1 |
| **MRC-004120** | 188 | 330 | -43% | X200 / v2.1 |
| **MRC-005288** | 95 | 160 | -41% | X200 / v2.1 |

- **Temuan Pola:** 14 merchant di satu wilayah mengalami penurunan volume transaksi ~40% dalam 7 hari terakhir. 11 dari 14 merchant tersebut menggunakan EDC tipe `X200` dengan firmware versi `v2.1`. Sementara itu, perangkat bertipe sama dengan firmware `v2.3` di wilayah yang sama tetap berjalan stabil.
- **Hipotesis AI:** Pembaruan firmware v2.1 bermasalah pada stabilitas transaksi, bukan disebabkan oleh penurunan belanja konsumen atau masalah sinyal seluler lokal (status: *saran rekomendasi*).
- **Rekomendasi Tindakan:** Pembuatan tiket eskalasi massal ke vendor EDC dan teknisi wilayah untuk rollback/patching, serta notifikasi resmi ke merchant terdampak (wajib disetujui supervisor).

### 8.2 Skenario Anomali Lainnya
- **Lonjakan Transaksi Gagal:** Rasio kegagalan transaksi suatu perangkat naik drastis (contoh: dari 2% ke 25% dalam 1 hari).  
  *Tindakan:* Periksa konektivitas kabel/SIM; buat penugasan teknisi.
- **Perangkat Senyap (*Silent Device*):** Merchant yang biasanya memproses rata-rata 50 transaksi per hari tiba-tiba mencatat 0 transaksi selama 3 hari berturut-turut tanpa adanya laporan tiket.  
  *Tindakan:* Hubungi merchant untuk memastikan operasional toko; jadwalkan cek perangkat mati/rusak.
- **Kunjungan Berulang (*Repeat Visits*):** Satu EDC mengalami 3 kali perbaikan teknisi dalam kurun waktu 1 bulan dengan keluhan yang serupa.  
  *Tindakan:* Rekomendasikan penggantian unit EDC baru.
- **Foto Tidak Sesuai Data Master:** ID EDC fisik pada foto label berbeda dengan ID EDC yang terdaftar pada sistem master merchant.  
  *Tindakan:* Kirim ke antrean cek manusia untuk koreksi administrasi inventaris.
- **Pola Transaksi Janggal (*Potential Fraud/Abuse*):** Terdapat frekuensi transaksi tinggi dengan nominal seragam dalam waktu sangat singkat, atau transaksi di luar jam buka operasional toko.  
  *Tindakan:* Beri penanda dugaan anomali transaksi untuk diverifikasi tim risiko (tidak melakukan blokir sepihak secara otomatis).

---

## 9. Kebutuhan Bisnis (Business Requirements)

| ID | Deskripsi Kebutuhan Bisnis | Prioritas | Pemangku Kepentingan |
| :--- | :--- | :---: | :--- |
| **BR-01** | Sistem menerima foto kunjungan teknisi dan mengubahnya menjadi data terstruktur menggunakan Computer Vision. | Wajib | Teknisi, Tim Operasional |
| **BR-02** | Ekstraksi foto menyertakan skor keyakinan (*confidence score*); hasil dengan skor rendah ditinjau oleh manusia. | Wajib | Tim Operasional |
| **BR-03** | Data transaksi, tiket perbaikan, dan kunjungan disatukan dalam satu basis analitik terintegrasi. | Wajib | Tim TI & Data |
| **BR-04** | Pengguna bisnis dapat bertanya ke data dalam bahasa Indonesia secara mandiri tanpa menulis SQL (*Text-to-SQL*). | Wajib | Supervisor, Manajer |
| **BR-05** | Sistem menjalankan mesin deteksi anomali secara berkala setiap hari dan mengirimkan alert otomatis. | Wajib | Tim Operasional |
| **BR-06** | Ringkasan eksekutif harian dikirimkan ke manajer operasional melalui kanal komunikasi yang sudah digunakan. | Wajib | Manajer Operasional |
| **BR-07** | Sistem mengelompokkan temuan anomali serta memberikan hipotesis akar penyebab dan derajat prioritas penanganan. | Sebaiknya | Supervisor Wilayah |
| **BR-08** | Seluruh tindakan mitigasi yang berisiko operasional/finansial wajib mendapatkan persetujuan manusia sebelum dieksekusi. | Wajib | Sponsor Bisnis, Tim Risiko |
| **BR-09** | Tiket gangguan dan penugasan teknisi dibuat secara otomatis setelah draf anomali disetujui oleh supervisor. | Sebaiknya | Tim Operasional |
| **BR-10** | Hak akses data dibatasi secara ketat berdasarkan peran (*role*) dan wilayah operasional (*territory*) masing-masing. | Wajib | Tim TI & Keamanan |
| **BR-11** | Seluruh masukan pertanyaan, sintaks SQL yang di-generate, dan aksi persetujuan tercatat lengkap pada audit log. | Wajib | Tim Kepatuhan / Auditor |
| **BR-12** | Koreksi manual dari pengguna analis/supervisor disimpan kembali sebagai pasangan data latih model untuk perbaikan akurasi berkelanjutan. | Sebaiknya | Tim Data & Analitik |

---

## 10. Aturan Bisnis (Business Rules)

| ID | Aturan Bisnis | Konsekuensi & Penanganan |
| :--- | :--- | :--- |
| **BRL-01** | Skor keyakinan ekstraksi foto `< 0.80` pada bidang apa pun. | Hasil ekstraksi dialihkan ke antrean verifikasi manusia. |
| **BRL-02** | Rata-rata transaksi mingguan turun `> 30%` dibandingkan baseline rata-rata 4 minggu sebelumnya (*ambang batas dapat disesuaikan*). | Ditandai otomatis sebagai anomali transaksi. |
| **BRL-03** | Terjadi anomali pada merchant yang saat itu memiliki tiket gangguan terbuka (*open ticket*). | Prioritas tiket dinaikkan ke level *Tinggi* (*Urgent*). |
| **BRL-04** | Tindakan pemblokiran EDC, status terduga fraud, pengiriman blast pesan massal, atau perubahan status aktif merchant. | Wajib melalui otorisasi dan persetujuan supervisor (*Human-in-the-Loop*). |
| **BRL-05** | Foto kunjungan tidak menampilkan label ID perangkat yang dapat terbaca. | Foto ditolak otomatis oleh sistem; teknisi diminta mengambil ulang foto. |
| **BRL-06** | Eksekusi kueri Text-to-SQL oleh pengguna (Vanna). | Hanya diizinkan hak akses kueri baca (`SELECT`) dengan limitasi jumlah baris output. |
| **BRL-07** | Supervisor wilayah mengakses data analitik dan operasional. | Akses data dibatasi secara ketat hanya pada cakupan wilayah tanggung jawabnya. |
| **BRL-08** | Hasil analisis akar masalah (*root-cause*) dan hipotesis dari agen AI. | Berstatus sebagai saran rekomendasi pendukung keputusan, bukan keputusan mutlak. |

---

## 11. Kebutuhan Data dan Kualitas Data

| Sumber Data | Isi Utama Data | Pemilik Sistem | Frekuensi Update |
| :--- | :--- | :--- | :--- |
| **Transaksi Harian** | Jumlah volume, nilai transaksi (GMV), transaksi sukses vs gagal per merchant dan perangkat EDC. | Divisi Operasional Pembayaran | Harian (Daily Batch) |
| **Master Merchant & EDC** | Profil merchant, wilayah/cabang, serial number EDC, tipe/seri, versi firmware, tanggal instalasi. | Divisi Operasional Merchant | Berkala (Sync Batch) |
| **Sistem Tiket** | Nomor tiket gangguan, kategori problem, status progres penanganan, SLA, teknisi yang menangani. | Sistem Layanan Lapangan | Real-time / Webhook |
| **Foto Kunjungan** | Berkas foto asli kunjungan teknisi dan metadata hasil ekstraksi JSON dari model Computer Vision. | Aplikasi Teknisi & Sistem CV | Setiap kunjungan |
| **Keluhan Merchant** | Kanal komplain (Call Center, Chatbot), kategori aduan, catatan kronologis, waktu pelaporan. | Customer Service / Call Center | Real-time |
| **Data Latih AI** | Pasangan istilah bisnis, skema semantik, dan pasangan pertanyaan bahasa alami – query SQL terverifikasi. | Tim Data & Analitik | Berkala |

> **Syarat Kualitas Data:** Nomor identitas merchant (`merchant_id`) dan nomor perangkat (`perangkat_id`) harus menggunakan format ID standar yang konsisten dan terintegrasi di seluruh subsistem.

---

## 12. Arsitektur Solusi Tingkat Tinggi

```
+-----------------------------------------------------------------------------------+
| 1. SUMBER INPUT                                                                   |
|   [Aplikasi Teknisi]        [Sistem Tiket / Aduan]        [Database Transaksi]     |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
| 2. PENGOLAHAN & EKSTRAKSI                                                         |
|   • Model Multimodal / CV (Ekstraksi ID, Kondisi, Kelengkapan)                    |
|   • Perhitungan Skor Keyakinan (Confidence Score) & Validasi Ambang Batas         |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
| 3. PENYIMPANAN DATA (DATA STORAGE)                                                |
|   • Database Analitik & View Semantik                                             |
|   • Object Storage Berkas Foto                                                    |
|   • Vector Store & Pengetahuan Konteks (Untuk Pelatihan Query SQL)                |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
| 4. MESIN ANALITIK & KECERDASAN                                                    |
|   • Vanna AI: Text-to-SQL Bahasa Indonesia untuk Pertanyaan Mandiri               |
|   • Job Deteksi Anomali Terjadwal (Rule-based & Pola Statistik)                   |
|   • Agen Triase & Pembentukan Hipotesis                                           |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
| 5. AKSI & LAPORAN (ACTION & ENGAGEMENT)                                           |
|   • Antrean Review Manusia (Human-in-the-Loop) & Persetujuan Supervisor           |
|   • Pembuatan Penugasan Teknisi Otomatis                                          |
|   • Dasbor Ringkasan Harian & Alert Notifikasi (Email / Chat)                     |
+-----------------------------------------------------------------------------------+

[Lapisan Lintas Fungsi (Cross-Cutting Layer)]:
• Keamanan & Tata Kelola : SSO/Autentikasi, RBAC Peran & Wilayah, Data Masking, Audit Log Lengkap
• Orkestrasi Pipeline    : n8n / Skrip Terjadwal untuk Otomasi Laporan & Notifikasi
```

---

## 13. Kebutuhan Non-Fungsional (NFR)

| Kategori | Kebutuhan | Target Spesifikasi |
| :--- | :--- | :--- |
| **Kinerja Ekstraksi** | Waktu pemrosesan foto menjadi data terstruktur | `< 1 menit` per kunjungan |
| **Kinerja Tanya-Jawab** | Waktu respons kueri Text-to-SQL untuk pertanyaan umum | `< 15 detik` per pertanyaan |
| **Akurasi Query** | Akurasi sintaks SQL yang valid pada kumpulan pengujian standar | `> 90%` |
| **Ketersediaan (*Availability*)** | Tingkat ketersediaan layanan sistem pada jam operasional | `99.5%` uptime |
| **Skalabilitas** | Kapasitas pemrosesan perangkat dan foto per bulan (Fase 2) | Mendukung 10.000 perangkat & 50.000 foto/bulan |
| **Keterlacakan (*Traceability*)** | Pencatatan riwayat interaksi, eksekusi SQL, tindakan, dan approval | `100%` tercatat dalam audit log |
| **Kemudahan Penggunaan (*Usability*)** | Antarmuka unggah teknisi dan portal supervisor | Intuitif, dapat digunakan tanpa pelatihan teknis mendalam |

---

## 14. Keamanan, Privasi, dan Kepatuhan

- **Akses Hanya Baca (*Read-Only Access*):** Kredensial akun basis data yang dialokasikan untuk mesin Text-to-SQL dibatasi secara ketat hanya memiliki hak akses `SELECT`.
- **Batas Peran dan Wilayah (*Row-Level Security*):** Pemfilteran data diterapkan di tingkat basis data/layanan backend; supervisor hanya memiliki izin melihat merchant dan perangkat di wilayahnya.
- **Penyamaran Data (*Data Masking*):** Data sensitif pribadi seperti nama pemilik merchant, nomor telepon, dan data kartu disamarkan sebelum diteruskan ke model AI.
- **Perlindungan Privasi Foto:** Wajah staf/pelanggan tidak disimpan; berkas foto yang memuat wajah atau informasi kartu wajib diburamkan (*blurred*) atau ditolak saat validasi awal.
- **Kepatuhan UU Pelindungan Data Pribadi (UU PDP):** Penerapan audit kelayakan dan penilaian dampak privasi (*Privacy Impact Assessment*) sebelum solusi diluncurkan ke lingkungan produksi.
- **Audit dan Pertahanan Siber:** Seluruh rekam jejak kueri, masukan prompt, dan persetujuan direkam; sistem diuji terhadap potensi eksploitasi celah *prompt injection*.

---

## 15. Asumsi, Batasan, dan Ketergantungan

### Asumsi
1. Data agregasi transaksi, sistem tiket, dan master perangkat dapat diakses dan disatukan ke dalam satu repositori analitik.
2. Setiap teknisi lapangan dibekali perangkat ponsel berkamera layak dengan koneksi internet yang memadai saat bertugas.
3. Tersedia dukungan sponsor kepemimpinan dan setidaknya 1 wilayah percontohan terpilih untuk fase evaluasi awal.
4. Tersedia data riwayat transaksi dan keluhan minimal beberapa bulan terakhir untuk pembentukan baseline anomali.

### Batasan
1. Seluruh tindakan mitigasi yang berdampak finansial/operasional tetap mewajibkan intervensi otorisasi manusia.
2. Akses antarmuka Tanya Data tidak diberikan izin untuk manipulasi atau modifikasi data (*DML/DDL di-block*).
3. Hipotesis penyebab gangguan yang dihasilkan model merupakan alat bantu pendukung keputusan, bukan kepastian mutlak.
4. Citra foto kunjungan dilarang keras memuat identitas personal individu.

### Ketergantungan
1. Ketersediaan antarmuka integrasi (API / database webhook) dari sistem tiket yang saat ini berjalan.
2. Kebijakan tata kelola data perusahaan terkait pengiriman metadata ke penyedia API model eksternal.
3. Konsistensi penomoran identitas kunci (`merchant_id` dan `perangkat_id`) lintas subsistem.
4. Kesiapan tim analis data untuk melakukan kurasi kamus data semantik dan koreksi sampel data latih secara berkala.

---

## 16. Analisis Manfaat dan Komponen Biaya

### Kategori Manfaat
- **Kecepatan Penanganan:** Memangkas durasi dari kemunculan anomali hingga penugasan teknisi ke lapangan.
- **Penyelamatan Pendapatan:** Meminimalkan volume transaksi yang hilang akibat kerusakan EDC yang tidak terdeteksi.
- **Efisiensi Kerja:** Menghemat waktu operasional analis dan tim data dalam menyusun laporan harian/mingguan.
- **Kepuasan Merchant:** Menurunkan rasio *churn* merchant dan menurunkan jumlah eskalasi komplain masuk.
- **Kualitas Keputusan:** Mempercepat supervisor dalam menentukan prioritas merchant yang membutuhkan penanganan darurat.

### Komponen Biaya Proyek
- Lisensi konsumsi API model AI (Multimodal CV dan Large Language Models).
- Infrastruktur komputasi analitik, basis data, dan penyimpanan objek berkas foto (*cloud storage*).
- Biaya rekayasa perangkat lunak, integrasi API, dan *testing*.
- Biaya pelatihan pengguna akhir dan manajemen perubahan operasional (*change management*).
- Pemeliharaan sistem berkala dan kurasi pembaruan basis data latih.

> *Catatan:* Perhitungan estimasi kuantitatif dalam nilai Rupiah (ROI) difinalisasi setelah metrik baseline pada wilayah percontohan selesai diukur.

---

## 17. Manajemen Risiko dan Mitigasi

| Risiko | Dampak | Peluang | Rencana Mitigasi |
| :--- | :---: | :---: | :--- |
| **SQL salah pada kueri yang kompleks** | Tinggi | Sedang | Pembuatan *semantic views*, pengujian *golden set* 30–50 pertanyaan, transparansi tampilan SQL sebelum hasil disajikan, serta mekanisme koreksi manual yang menjadi data latih baru. |
| **Korelasi data disalahartikan sebagai hubungan sebab-akibat** | Sedang | Tinggi | Menetapkan seluruh hipotesis AI berstatus *saran/rekomendasi*; mewajibkan validasi fisik di lapangan sebelum tindakan penukaran unit skala besar. |
| **Kebocoran data sensitif ke penyedia model AI** | Tinggi | Rendah | Mengimplementasikan fungsi *data masking* sebelum data dikirim ke prompt; memanfaatkan instans model privat/enterprise yang mematuhi kepatuhan privasi data perbankan. |
| **Kualitas foto dari teknisi buram atau tidak memenuhi standar** | Sedang | Tinggi | Validasi ketajaman saat unggah di aplikasi teknisi dan penyediaan fitur antrean verifikasi manusia (*human-in-the-loop*). |
| **Notifikasi peringatan anomali terlalu banyak (*alert fatigue*)** | Sedang | Sedang | Menerapkan ambang batas deviasi yang dapat dikonfigurasi (*threshold adjustment*) dan pengelompokan (*grouping*) pola anomali serupa. |
| **Ketergantungan tinggi pada satu analis data** | Sedang | Sedang | Standardisasi dokumentasi arsitektur data semantik dan rotasi pelatihan pemeliharaan data latih di dalam tim. |
| **Potensi eksploitasi *Prompt Injection* via input teks/catatan foto** | Tinggi | Rendah | Pemisahan instruksi sistem dan payload masukan pengguna, pembatasan toolset agen yang sangat restriktif, serta kewajiban verifikasi manusia untuk aksi berisiko. |

---

## 18. Kriteria Penerimaan Pengguna (User Acceptance Testing - UAT)

| ID | Skenario Pengujian | Kriteria Keberhasilan (Lulus UAT) |
| :--- | :--- | :--- |
| **UAT-01** | Teknisi mengunggah foto kunjungan yang fokus dan jelas. | Data terekstraksi secara terstruktur dan tersimpan ke basis data dalam waktu `< 1 menit`. |
| **UAT-02** | Teknisi mengunggah foto label ID yang buram atau tertutup bayangan. | Sistem secara otomatis menolak foto dan meminta unggah ulang, atau meneruskannya ke antrean cek manual. |
| **UAT-03** | Supervisor mengajukan pertanyaan operasional dalam bahasa Indonesia mengenai data di wilayahnya. | Sistem memberikan jawaban analitik yang akurat disertai tampilan kueri SQL yang dieksekusi secara transparan. |
| **UAT-04** | Supervisor mencoba meminta laporan data merchant di luar wilayah operasional kewenangannya. | Sistem menolak akses kueri atau secara otomatis menyaring hasil hanya untuk wilayah miliknya. |
| **UAT-05** | Terjadi penurunan transaksi merchant melebihi ambang batas deviasi yang ditentukan (>30%). | Sistem mendeteksi anomali, menerbitkan peringatan ke sistem, dan mencantumkannya dalam ringkasan harian. |
| **UAT-06** | Sistem merumuskan rekomendasi penanganan yang tergolong berisiko tinggi. | Tindakan ditahan dalam status *pending* dan tidak dieksekusi sebelum disetujui secara eksplisit oleh supervisor. |
| **UAT-07** | Analis data melakukan koreksi atas kueri SQL yang kurang tepat dari Text-to-SQL. | Sintaks SQL perbaikan tersimpan ke basis data latih model dan seluruh aktivitas tercatat lengkap pada audit log. |

