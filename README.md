# Simple Login Page

Halaman login sederhana dengan Angular 22 yang terintegrasi ke API `authV5`.

Dokumentasi lengkap (arsitektur, alur login, API, error handling, testing, dan panduan
pengembangan) tersedia di [DOCUMENTATION.md](DOCUMENTATION.md).

## Fitur

- Form **User Server**, **User ID**, dan **Password** dengan validasi required, tidak boleh hanya spasi, dan batas panjang.
- Tampilkan/sembunyikan password.
- Integrasi `POST http://cool.uruz.id/api/authV5`.
- Navigasi ke dashboard setelah login berhasil, redirect kembali ke halaman tujuan melalui `returnUrl`, dan proteksi route dengan guard.
- Sesi disimpan di `sessionStorage` dan divalidasi masa berlaku token JWT-nya.
- Pesan error yang spesifik untuk kegagalan validasi, kredensial salah, gangguan server, masalah jaringan, dan User Server yang tidak dikenal.

## Menjalankan project

```bash
npm install
npm start
```

Buka `http://localhost:4200/`.

## Perintah lain

```bash
npm test          # unit test (Vitest)
npm run build     # production build
```

## Contoh kredensial 

| Field       | Nilai      |
| ----------- | ---------- |
| User Server | `myserver` |
| User ID     | `admin`    |
| Password    | `admin`    |

## Perilaku error

| Kondisi                                | Penanganan                                                                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Field kosong / hanya spasi             | Pesan validasi di bawah field terkait.                                                                                                 |
| Kredensial salah (HTTP 401/403)        | Pesan dari API ditampilkan pada alert, misalnya "Kombinasi id dan password yang anda masukkan salah."                                  |
| Request tidak valid (HTTP 400/422)     | Pesan dari API atau pesan validasi umum.                                                                                               |
| Gangguan server (HTTP 5xx)             | Pesan bahwa server sedang bermasalah beserta kode HTTP.                                                                                |
| Koneksi gagal (status 0)               | Pesan untuk memeriksa koneksi internet.                                                                                                |
| User Server tidak dikenal              | API tidak mengirim respons sama sekali. Client menghentikan request setelah 5 detik dan menampilkan pesan untuk memeriksa User Server. |
| Respons sukses tetapi body tidak valid | Login dianggap gagal dengan pesan dari API.                                                                                            |

Batas waktu request dapat diubah melalui `timeoutMs` di `src/app/core/config/api.config.ts`.

## Struktur singkat

```text
src/app/
  core/
    config/       konfigurasi endpoint dan timeout
    errors/       pemetaan error HTTP ke pesan yang ramah pengguna
    guards/       authGuard dan guestGuard
    models/       tipe request/response/session
    services/     AuthService (login, sesi, logout)
    validators/   validator notBlank
  features/
    login/        halaman login
    dashboard/    halaman setelah login
```

## Catatan teknis

API mengembalikan HTTP `201` dengan `status: "OK"` dan `token` saat login berhasil. Untuk `userServer` yang tidak dikenal, API tetap membuka koneksi tetapi tidak pernah mengirim respons; karena itu request dibatasi dengan operator `timeout` RxJS agar UI tidak berhenti di status "Memproses..." tanpa batas.
