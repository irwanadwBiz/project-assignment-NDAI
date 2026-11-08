# PRD: Pusat Kendali Merchant dan Perangkat EDC

Product Requirements Document v0.1 (Draf) | Project Assignment Course AI Engineer | November 2026

Dokumen ini diturunkan dari BRD "Pusat Kendali Jaringan Merchant dan Perangkat" dan diagram alur tim. Isinya sudah menyertakan perbaikan hasil analisis kesesuaian modul.

## 1. Ringkasan

Masalah. Gangguan EDC baru diketahui setelah merchant melapor, data transaksi, tiket, dan kunjungan terpisah, foto kunjungan hanya diarsipkan, dan laporan dibuat manual.

Solusi. Satu platform yang (1) menerima aduan merchant lewat chatbot, (2) mengelola aduan, penugasan, dan kunjungan teknisi, (3) mengubah foto kunjungan menjadi data terstruktur dengan Computer Vision, (4) memungkinkan supervisor dan manajer bertanya ke data dalam bahasa Indonesia (text-to-SQL), (5) mendeteksi anomali transaksi secara otomatis, dan (6) mengirim notifikasi serta ringkasan harian.

Tujuan terukur (dari BRD).

| ID | Tujuan | Target |
| --- | --- | --- |
| BO-01 | Anomali sampai teknisi ditugaskan | Di bawah 4 jam |
| BO-02 | Gangguan terdeteksi sebelum merchant melapor | Di atas 60% |
| BO-03 | Akurasi SQL pada set uji 30-50 pertanyaan | Di atas 90% |
| BO-04 | Jam kerja laporan manual yang dihemat | Minimal 70% |


Catatan: untuk tugas kuliah, angka ini menjadi target demonstrasi pada data simulasi, bukan klaim produksi.

## 2. Asumsi dan Ruang Lingkup

### 2.1 Asumsi penting

Aduan, Assignment, dan Kunjungan dibangun sebagai simulasi sistem tiket. BRD menempatkan pengganti sistem tiket di luar lingkup dan menganggap sistem tiket sudah ada. Di proyek ini modul tersebut dibuat sebagai pengganti sementara (mock) agar alur end-to-end bisa didemokan. Pada implementasi nyata modul ini diganti API sistem tiket.

Data transaksi, master merchant dan perangkat, tiket, dan keluhan memakai data sintetis dengan ID konsisten (MRC-xxxxxx, EDC-xxxxx).

Teknisi memiliki ponsel berkamera dan koneksi memadai.

Vanya (chatbot intake aduan merchant) dan Vanna (text-to-SQL untuk tanya-jawab data) adalah dua komponen berbeda.

### 2.2 Dalam lingkup (MVP)

Autentikasi, RBAC per peran dan wilayah, audit log

Intake aduan via Vanya, manajemen aduan, assignment, kunjungan

CV scoring foto kunjungan beserta antrean cek manusia

Tanya Data (Vanna) untuk supervisor dan manajer

Deteksi anomali (rule-based sebagai baseline, ML sebagai peningkatan)

Report dan dashboard, notifikasi via n8n

### 2.3 Di luar lingkup

Keputusan akhir blokir perangkat, penangguhan merchant, atau dugaan fraud tanpa persetujuan manusia

Pengganti sistem inti transaksi

Pengenalan wajah dan penulisan data ke database transaksi

Agen triase otomatis penuh, prediksi kerusakan, rekomendasi rute (Fase 2-3 BRD)

## 3. Peran Pengguna dan Hak Akses

| Peran | Tujuan | Cakupan data |
| --- | --- | --- |
| Merchant / Customer | Melapor gangguan dan menerima kabar penanganan | Aduan miliknya sendiri |
| Supervisor Wilayah | Menentukan prioritas, menyetujui dan menugaskan aduan | Hanya wilayahnya |
| Teknisi Lapangan | Mengerjakan kunjungan dan mengunggah foto | Tugas yang ditugaskan kepadanya |
| Manajer Operasional | Ringkasan harian dan perbandingan antarwilayah | Semua wilayah |
| Analis Data | Mengelola data latih, ambang anomali, dan koreksi SQL | Data analitik (dengan masking) |
| Superadmin | Mengelola akun, peran, dan wilayah | Konfigurasi sistem |


