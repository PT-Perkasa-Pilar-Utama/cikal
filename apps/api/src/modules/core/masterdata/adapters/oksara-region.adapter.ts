import { z } from "zod";
import type { RegionEntry, RegionLevel, RegionSnapshot } from "../domain/region-snapshot.js";
import { type RegionDataPort, RegionSourceError } from "../ports/region-data.port.js";

/** Batas satu halaman Oksara; halaman kelurahan berisi 1.000 baris. */
const PAGE_TIMEOUT_MS = 30_000;
/** Ulangan satu halaman setelah `429`; jeda dari header `Retry-After` atau `RateLimit-Reset`. */
const RATE_LIMIT_RETRIES = 3;
const DEFAULT_RATE_LIMIT_WAIT_SECONDS = 60;

/** Rute daftar Oksara per tingkat dan panjang kode Kemendagri; kode induk adalah awalan kode anak. */
const LEVELS: Record<RegionLevel, { path: string; codeLength: number; parentLength: number | null }> = {
  province: { path: "provinces", codeLength: 2, parentLength: null },
  city: { path: "regencies", codeLength: 4, parentLength: 2 },
  district: { path: "districts", codeLength: 6, parentLength: 4 },
  subDistrict: { path: "villages", codeLength: 10, parentLength: 6 },
};

const pageSchema = z.object({
  status: z.literal("success"),
  data: z.array(z.object({ code: z.number().int(), name: z.string().trim().min(1), zip: z.number().int().optional() })),
  metadata: z.object({ pagination: z.object({ current: z.number().int(), last: z.number().int() }) }),
});
type OksaraPage = z.infer<typeof pageSchema>;

const wait = (seconds: number) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

function retryAfterSeconds(response: Response): number {
  const header = response.headers.get("retry-after") ?? response.headers.get("ratelimit-reset");
  const seconds = Number(header);
  return header !== null && Number.isFinite(seconds) && seconds >= 0 ? seconds : DEFAULT_RATE_LIMIT_WAIT_SECONDS;
}

function failureOf(error: unknown): RegionSourceError {
  if (error instanceof RegionSourceError) return error;
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return new RegionSourceError("TIMEOUT", "Region data provider timed out");
  }
  return new RegionSourceError("CONNECTION", error instanceof Error ? error.message : String(error));
}

/**
 * Adapter Oksara `GET /api/v1/ktp/{provinces,regencies,districts,villages}?p=` dengan Bearer token (tech ref 10.6).
 * Daftar Oksara tidak difilter per induk, jadi setiap tingkat diambil semua halamannya.
 */
export class OksaraRegionAdapter implements RegionDataPort {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  async fetchAll(): Promise<RegionSnapshot> {
    return {
      province: await this.fetchLevel("province"),
      city: await this.fetchLevel("city"),
      district: await this.fetchLevel("district"),
      subDistrict: await this.fetchLevel("subDistrict"),
    };
  }

  private async fetchLevel(level: RegionLevel): Promise<RegionEntry[]> {
    const entries: RegionEntry[] = [];
    for (let page = 0, last = 0; page <= last; page++) {
      const body = await this.fetchPage(level, page);
      last = body.metadata.pagination.last;
      entries.push(...body.data.map((row) => this.toEntry(level, row)));
    }
    return entries;
  }

  private toEntry(level: RegionLevel, row: OksaraPage["data"][number]): RegionEntry {
    const { codeLength, parentLength } = LEVELS[level];
    const code = String(row.code);
    if (code.length !== codeLength) {
      throw new RegionSourceError("INVALID_RESPONSE", `Unexpected ${level} code ${code}`);
    }
    if (level === "subDistrict" && row.zip === undefined) {
      throw new RegionSourceError("INVALID_RESPONSE", `Missing zip code for village ${code}`);
    }
    return {
      code,
      name: row.name,
      parentCode: parentLength === null ? null : code.slice(0, parentLength),
      zipCode: level === "subDistrict" ? String(row.zip) : null,
    };
  }

  private async fetchPage(level: RegionLevel, page: number): Promise<OksaraPage> {
    const url = new URL(`/api/v1/ktp/${LEVELS[level].path}`, this.baseUrl);
    url.searchParams.set("p", String(page));
    for (let attempt = 0; ; attempt++) {
      const response = await this.get(url);
      if (response.status === 429 && attempt < RATE_LIMIT_RETRIES) {
        await wait(retryAfterSeconds(response));
        continue;
      }
      if (response.status === 401 || response.status === 403) {
        throw new RegionSourceError("AUTH", `Region data provider rejected the API key (${response.status})`);
      }
      if (!response.ok)
        throw new RegionSourceError("PROVIDER_ERROR", `Region data provider returned ${response.status}`);
      const parsed = pageSchema.safeParse(await this.json(response));
      if (!parsed.success) throw new RegionSourceError("INVALID_RESPONSE", `Unexpected ${level} page ${page}`);
      return parsed.data;
    }
  }

  private async get(url: URL): Promise<Response> {
    try {
      return await fetch(url, {
        headers: { authorization: `Bearer ${this.apiKey}`, accept: "application/json" },
        signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      });
    } catch (error) {
      throw failureOf(error);
    }
  }

  private async json(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") throw failureOf(error);
      throw new RegionSourceError("INVALID_RESPONSE", "Region data provider returned invalid JSON");
    }
  }
}
