# Cikal Design System

Design system untuk rebuild LOS (code name Cikal), disusun dari file Figma **LOS Product**:
<https://www.figma.com/design/765rmxZwfHj9KSV4qmzOj3/LOS-Product>

Isi Figma: 5 halaman.

| Halaman | Isi |
|---|---|
| Layout | Template `LayoutTop` (navigasi atas) dan `LayoutSide` (sidebar) |
| Components | Komponen master: Widget, Number, Navigation, Interaction, Content, Icons, LayoutElement |
| Guidelines | "Perkasa UI Guidelines": Home, Style (Color, Typography, Border-Spacing-Shadow), UI Pattern (Adaptive, Content, Interaction, Navigation, Number, Widget), popup cara pakai Brand/Semantic color |
| UI Flow - Web | 9 grup layar: Login and Dashboard, Data Entry, Application Inquiry, Document Checklist, User Access Management, Master Product, General Parameter, Master Geografis, Master RC |
| UI Flow - Mobile | Home, Profile, Change Password, Form Pengajuan (stepper), Form LKN |

## 0. Cara data ini diambil dan batasannya

File Figma dibuka tanpa login (mode view), jadi panel Inspect tidak tersedia.

- **Nama token, teks, ukuran font, nama komponen**: dibaca dari struktur layer Figma. Akurat.
- **Nilai warna**: diambil dari sampel piksel render kanvas. Toleransi sekitar 3 poin per kanal RGB. Beberapa palet ternyata identik dengan palet publik (lihat catatan per tabel), dan nilai palet publik itu yang dipakai di sini.
- **Nilai spacing, radius, dan shadow**: Figma hanya mencantumkan nama (S, Base, M, dst.), tidak ada angka. Guideline ini menyebut dirinya turunan **OutSystems UI**, jadi nilai di bawah memakai default OutSystems UI dan ditandai "perlu verifikasi".

Semua nilai bertanda **(verifikasi)** sebaiknya dicek ulang dengan akun Figma yang punya akses Inspect atau Dev Mode sebelum dipakai sebagai acuan final.

---

## 1. Prinsip

1. **Turunan OutSystems UI.** Struktur token, nama class (`background-primary`, `text-primary`, `--color-primary`), dan katalog pattern mengikuti OutSystems UI. Untuk rebuild di luar OutSystems, struktur ini dipertahankan supaya desain dan kode memakai istilah yang sama.
2. **Brand Perkasa.** Biru tua sebagai primary, hijau sebagai secondary, logo PERKASA putih di atas biru.
3. **Aplikasi kerja padat data.** Layar didominasi tabel, form dua kolom, dan kartu ringkasan. Warna dipakai untuk aksi dan status, bukan dekorasi.
4. **Web dan mobile berbagi token.** Mobile memakai warna, font, dan komponen yang sama dengan bentuk yang disesuaikan (header biru, sheet putih membulat, tombol penuh lebar).

---

## 2. Warna

### 2.1 Brand palette

Dipakai untuk aksi UI (button, link) dan state aktif.

| Token | Hex | Pemakaian |
|---|---|---|
| `--color-primary` | `#0C4FA0` (verifikasi) | Button utama, link, header sidebar/logo, judul halaman, state aktif menu, pagination aktif |
| `--color-primary-light` | `#BAD4F7` (verifikasi) | Background state aktif, highlight ringan, bar chart |
| `--color-secondary` | `#458F3A` (verifikasi) | Aksi sekunder, aksen hijau |
| `--color-secondary-light` | `#B6FCD1` (verifikasi) | Background ringan aksen hijau |

Class cara pakai (dari popup "How to use - Brand Palette"):

| Color | Background class | Text class | CSS variable |
|---|---|---|---|
| Primary | `background-primary` | `text-primary` | `--color-primary` |
| Primary Light | `background-primary-light` | `text-primary-light` | `--color-primary-light` |
| Secondary | `background-secondary` | `text-secondary` | `--color-secondary` |
| Secondary Light | `background-secondary-light` | `text-secondary-light` | `--color-secondary-light` |

