import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/** Isi PDF yang dikembalikan Gotenberg tiruan untuk setiap konversi. */
export const CONVERTED_PDF = Buffer.from("%PDF-1.7\n% hasil konversi Gotenberg tiruan\n%%EOF\n");

export interface FakeGotenberg {
  url: string;
  /** Jumlah konversi yang diterima sejak `reset`. */
  conversions: number;
  /** `false` membuat setiap konversi dijawab `500`. */
  healthy: boolean;
  reset(): void;
  stop(): Promise<void>;
}

/** Server HTTP pengganti `POST /forms/libreoffice/convert`; image Gotenberg asli terlalu besar untuk uji. */
export async function startFakeGotenberg(): Promise<FakeGotenberg> {
  const fake: FakeGotenberg = {
    url: "",
    conversions: 0,
    healthy: true,
    reset() {
      fake.conversions = 0;
      fake.healthy = true;
    },
    stop: () => new Promise((resolve) => server.close(() => resolve())),
  };
  const server: Server = createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      if (req.method !== "POST" || req.url !== "/forms/libreoffice/convert") return void res.writeHead(404).end();
      fake.conversions++;
      if (!fake.healthy) return void res.writeHead(500).end("LibreOffice failed");
      res.writeHead(200, { "content-type": "application/pdf" }).end(CONVERTED_PDF);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  fake.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return fake;
}