Peran Analis Data ditambahkan karena ada di diagram tetapi sebelumnya tidak punya antarmuka. Peran review antrean cek manusia dipegang Supervisor Wilayah untuk foto wilayahnya, dan Analis Data untuk koreksi data latih.

## 4. Daftar Modul dan Pemilik

Daftar modul direvisi dari 9 menjadi 12 supaya semua kebutuhan BRD punya pemilik.

| No | Modul | Isi utama | Pemilik | Ref BRD |
| --- | --- | --- | --- | --- |
| M1 | Autentikasi | Login, register oleh Superadmin | Orang 4 | BR-10 |
| M2 | RBAC | Hak akses per peran dan wilayah | Orang 4 | BR-10, BRL-07 |
| M3 | Audit Log dan Data Masking | Catat pertanyaan, SQL, tindakan, persetujuan; masking data sensitif | Orang 4 | BR-11, UAT-07 |
| M4 | Aduan | Daftar, detail, dan status aduan | Orang 5 | Simulasi tiket |
| M5 | Assignment | Supervisor menyetujui dan menugaskan teknisi, alur reassign | Orang 5 | BR-09 |
| M6 | Kunjungan | Daftar, detail, form kunjungan, upload foto | Orang 5 | BR-01 |
| M7 | CV Scoring dan Antrean Cek Manusia | Ekstraksi foto, skor keyakinan, validasi, review | Orang 1 | BR-01, BR-02, BRL-01, BRL-05 |
| M8 | Vanya (Intake Aduan) | Chatbot aduan merchant | Orang 2 | Fase 2 BRD, diperlukan alur tim |
| M9 | Vanna (Tanya Data) | Text-to-SQL bahasa Indonesia | Orang 2 | BR-04, BRL-06 |
| M10 | Anomali | Rule-based harian dan ML | Orang 6 | BR-05, BRL-02, BRL-03 |
| M11 | Report dan Dashboard | Ringkasan harian, antarwilayah, aduan, kunjungan | Orang 6 | BR-06, BO-04 |
| M12 | Notifikasi (n8n) | Jadwal harian, alert, notifikasi ke merchant dan teknisi | Orang 3 | BR-05, BR-06 |


## 5. Alur Utama

### 5.1 Alur Aduan

Merchant meminta bantuan ke Vanya.

Vanya meminta data: nama pelapor (teks, wajib), merchant number (teks, wajib), konfirmasi data merchant (ya/tidak), keluhan (teks, wajib), foto serial number (gambar, wajib), foto pendukung keluhan (gambar, opsional), dan pernyataan penutup (ya/tidak).

Merchant number dinormalisasi: trim, ubah ke huruf kapital, lalu validasi format MRC-xxxxxx ke master merchant. Jika tidak ditemukan, Vanya meminta ulang.

Serial number pada foto dibaca (OCR) dan dicocokkan ke perangkat_id milik merchant. Jika tidak cocok atau tidak terbaca, aduan ditandai perlu verifikasi.

Aduan dibuat dengan status Created.

Supervisor wilayah menerima daftar aduan, lalu menyetujui (Assigned) atau menolak dengan alasan (Rejected by Supervisor).

Teknisi menerima tugas lalu menerima (In Progress) atau menolak dengan alasan (Rejected by Technician, kembali ke supervisor untuk reassign).

Teknisi mengisi detail kunjungan (lihat 5.2).

Setelah kunjungan selesai, aduan berstatus Resolved atau Unresolved, lalu merchant dinotifikasi.

Status aduan: Created → Assigned → In Progress → Resolved / Unresolved. Cabang: Rejected by Supervisor, Rejected by Technician (kembali ke Created untuk reassign).

### 5.2 Alur Kunjungan dan CV Scoring

Kunjungan dapat dipicu dari aduan atau dari anomali (supervisor membuat kunjungan dari peringatan).

Teknisi mengisi form kunjungan dan mengunggah foto (lihat 7 jenis foto di bagian 5.3).

Sistem menjalankan validasi cepat kualitas foto.

Jika foto buram atau ID perangkat tidak terbaca → ditolak, teknisi diminta unggah ulang (BRL-05).

CV mengekstrak data dan skor keyakinan per bidang.

Jika semua bidang ≥ 0,80 → otomatis lolos.

