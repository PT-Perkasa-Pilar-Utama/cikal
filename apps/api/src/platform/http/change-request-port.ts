/**
 * Token `ChangeRequestPort` modul Change Request (technical-specs 05 §5.6). Modul pemilik data menyuntik token ini
 * dan mengimpor modul Change Request hanya sebagai tipe, karena Change Request merujuk tabel `iam.users` dan
 * impor nilai dari Identity akan melingkar saat dimuat. Kontraknya ditulis di modul Change Request.
 */
export const CHANGE_REQUEST_PORT = Symbol("CHANGE_REQUEST_PORT");
