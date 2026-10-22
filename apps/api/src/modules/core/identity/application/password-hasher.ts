import { Injectable } from "@nestjs/common";
import argon2 from "argon2";

/** Argon2id dengan memori 64 MiB, iterasi 3, paralel 1 (technical-specs 07 §7.1). */
const ARGON2_OPTIONS = { type: argon2.argon2id, memoryCost: 65_536, timeCost: 3, parallelism: 1 } as const;

/** Hash dan verifikasi password user lokal. */
@Injectable()
export class PasswordHasher {
  private dummyHash: Promise<string> | null = null;

  hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  /**
   * Tanpa hash (username tidak ada atau user SSO), verifikasi tetap dijalankan terhadap hash pengganti agar
   * waktu respons tidak membocorkan keberadaan username (api-specs 02 §2.2 langkah 2).
   */
  async verify(hash: string | null, password: string): Promise<boolean> {
    if (hash) return argon2.verify(hash, password);
    this.dummyHash ??= this.hash("cikal-timing-equalizer");
    await argon2.verify(await this.dummyHash, password);
    return false;
  }
}