Jika ada bidang < 0,80 → masuk antrean cek manusia (BRL-01); reviewer mengoreksi atau meminta unggah ulang.

Jika ID perangkat di foto berbeda dari data merchant → masuk antrean cek manusia.

Hasil validasi disimpan; koreksi reviewer disimpan sebagai data latih.

Status kunjungan: Scheduled → In Progress → Submitted → (Photo Rejected / Pending Human Review) → Validated → Completed.

Target kinerja: foto menjadi data terstruktur di bawah 1 menit.

### 5.3 Foto kunjungan

| No | Foto | Jenis | Diproses AI |
| --- | --- | --- | --- |
| 1 | Perangkat utuh dari depan | Wajib | Ya |
| 2 | Label ID perangkat | Wajib | Ya |
| 3 | Layar menyala (firmware) | Wajib | Ya |
| 4 | Kabel dan koneksi | Wajib | Ya |
| 5 | Stiker QRIS dan area kasir | Wajib | Ya |
| 6 | Kerusakan (jarak dekat) | Bila ada masalah | Tidak |
| 7 | Hasil uji transaksi | Bila ada masalah | Tidak |


Pemetaan ke istilah di flow aduan (untuk disepakati tim): foto before = foto 1 dan 6 (kondisi awal), foto after = foto 7 (bukti berfungsi setelah perbaikan). Form kunjungan wajib mengikuti tabel ini.

### 5.4 Alur Monitoring Anomali

Data transaksi masuk ke database analitik (data golden).

Setiap pagi, aturan baku dijalankan: transaksi 7 hari turun lebih dari 30% terhadap rata-rata 4 minggu (ambang dapat diatur, BRL-02).

Jika merchant memiliki aduan atau tiket terbuka → prioritas tinggi (BRL-03).

Anomali lain: lonjakan transaksi gagal, perangkat senyap, kunjungan berulang untuk masalah sama, foto tidak sesuai data.

Model ML (peningkatan) memberi skor anomali tambahan dan dibandingkan dengan baseline rule-based.

Temuan tampil di dashboard anomali dan ringkasan 5 baris dikirim ke manajer lewat n8n.

Temuan dikelompokkan per seri, wilayah, dan firmware. Hipotesis penyebab berstatus saran (BRL-08).

Supervisor dapat membuat kunjungan dari temuan.

## 6. Kebutuhan Fungsional per Modul

Prioritas: M = Must (MVP), S = Should, C = Could.

### M1 Autentikasi (Orang 4)

| ID | Kebutuhan | P |
| --- | --- | --- |
| M1-01 | Login dengan email/username dan kata sandi; kata sandi disimpan ter-hash | M |
| M1-02 | Register akun hanya oleh Superadmin | M |
| M1-03 | Sesi berbasis token dengan masa berlaku dan logout | M |
| M1-04 | Reset kata sandi | C |


### M2 RBAC (Orang 4)

| ID | Kebutuhan | P |
| --- | --- | --- |
| M2-01 | Setiap pengguna memiliki satu peran dan nol atau lebih wilayah | M |
| M2-02 | Supervisor hanya melihat aduan, kunjungan, dan data wilayahnya (BRL-07) | M |
| M2-03 | Teknisi hanya melihat tugas miliknya | M |
| M2-04 | Manajer melihat semua wilayah, hanya baca | M |
| M2-05 | Pembatasan diterapkan di sisi server (API dan query), bukan hanya menyembunyikan menu | M |


### M3 Audit Log dan Masking (Orang 4)

| ID | Kebutuhan | P |
| --- | --- | --- |
| M3-01 | Catat setiap pertanyaan Tanya Data, SQL hasil, pengguna, waktu, dan jumlah baris | M |
| M3-02 | Catat perubahan status aduan, assignment, persetujuan, dan koreksi manusia | M |
| M3-03 | Audit log tidak dapat diubah oleh pengguna biasa | M |
| M3-04 | Samarkan nama pemilik, nomor kartu, dan kontak sebelum data masuk ke model | M |
| M3-05 | Halaman penelusuran log untuk Superadmin dan Analis Data | S |


### M4 Aduan (Orang 5)