### 2.2 Neutral palette

Dipakai untuk teks, border, background, dan shadow. Hasil sampel cocok dengan skala abu-abu Untitled UI, jadi nilai di bawah memakai nilai skala tersebut.

| Token | Hex | Pemakaian umum |
|---|---|---|
| `--color-neutral-0` | `#FFFFFF` | Background kartu, permukaan |
| `--color-neutral-1` | `#F2F4F7` | Background halaman, baris tabel selang-seling |
| `--color-neutral-2` | `#E4E7EC` | Divider, border tipis |
| `--color-neutral-3` | `#D0D5DD` | Border input |
| `--color-neutral-4` | `#98A2B3` | Placeholder, ikon nonaktif |
| `--color-neutral-5` | `#667085` | Teks sekunder, label |
| `--color-neutral-6` | `#475467` | Teks body |
| `--color-neutral-7` | `#344054` | Teks kuat |
| `--color-neutral-8` | `#1D2939` | Heading gelap |
| `--color-neutral-9` | `#101828` | Teks paling gelap |
| `--color-neutral-10` | `#000000` | Hitam murni |

### 2.3 Semantic palette

Menyampaikan arti atau status: Info, Success, Warning, Error. Dipakai di Alert, Feedback Message, Tag, dan lainnya. Setiap warna punya tiga turunan (lightest, light, base) yang terlihat di swatch.

| Token | Base | Light | Lightest |
|---|---|---|---|
| Info | `#0043CF` | `#CADDFE` | `#ECF5FF` |
| Success | `#13875F` | `#C7E7DC` | `#F0F9F6` |
| Warning | `#FFB800` | `#FFEBC2` | `#FFFBEB` |
| Error | `#E60000` | `#FCD6D5` | `#FEF2F2` |

Semua nilai semantic bertanda (verifikasi). Nama token yang disarankan: `--color-info`, `--color-info-light`, `--color-info-lightest`, dan seterusnya.

### 2.4 Extended palette

Dipakai untuk area konten khusus dan visualisasi data (chart, tag kategori, avatar). Setiap warna punya 1 swatch utama dan 7 tint. Hasil sampel cocok dengan palet **Open Color**, jadi nilai di bawah memakai Open Color.

| Nama | Swatch utama (Open Color) | Hex |
|---|---|---|
| Red | red 9 | `#C92A2A` |
| Pink | pink 7 | `#D6336C` |
| Grape | grape 7 | `#AE3EC9` |
| Violet | violet 7 | `#7048E8` |
| Indigo | indigo 7 | `#4263EB` |
| Blue | blue 7 | `#1C7ED6` |
| Cyan | cyan 8 | `#0C8599` |
| Teal | teal 9 | `#087F5B` |
| Green | green 7 | `#37B24D` |
| Lime | lime 7 | `#74B816` |
| Orange | orange 7 | `#F76707` |
| Yellow | yellow 8 | `#F59F00` |

Tint per warna mengikuti skala Open Color 0 sampai 9. Untuk chart, pakai urutan Blue, Teal, Orange, Violet, Pink, Lime supaya warna berdekatan tetap mudah dibedakan.

### 2.5 Warna status aplikasi

Dari layar Dashboard. Dipakai konsisten di kartu ringkasan, tag status di tabel, dan timeline.

| Status | Warna dasar | Background kartu |
|---|---|---|
| Save as Draft | Neutral 5 | Neutral 1 |
| Submitted | Primary | Primary light / Info lightest |
| GO | Success | Success lightest |
| NOT GO | Error | Error lightest |

---

## 3. Tipografi

### 3.1 Font

- **Family: Manrope** (Google Fonts). Fallback: `system-ui, -apple-system, "Segoe UI", sans-serif`.
- Weight yang tersedia:

| Nama | Weight |
|---|---|
| Light | 300 |
| Regular | 400 |
| Semibold | 600 |
| Bold | 700 |

