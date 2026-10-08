-- The built-in public pages of ADR-0031. Each has its own layout in the app;
-- these rows carry the words and, through the gallery, the pictures.
--
-- The bodies are placeholders, and they say so. The owner replaces them from
-- the Halaman screen without a deploy (ADR-0020).

INSERT INTO pages (slug, title, body_markdown, is_published) VALUES
  (
    'rooms',
    'Daftar kamar',
    'Semua kamar yang dikelola, lengkap dengan harga dan fasilitasnya. Gunakan
filter untuk menyaring tipe, lantai, atau status.

Status kamar diperbarui otomatis dari catatan sewa, jadi tidak perlu diubah di
sini.

Kamar yang tertulis *tersedia* bisa langsung ditanyakan lewat WhatsApp.',
    1
  ),
  (
    'rules',
    'Aturan',
    '**Tulisan contoh.** Ganti bagian ini dari menu Halaman pada panel
pengelola.

Beberapa hal yang biasanya ditulis di sini:

- Jam tamu dan jam gerbang.
- Aturan kebersihan dan sampah.
- Kendaraan yang boleh dibawa masuk.
- Pembayaran dan tenggatnya.

Tulis satu aturan per baris dengan tanda minus di depan, seperti di atas.',
    1
  ),
  (
    'faq',
    'Pertanyaan yang sering ditanya',
    '**Tulisan contoh.** Ganti bagian ini dari menu Halaman pada panel
pengelola.

## Apakah ada uang jaminan?

Tidak ada uang jaminan yang diambil.

## Bagaimana cara membayar sewa?

Pembayaran bisa tunai atau transfer ke rekening yang tertera di halaman ini.

## Apakah harga sudah termasuk listrik dan air?

Tulis jawabannya di sini, dan sebutkan apa saja yang termasuk.',
    1
  ),
  (
    'contact',
    'Kontak',
    'Alamat, nomor WhatsApp, dan rekening pembayaran ada di bawah. Untuk
pertanyaan tentang kamar, gunakan formulir yang tersedia.

**Tulisan contoh.** Ganti bagian ini dari menu Halaman pada panel pengelola.',
    1
  );

-- The landing page body in local development held verification text (a pasted
-- script and a Markdown image). Replace only that text.
UPDATE pages
   SET body_markdown = '**Tulisan contoh.** Ganti bagian ini dari menu Halaman
pada panel pengelola.

Kost ini dekat dengan kampus, warung, dan halte. Tulis keunggulan properti di
sini dengan kalimat pendek.

- Kamar mandi dalam
- Parkir motor
- Dapur bersama'
 WHERE slug = 'home'
   AND body_markdown LIKE '%alert(1)%';
