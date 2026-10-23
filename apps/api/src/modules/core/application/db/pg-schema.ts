import { pgSchema } from "drizzle-orm/pg-core";

/** Skema `application` (technical-specs 02 §2.7), terpisah agar file tabel saling merujuk tanpa urutan muat. */
export const application = pgSchema("application");