| ID | Kebutuhan | P |
| --- | --- | --- |
| M4-01 | Aduan dibuat otomatis dari Vanya dengan status Created | M |
| M4-02 | Supervisor melihat daftar aduan wilayahnya dengan filter status dan prioritas | M |
| M4-03 | Supervisor dapat menyetujui atau menolak aduan dengan alasan | M |
| M4-04 | Detail aduan menampilkan data pelapor, keluhan, foto, dan riwayat status | M |
| M4-05 | Teknisi mengisi detail aduan: customer, keluhan, action taken, foto before, foto after, status Resolved/Unresolved, dan catatan | M |


### M5 Assignment (Orang 5)

| ID | Kebutuhan | P |
| --- | --- | --- |
| M5-01 | Supervisor memilih teknisi dari daftar teknisi wilayahnya | M |
| M5-02 | Teknisi dapat menerima atau menolak tugas; penolakan wajib beralasan | M |
| M5-03 | Penolakan teknisi mengembalikan tugas ke supervisor untuk reassign | M |
| M5-04 | Tampilkan beban kerja teknisi (jumlah tugas aktif) saat memilih | S |
| M5-05 | Waktu dari aduan atau anomali sampai teknisi ditugaskan dihitung untuk BO-01 | S |


### M6 Kunjungan (Orang 5)

| ID | Kebutuhan | P |
| --- | --- | --- |
| M6-01 | Daftar kunjungan teknisi dengan status | M |
| M6-02 | Form kunjungan memuat 5 slot foto wajib dan 2 slot foto kondisional | M |
| M6-03 | Setiap foto otomatis dikaitkan dengan ID merchant dan ID perangkat | M |
| M6-04 | Kunjungan dapat dibuat dari aduan atau dari anomali | M |
| M6-05 | Tampilkan hasil validasi CV dan permintaan unggah ulang pada kunjungan | M |
| M6-06 | Aturan foto (tidak memotret wajah, kartu, PIN) ditampilkan sebelum unggah | S |


Pembedaan antarmuka: Laporan Aduan (M4-05) berisi tindakan dan hasil penanganan, sedangkan Laporan Kunjungan (M6) berisi foto untuk CV. Keduanya terhubung ke aduan/kunjungan yang sama dan tidak berdiri sendiri-sendiri.

### M7 CV Scoring dan Antrean Cek Manusia (Orang 1)

| ID | Kebutuhan | P |
| --- | --- | --- |
| M7-01 | Validasi kualitas foto (buram, gelap) saat unggah | M |
| M7-02 | Ekstraksi: ID perangkat terbaca, kondisi fisik, kelengkapan (stiker QRIS, kabel, kertas struk), kualitas foto | M |
| M7-03 | Output JSON terstruktur dengan skor keyakinan per bidang | M |
| M7-04 | Foto tanpa ID perangkat terbaca ditolak dan diminta unggah ulang (BRL-05) | M |
| M7-05 | Keyakinan < 0,80 di bidang mana pun masuk antrean cek manusia (BRL-01) | M |
| M7-06 | Cocokkan ID terbaca dengan ID perangkat di master merchant; ketidakcocokan masuk antrean | M |
| M7-07 | Halaman antrean cek manusia: lihat foto, hasil ekstraksi, koreksi, setujui, atau minta unggah ulang | M |
| M7-08 | Koreksi reviewer disimpan sebagai data latih | S |
| M7-09 | Baca versi firmware dari foto layar | S |
| M7-10 | Foto yang memuat wajah diburamkan atau ditolak; wajah tidak disimpan | S |


Catatan teknis: YOLO cocok untuk mendeteksi objek (retak, stiker QRIS, kabel), tetapi tidak membaca teks. Untuk ID perangkat dan firmware gunakan OCR atau model multimodal (VLM) dengan output JSON. Pendekatan yang disarankan: YOLO + OCR, atau VLM saja, lalu bandingkan akurasinya di laporan akhir.

Contoh output:

{  "kunjungan_id": "KJ-20261101-0043",  "merchant_id": "MRC-004120",  "perangkat_id": "EDC-77455",  "id_perangkat_terbaca": null,  "kondisi_fisik": "rusak_ringan",  "kelengkapan": {"stiker_qris": false, "kabel_daya": true, "kertas_struk": null},  "kualitas_foto": "buram",  "keyakinan": {"id_perangkat": 0.35, "kondisi_fisik": 0.62, "kelengkapan": 0.48},  "status_validasi": "perlu_cek_manusia",  "tindakan_disarankan": "Minta teknisi unggah ulang foto label perangkat."}