### 3.2 Skala ukuran

| Style | Ukuran / line-height | Pemakaian |
|---|---|---|
| Display | 36px / 1.25 | Angka besar, judul sambutan |
| Heading 1 | 32px / 1.25 | Judul halaman besar |
| Heading 2 | 28px / 1.25 | |
| Heading 3 | 26px / 1.25 | |
| Heading 4 | 24px / 1.25 | Judul halaman (contoh: "New Application") |
| Heading 5 | 20px / 1.25 | Judul kartu/section |
| Heading 6 | 18px / 1.25 | Subjudul |
| Base | 16px / 1.5 | Teks panjang |
| Small | 14px / 1.5 | Elemen UI umum: label, input, tabel, menu |
| Extra Small | 12px / 1.5 | Info tambahan: hint, caption, tanggal |

Body dalam aplikasi kerja ini umumnya memakai **Small (14px)**. Base dipakai untuk teks panjang.

### 3.3 Text transform

Kelas yang disediakan: `lowercase`, `UPPERCASE`, `Capitalize`, dan `Ellipsis...` (teks terpotong dengan elipsis).

---

## 4. Border, spacing, shadow

### 4.1 Border size

| Token | Nilai |
|---|---|
| `--border-size-none` | 0 |
| `--border-size-s` | 1px |
| `--border-size-m` | 2px |
| `--border-size-l` | 3px |

Nilai ini tertulis di Figma.

### 4.2 Border radius

Figma mencantumkan 7 nama. Nilai di bawah adalah usulan (verifikasi): None, Soft, Rounded, dan Circle mengikuti OutSystems UI; Medium sampai Extra Large adalah tambahan di guideline Perkasa.

| Token | Nilai usulan | Pemakaian yang terlihat di layar |
|---|---|---|
| `--border-radius-none` | 0 | |
| `--border-radius-soft` | 4px | Input, tag |
| `--border-radius-medium` | 8px | Button, card kecil |
| `--border-radius-large` | 12px | Card, panel |
| `--border-radius-extra-large` | 16px | Sheet mobile, kartu dashboard |
| `--border-radius-rounded` | 100px | Pill, chip company di header |
| `--border-radius-circle` | 100% | Avatar, FAB |

### 4.3 Spacing

Skala berbasis 8px. Pengecualian 4px untuk elemen yang secara alami saling berdekatan. Figma mencantumkan 9 nama; nilai usulan mengikuti OutSystems UI (verifikasi untuk Space 3XL).

| Token | Nilai usulan |
|---|---|
| `--space-none` | 0 |
| `--space-xs` | 4px |
| `--space-s` | 8px |
| `--space-base` | 16px |
| `--space-m` | 24px |
| `--space-l` | 32px |
| `--space-xl` | 40px |
| `--space-xxl` | 48px |
| `--space-3xl` | 64px (verifikasi) |

### 4.4 Shadow

Figma mencantumkan None, XS, S, M, L, XL tanpa nilai. Usulan (verifikasi):

| Token | Nilai usulan | Pemakaian |
|---|---|---|
| `--shadow-none` | none | |
| `--shadow-xs` | `0 1px 2px rgba(16, 24, 40, 0.05)` | Input, card datar |
| `--shadow-s` | `0 1px 3px rgba(16, 24, 40, 0.10), 0 1px 2px rgba(16, 24, 40, 0.06)` | Card |
| `--shadow-m` | `0 4px 8px -2px rgba(16, 24, 40, 0.10), 0 2px 4px -2px rgba(16, 24, 40, 0.06)` | Dropdown, popover |
| `--shadow-l` | `0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.03)` | Popup/modal |
| `--shadow-xl` | `0 20px 24px -4px rgba(16, 24, 40, 0.08), 0 8px 8px -4px rgba(16, 24, 40, 0.03)` | Sheet, overlay besar |

Shadow memakai warna dasar Neutral 9 (`#101828`) dengan alpha rendah, sejalan dengan palet neutral.

---

