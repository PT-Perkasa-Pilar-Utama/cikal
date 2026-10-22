import type { ChangeRequestEntityType } from "@cikal/contracts";
import { usePendingChangeRequests } from "./api";

/** Kerangka layar Pending generik; perbandingan Current/Proposed dan tombol Approve/Reject dibangun di FE-S1-02. */
export function PendingList({ title, entityTypes }: { title: string; entityTypes: ChangeRequestEntityType[] }) {
  const { data, isPending, error } = usePendingChangeRequests(entityTypes);
  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold text-primary">{title}</h1>
      {isPending && <p>Loading...</p>}
      {error && <p className="text-error">{error.message}</p>}
      <ul className="divide-y divide-neutral-2 rounded bg-neutral-0">
        {data?.data.map((item) => (
          <li key={item.id} className="flex justify-between p-3">
            <span>{item.displayName}</span>
            <span className="text-neutral-5">
              {item.submittedBy.username} · {item.status}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