### M8 Vanya, Intake Aduan (Orang 2)

| ID | Kebutuhan | P |
| --- | --- | --- |
| M8-01 | Percakapan terpandu mengumpulkan data sesuai alur aduan (bagian 5.1) | M |
| M8-02 | Normalisasi dan validasi merchant number ke master merchant | M |
| M8-03 | Konfirmasi data merchant ke pelapor (ya/tidak) sebelum aduan dibuat | M |
| M8-04 | Terima foto serial number dan foto pendukung; baca S/N dan petakan ke perangkat_id | M |
| M8-05 | Isi foto dan teks dari merchant diperlakukan sebagai data, bukan instruksi (pertahanan prompt injection) | M |
| M8-06 | Tolak atau buramkan foto yang memuat wajah atau data kartu | S |
| M8-07 | Merchant menerima notifikasi status aduan (lewat M12) | S |


### M9 Vanna, Tanya Data (Orang 2)

| ID | Kebutuhan | P |
| --- | --- | --- |
| M9-01 | Pertanyaan bahasa Indonesia diubah menjadi SQL | M |
| M9-02 | Hasil ditampilkan sebagai tabel dan grafik; SQL dapat diperiksa | M |
| M9-03 | Hanya SELECT dengan batas jumlah baris (BRL-06); akun database read-only dan terpisah | M |
| M9-04 | Supervisor otomatis dibatasi ke wilayahnya (BRL-07) | M |
| M9-05 | Pakai view semantik, glosarium, dan pasangan pertanyaan-SQL sebagai data latih | M |
| M9-06 | Set uji 30-50 pertanyaan dengan target akurasi > 90% | M |
| M9-07 | Analis dapat mengoreksi SQL dan koreksi tersimpan sebagai data latih serta tercatat di audit log | S |
| M9-08 | Jawaban untuk query umum di bawah 15 detik | S |


### M10 Anomali (Orang 6)

| ID | Kebutuhan | P |
| --- | --- | --- |
| M10-01 | Pertanyaan baku dijalankan terjadwal setiap pagi | M |
| M10-02 | Anomali jika transaksi turun > 30% vs rata-rata 4 minggu; ambang dan periode dapat diatur | M |
| M10-03 | Prioritas tinggi jika merchant punya aduan atau tiket terbuka (BRL-03) | M |
| M10-04 | Deteksi tambahan: lonjakan gagal, perangkat senyap, kunjungan berulang, foto tidak sesuai data | S |
| M10-05 | Model ML (misalnya Isolation Forest atau forecasting sederhana) sebagai pembanding baseline rule-based, dengan perbandingan hasil | S |
| M10-06 | Pengelompokan temuan per seri, wilayah, firmware; hipotesis berstatus saran (BRL-08) | S |
| M10-07 | Pola janggal ditandai sebagai dugaan dan tidak memblokir otomatis (BRL-04) | S |


### M11 Report dan Dashboard (Orang 6)

| ID | Kebutuhan | P |
| --- | --- | --- |
| M11-01 | Dashboard real-time aduan dan kunjungan per wilayah | M |
| M11-02 | Dashboard anomali untuk manajer | M |
| M11-03 | Ringkasan harian 5 baris untuk manajer | M |
| M11-04 | Perbandingan antarwilayah | M |
| M11-05 | Ekspor laporan (CSV atau PDF) | C |


### M12 Notifikasi n8n (Orang 3)

| ID | Kebutuhan | P |
| --- | --- | --- |
| M12-01 | Jalankan jadwal harian anomali dan kirim ringkasan ke manajer lewat kanal yang dipakai (email, Teams, atau WhatsApp simulasi) | M |
| M12-02 | Peringatan kritis dikirim segera ke supervisor wilayah terkait | M |
| M12-03 | Notifikasi penugasan ke teknisi | M |
| M12-04 | Notify merchant saat aduan selesai ("Notify Customer") | M |
| M12-05 | Notifikasi unggah ulang foto ke teknisi | S |
| M12-06 | Log pengiriman dan percobaan ulang bila gagal | S |


## 7. Antarmuka per Peran