## 5. Ikon

Nama ikon di Figma (`house`, `paintbrush`, `landmark`, `settings`, `chevron-down`, `log-out`, `arrow-right`, `layout-dashboard`, `badge-info`, `badge-check`, `badge-alert`, `badge-x`, `user-round`, `paperclip`, `calendar`, `activity`, `file-text`, `arrow-up-down`, `star`, `send`) adalah nama dari set **Lucide**. Pakai `lucide` (atau `lucide-react`) di implementasi.

- Ukuran default 16px untuk menu dan tabel, 20px untuk header dan tombol ikon.
- Stroke 1.5 sampai 2px, warna mengikuti teks di sekitarnya.

---

## 6. Layout

### 6.1 Web

Lebar frame desain: **1440px**. Ada dua template.

**LayoutSide (dipakai di semua layar produk LOS)**

- **Sidebar kiri** (kira-kira 240px). Atas: blok logo PERKASA putih di atas Primary. Isi: menu dengan ikon Lucide 16px dan label Small. Menu grup bisa dibuka-tutup (chevron). Item aktif: background Primary light dengan teks Primary. Sub menu memakai indikator titik.
- **Header atas**: tombol toggle sidebar di kiri. Di kanan: nama user, email/role (Extra Small), avatar bulat, chip company (pill, contoh "PT Perkasa - IDR"), dan tombol logout.
- **Area konten**: background Neutral 1. Breadcrumb (Extra Small), judul halaman (Heading 4, warna Primary), lalu kartu konten putih.

Menu sidebar di desain Dashboard: Dashboard, Application Inquiry, Data Entry, Document Checklist, User Management (Role, Menu, Role Menu, User Application), Master Data (Product, General Parameter, Geografis, RC).

**LayoutTop (dipakai di halaman Guidelines)**

- Header Primary penuh dengan logo di kiri dan menu horizontal (Home, Styles, Loan Management, Master Data) dengan ikon dan chevron.
- User info dan logout di kanan.

### 6.2 Mobile

- Frame desain: **440 x 956**.
- Header Primary dengan tombol kembali dan judul di tengah.
- Konten di "sheet" putih dengan radius atas besar yang menumpuk di atas header.
- Bottom navigation: 4 ikon dan satu tombol bulat Primary (FAB) di kanan untuk aksi utama.
- Tombol aksi di bawah layar, penuh lebar atau dibagi dua (Back outline, Next/Submit Primary).

### 6.3 Grid dan spacing halaman

- Padding konten web: `--space-m` (24px). Jarak antar kartu: `--space-base` (16px) sampai `--space-m`.
- Form web: grid 4 kolom (label, input, label, input). Di bawah 1024px menjadi 2 kolom, di mobile 1 kolom.
- Padding kartu: `--space-base` sampai `--space-m`.

---

## 7. Komponen

Komponen master di halaman Components dan katalog di Guidelines. Nama mengikuti OutSystems UI.

### 7.1 Widget

| Komponen | Keterangan |
|---|---|
| Button | Primary (isi Primary, teks putih), Secondary/outline (border Primary, teks Primary), dengan ikon opsional di kiri/kanan. Contoh: "Login" dengan ikon masuk, "Next" dengan `arrow-right`, "Back" dengan `arrow-left` |
| Button Group | Pilihan segmented dengan state Active |
| Input | Label (dengan tanda `*` merah untuk wajib), input box dengan ikon opsional (`activity`, `user-round`, `calendar`, `paperclip`), placeholder "Type here", pesan bantuan/error di bawah |
| Input Mobile | Varian input untuk mobile (penuh lebar, label di atas) |
| Dropdown / Select | Placeholder "Select", chevron di kanan |
| Date input | Format tampilan `DD-MM-YYYY`, ikon `calendar` |
| Checkbox | Dengan label |
| Radio Group | Dengan label |
| Switch | Toggle dengan label |
| Feedback Message | 4 tipe dengan ikon: info (`badge-info`), success (`badge-check`), warning (`badge-alert`), error (`badge-x`) |
| Link | Teks Primary, opsional ikon `file-text` atau `arrow-right` ("How to use") |
| List | Item dengan nama dan peran (avatar + dua baris teks) |
| Table | Header dengan ikon sort `arrow-up-down`, sel teks, kolom aksi (ikon edit Primary, hapus Error) |
| Forms | Gabungan input dengan validasi |
| Popover | Konten tambahan saat user memilih |
| Popup | Overlay modal (contoh: konfirmasi, form copy, detail) |
| Upload | Input file dengan ikon `paperclip` |

