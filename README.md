# BetterMe

BetterMe adalah web statis ringan yang dirancang untuk platform pengumpulan tugas dan pengelolaan materi perkuliahan. Templat ini dibangun menggunakan HTML, CSS, dan JavaScript murni tanpa ketergantungan pada *framework* atau proses *build* yang kompleks.

## Fitur Utama

- **Pengumpulan & Pelacakan Tugas**: Antarmuka untuk mengunggah tugas dan memantau status tenggat waktu (*deadline*).
- **Manajemen Materi Kuliah**: Akses terpusat untuk modul, dokumen perkuliahan, dan catatan dosen.
- **Manajemen Tugas Mandiri**: Fitur pencatatan sederhana untuk mengorganisasi daftar pekerjaan akademik harian.
- **Desain Responsif**: Layar menyesuaikan secara otomatis untuk perangkat seluler, tablet, dan desktop.
- **Tanpa Build Step**: Dapat dijalankan langsung di *browser* atau diunggah ke penyedia *hosting* statis.

## Struktur Proyek

```text
betterMe/
├── src/
│   ├── index.html       # Struktur halaman utama
│   ├── style.css        # Gaya visual dan tata letak
│   └── script.js        # Logika interaksi antarmuka
├── package.json         # Konfigurasi dependensi opsional (live-server)
└── README.md            # Dokumentasi proyek