| Peran | Menu |
| --- | --- |
| Superadmin | Manajemen Pengguna, Peran dan Wilayah, Audit Log |
| Supervisor Wilayah | Dashboard, Daftar Aduan, Assignment, Antrean Cek Manusia, Tanya Data |
| Teknisi | Dashboard, Daftar Tugas (Aduan dan Kunjungan), Detail Kunjungan, Upload Foto Kunjungan, Laporan Aduan |
| Manajer Operasional | Dashboard, Laporan Anomali, Laporan Aduan Wilayah, Laporan Kunjungan, Tanya Data |
| Analis Data | Koreksi SQL, Data Latih, Pengaturan Ambang Anomali, Antrean Koreksi CV |
| Merchant | Chat Vanya (tanpa login aplikasi) |


## 8. Model Data (Tingkat Tinggi)

| Tabel | Kolom utama |
| --- | --- |
| users | id, nama, email, password_hash, role, aktif |
| regions | id, nama |
| user_regions | user_id, region_id |
| merchants | merchant_id (MRC-xxxxxx), nama, region_id, status |
| devices | perangkat_id (EDC-xxxxx), merchant_id, seri, firmware, tanggal_pasang, serial_number |
| transactions_daily | tanggal, merchant_id, perangkat_id, jumlah, nilai, gagal |
| complaints | id, merchant_id, perangkat_id, nama_pelapor, keluhan, status, prioritas, sumber (vanya/anomali), dibuat_pada |
| complaint_attachments | id, complaint_id, jenis (serial/pendukung), path |
| assignments | id, complaint_id, supervisor_id, teknisi_id, status, alasan_penolakan, waktu |
| visits | kunjungan_id, complaint_id (nullable), anomaly_id (nullable), teknisi_id, status, action_taken, hasil (resolved/unresolved), catatan |
| visit_photos | id, visit_id, jenis (1-7), path, kualitas |
| cv_results | id, visit_id, id_perangkat_terbaca, kondisi_fisik, kelengkapan (json), keyakinan (json), status_validasi |
| review_queue | id, cv_result_id, alasan, reviewer_id, koreksi (json), status |
| anomalies | id, merchant_id, perangkat_id, jenis, persentase_perubahan, skor_ml, prioritas, hipotesis, status |
| notifications | id, penerima, kanal, isi, status_kirim, waktu |
| audit_logs | id, user_id, aksi, pertanyaan, sql, objek, waktu |
| training_pairs | id, pertanyaan, sql, sumber (analis/koreksi), dibuat_oleh |


Syarat kualitas data: ID merchant dan ID perangkat konsisten di semua tabel.

## 9. Aturan Bisnis

| ID | Aturan | Konsekuensi |
| --- | --- | --- |
| BRL-01 | Keyakinan < 0,80 pada bidang mana pun | Antrean cek manusia |
| BRL-02 | Transaksi turun > 30% vs rata-rata 4 minggu (ambang dapat diatur) | Ditandai anomali |
| BRL-03 | Anomali pada merchant dengan aduan atau tiket terbuka | Prioritas tinggi |
| BRL-04 | Blokir perangkat, dugaan fraud, pesan massal, ubah status merchant | Wajib persetujuan supervisor |
| BRL-05 | Foto tanpa ID perangkat terbaca atau buram | Ditolak, unggah ulang |
| BRL-06 | Query dari Vanna | Hanya SELECT dengan batas baris |
| BRL-07 | Supervisor mengakses data | Hanya wilayahnya |
| BRL-08 | Hipotesis penyebab dari AI | Berstatus saran, bukan kepastian |


## 10. Kebutuhan Non-Fungsional

| Kategori | Target |
| --- | --- |
| Ekstraksi foto menjadi data | Di bawah 1 menit |
| Jawaban Tanya Data (query umum) | Di bawah 15 detik |
| Akurasi SQL pada set uji | Di atas 90% |
| Keterlacakan pertanyaan, SQL, tindakan | 100% tercatat |
| Keamanan | Akses hanya baca untuk Vanna, masking data, uji prompt injection |
| Privasi | Wajah tidak disimpan; kartu dan PIN tidak boleh terfoto |
| Kemudahan pakai | Teknisi dapat mengunggah foto tanpa pelatihan panjang |


## 11. Pembagian Tugas Tim