### 7.2 Number

| Komponen | Keterangan |
|---|---|
| Badge | Angka kecil (notifikasi, jumlah) |
| Rating | Bintang (`star`) |
| Progress Bar | Bar dengan nilai |
| Progress Circle | Lingkaran dengan angka di tengah |
| Password Strength | Indikator kekuatan password (dipakai di reset password) |

### 7.3 Navigation

| Komponen | Keterangan |
|---|---|
| Bottom Bar | Navigasi bawah mobile, maksimal 5 item |
| Pagination | Nomor halaman dengan halaman aktif Primary, tombol prev/next, teks jumlah data |
| Breadcrumbs | `Parent / Child`, Extra Small |
| Tabs | Tab horizontal dengan ikon (dipakai sebagai stepper di form web dan tab detail inquiry) |
| Timeline | Riwayat state dengan tanggal dan status berwarna |
| Wizard | Langkah bernomor dengan status selesai/aktif/berikutnya |
| Section Index / Sidebar menu | Menu samping dengan grup |

### 7.4 Interaction

Terlihat di Guidelines: Action Sheet, Bottom Sheet, Floating Actions, Notification, Sidebar, Animate, Carousel, Lightbox Image, Range Slider, dan pattern interaksi lain dari OutSystems UI. Yang dipakai di layar LOS: Sidebar (navigasi web), Notification/toast (alert sukses seperti "Successfully save as draft"), popup konfirmasi, dan Lightbox untuk preview dokumen.

### 7.5 Content

| Komponen | Keterangan |
|---|---|
| Accordion | Section yang bisa dibuka-tutup |
| Alert | Pesan dengan warna semantic |
| Tag | Label status berwarna (semantic dan extended) |
| Avatar | Foto atau inisial dalam lingkaran, beberapa ukuran |
| Card | Kartu putih dengan judul, deskripsi, dan konten |
| Blank Slate | Keadaan kosong dengan ikon dan pesan |
| Chat Message | Gelembung pesan |

### 7.6 Adaptive

Columns (2 sampai 6 kolom) dan Gallery (grid item responsif).

### 7.7 Layout element

MenuItem (dengan ikon, label, chevron, state aktif), Header (web dan mobile), Status Bar (mobile), Logo, Sidebar, User Info.

---

## 8. Pola layar

### 8.1 Login

- Background Primary penuh dengan bentuk organik dekoratif (aksen merah muda/oranye di sudut).
- Kartu putih di tengah: logo PERKASA, judul "Welcome", subjudul, input Username, input Password dengan toggle lihat, tombol Login Primary penuh lebar dengan ikon.
- Footer kartu: "Don't have an account? Please contact your administrator".
- Tambahan dari US-02: tombol "Login SSO" sebagai tombol secondary di bawah tombol Login.

### 8.2 Dashboard (web)

- Sapaan: "Welcome to" (Extra Small) dan judul aplikasi (Heading 4, Primary).
- Filter produk (dropdown "All Products") dan tombol reset di kanan atas.
- Kartu **Applications**: total besar (Display, Primary) dan 4 kartu status kecil berwarna (Save as Draft, Submitted, GO, NOT GO), angka Heading 5.
- Kartu **Disbursement**: bar chart horizontal per regional, warna Primary light.
- Panel kanan **Application State**: daftar state dengan ikon dan jumlah (Data Entry, Dukcapil, Fraud, RAC, Scoring, SLIK, Decision, SIKP, Dedup, Approval, Validity Check, ...). Setiap baris bisa diklik ke Inquiry.

