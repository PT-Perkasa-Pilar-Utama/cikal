/**
 * Token `AuditTrail` modul Audit (technical-specs 05 §5.7) untuk modul dasar yang dirujuk tabel audit lewat foreign
 * key, contoh Tenant & License. Impor nilai dari modul Audit akan melingkar saat dimuat, jadi modul itu mengimpor
 * `AuditTrail` hanya sebagai tipe. Kontraknya ditulis di modul Audit.
 */
export const AUDIT_PORT = Symbol("AUDIT_PORT");
