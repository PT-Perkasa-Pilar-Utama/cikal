import type { ReactNode } from "react";
import { BlankSlate } from "../../components/ui/BlankSlate";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";

interface ResultStateProps<T> {
  /** `undefined` selama dimuat; `null` bila langkah belum berjalan atau dilewati (api-specs 19 §19.2). */
  data: T | null | undefined;
  error: Error | null;
  children: (data: T) => ReactNode;
}

/** Keadaan muat, error, dan kosong yang sama untuk semua panel hasil langkah. */
export function ResultState<T>({ data, error, children }: ResultStateProps<T>) {
  if (error) return <FeedbackMessage type="error">{error.message}</FeedbackMessage>;
  if (data === undefined) return <p>Loading...</p>;
  if (data === null) return <BlankSlate />;
  return children(data);
}

/** Pasangan label dan nilai hasil langkah (design-system 8.5). */
export function ResultFields({ fields }: { fields: readonly [label: string, value: ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4">
      {fields.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-neutral-5">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

interface ResultTableProps {
  caption: string;
  headers: readonly string[];
  rows: readonly (readonly ReactNode[])[];
}

/** Tabel rincian hasil, contoh kandidat Dedup atau kriteria Scoring; tabel kosong menampilkan Blank Slate. */
export function ResultTable({ caption, headers, rows }: ResultTableProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-semibold text-neutral-7">{caption}</p>
      <div className="overflow-x-auto rounded-lg border border-neutral-2">
        <table className="w-full" aria-label={caption}>
          <thead>
            <tr className="border-b border-neutral-2 text-left text-neutral-5">
              {headers.map((header) => (
                <th key={header} className="p-3">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: baris rincian tidak punya kunci alami dan daftar hanya dibaca
              <tr key={index} className="border-b border-neutral-2 last:border-0">
                {cells.map((cell, cellIndex) => (
                  <td key={headers[cellIndex]} className="p-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <BlankSlate />}
      </div>
    </div>
  );
}