### 8.3 Daftar data (list)

- Judul halaman, kolom pencarian dengan tombol tambah (pola `SearchWithAddButton`), tombol filter yang membuka popup.
- Tabel dengan header sortable, baris putih, kolom aksi ikon.
- Footer: jumlah data di kiri, pagination di kanan.
- Master data dengan checker-maker punya menu "Pending" yang memakai pola list yang sama ditambah aksi Preview.

### 8.4 Form stepper (web)

Dari grup Data Entry.

- Breadcrumb, judul "New Application".
- Tab horizontal dengan ikon sebagai stepper: Application, Personal, Spouse, Occupation, Business, Collateral, Document, Emergency Contact. Tab aktif bergaris bawah Primary.
- Konten dibagi section berjudul (contoh: Personal Info, ID Card Info, Contact Info, ID Address) dengan judul section berwarna Primary.
- Grid 4 kolom: label di kiri, input di kanan, dua pasang per baris.
- Tombol di kanan bawah: Back (outline) dan Next (Primary). Langkah terakhir: Save as Draft (outline) dan Submit (Primary).

### 8.5 Detail aplikasi (inquiry)

- Mini view di atas: Loan Number, Application Type, Loan Amount, Tenor Approved.
- Tab detail: Detail, Personal, Spouse, Occupation, Business, LKN, Collateral, Document, Emergency Contact, Approval, History.
- Isi tab: pasangan label-nilai dalam grup; tabel untuk Document, Approval, History.
- Tombol Workflow membuka BPT Activity (tabel + timeline state).

### 8.6 Mobile: Home

- Header Primary: avatar, ikon pesan, sapaan "Welcome to", judul "Loan Origination Systems App".
- Kartu Total Sales: nominal Rupiah besar dan perbandingan dengan bulan lalu.
- **Loan Product**: grid 2x2 tile warna pastel dengan label huruf besar dan ikon panah: Non Collateral Loan, Collateral Loan, Pension Credit, Syariah Compliant Finance.
- Bottom bar dengan FAB.

### 8.7 Mobile: Form Pengajuan dan Form LKN

- Layar "Loan Application": daftar section dengan status (ikon centang hijau untuk section selesai) dan tombol "Apply Loan Now" yang nonaktif sampai semua section lengkap.
- Layar per section: progress bar bersegmen di atas (hijau untuk langkah selesai), judul section dengan pill "Step x/y", input bertumpuk penuh lebar, tombol Back dan Next/Submit di bawah.

### 8.8 Mobile: Profile

Avatar inisial besar di header, daftar info akun (Fullname, Username, Role Name, Email, Phone Number), menu Change Password, Help, dan Logout (teks Error dengan background Error lightest).

---

## 9. Token siap pakai (CSS)

Nilai bertanda (verifikasi) di dokumen ini ikut dimasukkan supaya bisa langsung dipakai; ganti setelah dicek di Figma Inspect.

