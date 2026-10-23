import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { RegionSourceError } from "../ports/region-data.port.js";
import { OksaraRegionAdapter } from "./oksara-region.adapter.js";

const API_KEY = "test-oksara-key";

type Handler = (url: URL, req: IncomingMessage, res: ServerResponse) => void;

const page = (data: object[], current: number, last: number) => ({
  status: "success",
  version: "4.0.0",
  metadata: { id: "c3f38fdc-fb95-4d42-9c23-a362a93ef246", speed: 0.01, pagination: { current, last } },
  data,
});

/** Halaman Oksara uji: kelurahan dibagi dua halaman agar paging teruji. */
const PAGES: Record<string, object[][]> = {
  provinces: [[{ code: 31, name: "DKI JAKARTA" }]],
  regencies: [[{ code: 3171, name: "KOTA JAKARTA PUSAT" }]],
  districts: [[{ code: 317101, name: "GAMBIR" }]],
  villages: [[{ code: 3171011001, name: "GAMBIR", zip: 10110 }], [{ code: 3171011002, name: "CIDENG", zip: 10150 }]],
};

const servePages: Handler = (url, _req, res) => {
  const pages = PAGES[url.pathname.replace("/api/v1/ktp/", "")];
  const index = Number(url.searchParams.get("p"));
  if (!pages?.[index]) return void res.writeHead(404).end();
  res
    .writeHead(200, { "content-type": "application/json" })
    .end(JSON.stringify(page(pages[index], index, pages.length - 1)));
};

describe("OksaraRegionAdapter", () => {
  let server: Server;
  let baseUrl: string;
  let handler: Handler = servePages;
  const authorizations: Array<string | undefined> = [];

  beforeAll(async () => {
    server = createServer((req, res) => {
      authorizations.push(req.headers.authorization);
      handler(new URL(req.url ?? "/", "http://localhost"), req, res);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(() => {
    handler = servePages;
    authorizations.length = 0;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const failure = async (adapter = new OksaraRegionAdapter(baseUrl, API_KEY)) => {
    const error = await adapter.fetchAll().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RegionSourceError);
    return error as RegionSourceError;
  };

  it("reads every page of every level with the Bearer key and derives parents from code prefixes (AC-23.01)", async () => {
    const snapshot = await new OksaraRegionAdapter(baseUrl, API_KEY).fetchAll();

    expect(snapshot).toEqual({
      province: [{ code: "31", name: "DKI JAKARTA", parentCode: null, zipCode: null }],
      city: [{ code: "3171", name: "KOTA JAKARTA PUSAT", parentCode: "31", zipCode: null }],
      district: [{ code: "317101", name: "GAMBIR", parentCode: "3171", zipCode: null }],
      subDistrict: [
        { code: "3171011001", name: "GAMBIR", parentCode: "317101", zipCode: "10110" },
        { code: "3171011002", name: "CIDENG", parentCode: "317101", zipCode: "10150" },
      ],
    });
    expect(new Set(authorizations)).toEqual(new Set([`Bearer ${API_KEY}`]));
  });

  it("waits out a 429 and retries the same page", async () => {
    let limited = false;
    handler = (url, req, res) => {
      if (!limited) {
        limited = true;
        return void res.writeHead(429, { "retry-after": "0" }).end();
      }
      servePages(url, req, res);
    };

    const snapshot = await new OksaraRegionAdapter(baseUrl, API_KEY).fetchAll();
    expect(snapshot.subDistrict).toHaveLength(2);
  });

  it("fails as CONNECTION when the provider does not answer (AC-23.02)", async () => {
    const error = await failure(new OksaraRegionAdapter("http://127.0.0.1:1", API_KEY));
    expect(error.category).toBe("CONNECTION");
  });

  it("fails as PROVIDER_ERROR on a server error mid-sync (AC-23.02)", async () => {
    handler = (url, req, res) => {
      if (url.pathname.endsWith("/villages")) return void res.writeHead(503).end();
      servePages(url, req, res);
    };
    expect((await failure()).category).toBe("PROVIDER_ERROR");
  });

  it("fails as AUTH when the key is rejected", async () => {
    handler = (_url, _req, res) => void res.writeHead(401).end();
    expect((await failure()).category).toBe("AUTH");
  });

  it("fails as INVALID_RESPONSE on an unexpected body", async () => {
    handler = (_url, _req, res) => void res.writeHead(200, { "content-type": "application/json" }).end("{}");
    expect((await failure()).category).toBe("INVALID_RESPONSE");
  });

  it("fails as INVALID_RESPONSE on a code of the wrong length", async () => {
    handler = (url, req, res) => {
      if (!url.pathname.endsWith("/provinces")) return servePages(url, req, res);
      res.writeHead(200).end(JSON.stringify(page([{ code: 310, name: "DKI JAKARTA" }], 0, 0)));
    };
    expect((await failure()).category).toBe("INVALID_RESPONSE");
  });
});