| Anggota | Modul | Keluaran utama |
| --- | --- | --- |
| Orang 1 | M7 | Pipeline CV, antrean cek manusia, evaluasi akurasi |
| Orang 2 | M8, M9 | Chatbot Vanya, text-to-SQL Vanna, set uji SQL |
| Orang 3 | M12 | Workflow n8n, jadwal harian, notifikasi |
| Orang 4 | M1, M2, M3 | Auth, RBAC per wilayah, audit log dan masking |
| Orang 5 | M4, M5, M6 | Simulasi tiket: aduan, assignment, kunjungan |
| Orang 6 | M10, M11 | Anomali rule-based dan ML, dashboard dan laporan |


Beban Orang 2 cukup berat (dua komponen AI). Jika perlu, Vanya dapat dipindah ke Orang 5 karena dekat dengan modul Aduan, dan Orang 2 fokus ke Vanna.

Ketergantungan antarmodul: M1-M2 harus selesai lebih dulu (dipakai semua modul). M6 bergantung pada M7 untuk hasil validasi. M10 dan M11 bergantung pada data sintetis dari tim data. M12 bergantung pada M4, M5, M10.

## 12. Kriteria Penerimaan (UAT)

| ID | Skenario | Kriteria lulus |
| --- | --- | --- |
| UAT-01 | Teknisi mengunggah foto jelas | Data terstruktur tersimpan dalam 1 menit |
| UAT-02 | Teknisi mengunggah foto buram | Diminta unggah ulang atau masuk antrean cek |
| UAT-03 | Supervisor bertanya tentang wilayahnya | Jawaban benar dan SQL ditampilkan |
| UAT-04 | Supervisor bertanya tentang wilayah lain | Akses ditolak atau data tersaring |
| UAT-05 | Penurunan transaksi melewati ambang | Peringatan terkirim dan masuk ringkasan harian |
| UAT-06 | Tindakan berisiko dibuat | Tidak berjalan sebelum persetujuan supervisor |
| UAT-07 | SQL dikoreksi analis | Tersimpan sebagai data latih dan tercatat di audit log |
| UAT-08 | Merchant melapor lewat Vanya dengan merchant number huruf kecil | Dinormalisasi, divalidasi, aduan terbentuk |
| UAT-09 | Teknisi menolak tugas | Kembali ke supervisor dan bisa di-reassign |
| UAT-10 | ID di foto berbeda dari data perangkat | Masuk antrean cek manusia |


## 13. Risiko dan Pertanyaan Terbuka

| Risiko | Mitigasi |
| --- | --- |
| SQL salah pada query kompleks | View semantik, set uji, tampilkan SQL, koreksi jadi data latih |
| Foto berkualitas buruk | Validasi saat unggah dan antrean cek manusia |
| Korelasi dianggap sebab-akibat | Hipotesis berstatus saran, verifikasi lapangan |
| Data sensitif bocor ke model | Masking, akses minimum |
| Prompt injection lewat foto atau keluhan | Pisahkan data dan instruksi, alat agen terbatas |
| Peringatan berlebihan | Ambang dapat diatur, pengelompokan temuan |


Pertanyaan terbuka untuk tim:

Kanal notifikasi mana yang didemokan (email, Telegram, WhatsApp simulasi)?

Pemetaan foto before/after ke 7 jenis foto BRD sudah disepakati?

Pendekatan CV: YOLO + OCR atau VLM?

Siapa penyedia data sintetis (transaksi, master, tiket) dan kapan siap?

Siapa nama anggota untuk Orang 1 sampai Orang 6?

## 14. Tingkat Kesulitan Pengerjaan

Skala 1-5: 1 = mudah, 2 = cukup mudah, 3 = sedang, 4 = sulit, 5 = sangat sulit. Teknis mencakup coding, model, integrasi, dan infrastruktur. Non-teknis mencakup analisis, desain alur dan UI, data sintetis, pelabelan, dokumentasi, dan pengujian. Ini perkiraan awal untuk membantu pembagian beban, bukan ukuran pasti.

### 14.1 Per modul

