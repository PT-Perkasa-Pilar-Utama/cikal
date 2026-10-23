import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { sampleJpg } from "../../../../../test/support/files.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { GotenbergPdfConverter } from "./gotenberg-pdf-converter.js";

const CONVERTED = Buffer.from("%PDF-1.7 converted");

type Handler = (req: IncomingMessage, body: Buffer, res: ServerResponse) => void;

const convert: Handler = (_req, _body, res) => {
  res.writeHead(200, { "content-type": "application/pdf" }).end(CONVERTED);
};

describe("GotenbergPdfConverter", () => {
  let server: Server;
  let baseUrl: string;
  let handler: Handler = convert;
  const requests: Array<{ method?: string; url?: string; body: string }> = [];

  beforeAll(async () => {
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        const body = Buffer.concat(chunks);
        requests.push({ method: req.method, url: req.url, body: body.toString("latin1") });
        handler(req, body, res);
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(() => {
    handler = convert;
    requests.length = 0;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const failure = async (converter = new GotenbergPdfConverter(baseUrl)) => {
    const error = await converter.toPdf("jpg", sampleJpg()).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(DomainError);
    return error;
  };

  it("posts the file under its lower-case extension to the LibreOffice route and returns the PDF bytes", async () => {
    const pdf = await new GotenbergPdfConverter(baseUrl).toPdf("jpeg", sampleJpg());

    expect(pdf.equals(CONVERTED)).toBe(true);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ method: "POST", url: "/forms/libreoffice/convert" });
    expect(requests[0]?.body).toContain('name="files"; filename="upload.jpeg"');
    expect(requests[0]?.body).toContain(sampleJpg().toString("latin1"));
  });

  it("AC-47.02 answers 415 UNSUPPORTED_FILE_TYPE when LibreOffice cannot read the file content", async () => {
    handler = (_req, _body, res) => void res.writeHead(400).end("convert to PDF: supervisor run task: uno exception");

    expect(await failure()).toMatchObject({
      code: "UNSUPPORTED_FILE_TYPE",
      status: 415,
      message: "Allowed file types: png, jpg, jpeg, pdf, docx",
    });
  });

  it("answers 503 SERVICE_UNAVAILABLE when Gotenberg fails the conversion", async () => {
    handler = (_req, _body, res) => void res.writeHead(500).end("LibreOffice failed");

    expect(await failure()).toMatchObject({ code: "SERVICE_UNAVAILABLE", status: 503 });
  });

  it("answers 503 SERVICE_UNAVAILABLE when Gotenberg is unreachable", async () => {
    expect(await failure(new GotenbergPdfConverter("http://127.0.0.1:1"))).toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
  });

  it("answers 503 SERVICE_UNAVAILABLE when GOTENBERG_URL is not configured", async () => {
    expect(await failure(new GotenbergPdfConverter(null))).toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(requests).toHaveLength(0);
  });
});