```css
:root {
  /* Brand */
  --color-primary: #0C4FA0;
  --color-primary-light: #BAD4F7;
  --color-secondary: #458F3A;
  --color-secondary-light: #B6FCD1;

  /* Neutral */
  --color-neutral-0: #FFFFFF;
  --color-neutral-1: #F2F4F7;
  --color-neutral-2: #E4E7EC;
  --color-neutral-3: #D0D5DD;
  --color-neutral-4: #98A2B3;
  --color-neutral-5: #667085;
  --color-neutral-6: #475467;
  --color-neutral-7: #344054;
  --color-neutral-8: #1D2939;
  --color-neutral-9: #101828;
  --color-neutral-10: #000000;

  /* Semantic */
  --color-info: #0043CF;
  --color-info-light: #CADDFE;
  --color-info-lightest: #ECF5FF;
  --color-success: #13875F;
  --color-success-light: #C7E7DC;
  --color-success-lightest: #F0F9F6;
  --color-warning: #FFB800;
  --color-warning-light: #FFEBC2;
  --color-warning-lightest: #FFFBEB;
  --color-error: #E60000;
  --color-error-light: #FCD6D5;
  --color-error-lightest: #FEF2F2;

  /* Extended (Open Color) */
  --color-red: #C92A2A;
  --color-pink: #D6336C;
  --color-grape: #AE3EC9;
  --color-violet: #7048E8;
  --color-indigo: #4263EB;
  --color-blue: #1C7ED6;
  --color-cyan: #0C8599;
  --color-teal: #087F5B;
  --color-green: #37B24D;
  --color-lime: #74B816;
  --color-orange: #F76707;
  --color-yellow: #F59F00;

  /* Typography */
  --font-family: "Manrope", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-light: 300;
  --font-regular: 400;
  --font-semibold: 600;
  --font-bold: 700;
  --font-size-display: 36px;
  --font-size-h1: 32px;
  --font-size-h2: 28px;
  --font-size-h3: 26px;
  --font-size-h4: 24px;
  --font-size-h5: 20px;
  --font-size-h6: 18px;
  --font-size-base: 16px;
  --font-size-s: 14px;
  --font-size-xs: 12px;
  --line-height-heading: 1.25;
  --line-height-body: 1.5;

  /* Border */
  --border-size-none: 0;
  --border-size-s: 1px;
  --border-size-m: 2px;
  --border-size-l: 3px;
  --border-radius-none: 0;
  --border-radius-soft: 4px;
  --border-radius-medium: 8px;
  --border-radius-large: 12px;
  --border-radius-extra-large: 16px;
  --border-radius-rounded: 100px;
  --border-radius-circle: 100%;

  /* Spacing */
  --space-none: 0;
  --space-xs: 4px;
  --space-s: 8px;
  --space-base: 16px;
  --space-m: 24px;
  --space-l: 32px;
  --space-xl: 40px;
  --space-xxl: 48px;
  --space-3xl: 64px;

  /* Shadow */
  --shadow-none: none;
  --shadow-xs: 0 1px 2px rgba(16, 24, 40, 0.05);
  --shadow-s: 0 1px 3px rgba(16, 24, 40, 0.10), 0 1px 2px rgba(16, 24, 40, 0.06);
  --shadow-m: 0 4px 8px -2px rgba(16, 24, 40, 0.10), 0 2px 4px -2px rgba(16, 24, 40, 0.06);
  --shadow-l: 0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.03);
  --shadow-xl: 0 20px 24px -4px rgba(16, 24, 40, 0.08), 0 8px 8px -4px rgba(16, 24, 40, 0.03);
}
```

---

## 10. Hal yang perlu diputuskan

| ID | Pertanyaan | Catatan |
|---|---|---|
| D-01 | Verifikasi nilai warna brand dan semantic lewat Figma Inspect | Nilai saat ini dari sampel render |
| D-02 | Nilai pasti radius Medium, Large, Extra Large, spacing 3XL, dan semua shadow | Figma tidak mencantumkan angka |
| D-03 | Dark mode | Figma tidak punya varian gelap; aplikasi kerja internal mungkin tidak butuh |
| D-04 | Kontras teks putih di atas Warning `#FFB800` | Rasio kontras rendah; pakai teks Neutral 9 di atas warning |
| D-05 | Sumber kebenaran token di kode | Usulan: satu file token (CSS variables atau Tailwind config) yang dibangkitkan dari tabel ini |
| D-06 | Typo di Figma: "Exended Palette", "Beadcrumbs", "Silder"; deskripsi kartu Shadow menyalin teks Border Radius; Notes halaman Border menyalin teks Typography; kartu font di halaman Typography berjudul "Brand Palette" | Perbaiki di Figma supaya dokumentasi rapi |
| D-07 | Contoh data di desain memakai email `bankmandiri.co.id` | Ganti dengan data contoh netral sebelum desain dibagikan ke pihak luar |
