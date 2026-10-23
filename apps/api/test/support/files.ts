import { crc32 } from "node:zlib";

const MB = 1024 * 1024;

/** PDF berukuran tepat `sizeBytes`: header `%PDF-` lalu isi pengganjal. */
export function samplePdf(sizeBytes = 1024): Buffer {
  const header = Buffer.from("%PDF-1.4\n");
  return Buffer.concat([header, Buffer.alloc(sizeBytes - header.length, 0x20)]);
}

/** Ukuran AC dalam MB desimal Indonesia, contoh 2,1 MB = 2,1 × 1.048.576 byte. */
export const megabytes = (value: number): number => Math.round(value * MB);

export const sampleJpg = (): Buffer =>
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]);

export const samplePng = (): Buffer =>
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);

/** Header PE Windows, contoh "npwp.exe" (AC-47.02). */
export const sampleExe = (): Buffer => Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);

/** Arsip ZIP tanpa kompresi dari pasangan nama dan isi entri. */
export function storedZip(entries: Array<[name: string, content: string]>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const fileName = Buffer.from(name);
    const data = Buffer.from(content);
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(fileName.length, 26);
    locals.push(local, fileName, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(fileName.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, fileName);
    offset += local.length + fileName.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

const DOCX_CONTENT_TYPES =
  '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Override PartName="/word/document.xml" ' +
  'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';

/** Paket OOXML terkecil yang dikenali sebagai dokumen Word. */
export const sampleDocx = (): Buffer =>
  storedZip([
    ["[Content_Types].xml", DOCX_CONTENT_TYPES],
    ["word/document.xml", "<w:document/>"],
  ]);
