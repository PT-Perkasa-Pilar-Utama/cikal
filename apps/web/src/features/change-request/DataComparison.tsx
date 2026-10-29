import {
  type ComparisonRow,
  type FieldPresentation,
  fieldLabel,
  formatValue,
  inLabelOrder,
  isRecord,
} from "./comparison";

interface DataComparisonProps {
  rows: ComparisonRow[];
  /** Data baru (`CREATE`) tidak punya "Current Data". */
  showCurrent: boolean;
  presentation: FieldPresentation;
  /** Judul dua kolom nilai; jejak audit memakai "Before" dan "After" (AC-14.02). */
  columnTitles?: { current: string; proposed: string };
}

const CHANGE_REQUEST_TITLES = { current: "Current Data", proposed: "Proposed Data" };

/** Array baris, contoh periode pricing atau isi paket impor, tampil sebagai tabel kecil. */
function RecordList({
  path,
  items,
  presentation,
}: {
  path: string;
  items: unknown[];
  presentation: FieldPresentation;
}) {
  const records = items.filter(isRecord);
  // Kolom yang kosong di semua baris, contoh Cap Rate pada bunga Effective, tidak ditampilkan.
  const filled = records.flatMap((record) => Object.keys(record).filter((key) => record[key] !== null));
  const columns = inLabelOrder([...new Set(filled)], presentation);
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-neutral-5">
          {columns.map((column) => (
            <th key={column} className="py-1 pr-2 font-semibold">
              {fieldLabel(column, presentation)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {records.map((record, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: baris periode tidak punya kunci alami dan daftar hanya dibaca
          <tr key={index}>
            {columns.map((column) => (
              <td key={column} className="py-1 pr-2 whitespace-nowrap">
                {formatValue(`${path}.${column}`, record[column], presentation)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FieldValue({ path, value, presentation }: { path: string; value: unknown; presentation: FieldPresentation }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <>{formatValue(path, null, presentation)}</>;
    if (value.some(isRecord)) return <RecordList path={path} items={value} presentation={presentation} />;
    return <>{value.map((item) => formatValue(path, item, presentation)).join(", ")}</>;
  }
  return <>{formatValue(path, value, presentation)}</>;
}

/** Dua kolom "Current Data" dan "Proposed Data"; field yang berubah diberi latar Warning dan tanda "(changed)" untuk pembaca layar (AC-12.02). */
export function DataComparison({
  rows,
  showCurrent,
  presentation,
  columnTitles = CHANGE_REQUEST_TITLES,
}: DataComparisonProps) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-neutral-2 text-left text-neutral-5">
          <th className="w-1/5 p-2">Field</th>
          {showCurrent && <th className="w-3/8 p-2">{columnTitles.current}</th>}
          <th className="p-2">{columnTitles.proposed}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.path}
            data-changed={row.changed || undefined}
            className={`border-b border-neutral-2 align-top ${row.changed ? "bg-warning-lightest" : ""}`}
          >
            <th scope="row" className="p-2 text-left font-semibold text-neutral-7">
              {row.label}
              {row.changed && <span className="sr-only"> (changed)</span>}
            </th>
            {showCurrent && (
              <td className="p-2">
                <FieldValue path={row.path} value={row.current} presentation={presentation} />
              </td>
            )}
            <td className={`p-2 ${row.changed ? "font-semibold text-neutral-9" : ""}`}>
              <FieldValue path={row.path} value={row.proposed} presentation={presentation} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