| Modul | Teknis | Non-teknis | Alasan utama |
| --- | --- | --- | --- |
| M1 Autentikasi | 2 | 1 | Pola standar (login, hash, token); hampir tanpa analisis |
| M2 RBAC | 3 | 2 | Pembatasan per wilayah harus dipaksakan di sisi server; perlu matriks hak akses yang rapi |
| M3 Audit Log dan Masking | 3 | 2 | Log mudah, tetapi masking sebelum data masuk model dan aturan privasi butuh ketelitian |
| M4 Aduan | 2 | 3 | CRUD biasa; beratnya di desain status dan alur persetujuan |
| M5 Assignment | 2 | 2 | Logika sederhana, tetapi cabang reject dan reassign perlu dipikirkan |
| M6 Kunjungan | 3 | 2 | Upload banyak foto, 7 slot foto, dan integrasi dengan hasil CV |
| M7 CV Scoring dan Antrean Cek Manusia | 5 | 3 | Ekstraksi ID, kondisi, dan firmware dari foto; kalibrasi skor keyakinan; antrean review. Non-teknis: mengumpulkan atau membuat foto contoh dan melabelinya |
| M8 Vanya (Intake) | 4 | 3 | Alur dialog bertahap, OCR serial number, validasi ke master, pertahanan prompt injection; perlu skrip percakapan |
| M9 Vanna (Tanya Data) | 5 | 4 | Text-to-SQL, view semantik, penjagaan read-only dan wilayah, target akurasi > 90%. Non-teknis berat: menyusun 30-50 pasang pertanyaan-SQL dan glosarium |
| M10 Anomali | 3 (rule-based) / 4 (ML) | 3 | Rule-based mudah; ML butuh data yang punya pola. Non-teknis: membuat data sintetis dengan pola anomali (misalnya firmware bermasalah) |
| M11 Report dan Dashboard | 3 | 3 | Query dan visualisasi tidak sulit, tetapi menentukan metrik dan tampilan yang berguna butuh analisis |
| M12 Notifikasi (n8n) | 2 | 2 | Workflow low-code; kesulitan ada di koordinasi trigger dengan modul lain |


### 14.2 Pekerjaan lintas modul (sering terlupa)

| Pekerjaan | Jenis | Kesulitan | Catatan |
| --- | --- | --- | --- |
| Data sintetis (transaksi, master, tiket, foto contoh) | Non-teknis | 4 | Semua modul bergantung padanya; sebaiknya dikerjakan lebih awal |
| Definisi API dan skema database bersama | Teknis | 3 | Mencegah modul saling menunggu |
| Integrasi end-to-end (aduan sampai notifikasi) | Teknis | 4 | Rawan masalah di sambungan antarmodul |
| Pengujian UAT-01 sampai UAT-10 | Non-teknis | 3 | Perlu skenario dan data uji |
| Laporan akhir, slide, dan demo | Non-teknis | 3 | Butuh perbandingan hasil (misalnya YOLO + OCR vs VLM, rule-based vs ML) |


### 14.3 Beban per anggota

| Anggota | Modul | Teknis | Non-teknis | Kesimpulan |
| --- | --- | --- | --- | --- |
| Orang 1 | M7 | 5 | 3 | Berat di teknis; butuh bantuan pelabelan dan foto contoh |
| Orang 2 | M8, M9 | 5 | 4 | Paling berat; pertimbangkan memindahkan Vanya ke Orang 5 |
| Orang 3 | M12 | 2 | 2 | Paling ringan; bisa membantu data sintetis atau pengujian |
| Orang 4 | M1, M2, M3 | 3 | 2 | Sedang; fondasi yang harus selesai paling awal |
| Orang 5 | M4, M5, M6 | 2-3 | 3 | Sedang, banyak layar tetapi logika sederhana; cocok menampung Vanya |
| Orang 6 | M10, M11 | 3-4 | 3 | Sedang ke berat, terutama jika ML dikerjakan |


### 14.4 Saran penyeimbangan

Pindahkan Vanya ke Orang 5 agar Orang 2 fokus pada Vanna.

Beri Orang 3 tugas tambahan: koordinasi data sintetis dan skenario UAT, karena beban teknisnya paling ringan.

Dahulukan M1-M2 dan data sintetis dalam minggu pertama karena menjadi ketergantungan semua modul.

Kerjakan rule-based dulu untuk M10, lalu tambahkan ML hanya jika waktu cukup.

Untuk M7, mulai dengan 20-30 foto contoh sejak awal supaya evaluasi akurasi tidak menjadi hambatan di akhir.
