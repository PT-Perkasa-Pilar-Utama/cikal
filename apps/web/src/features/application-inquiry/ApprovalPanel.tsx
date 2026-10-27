import { ResultState } from "../application-workflow/ResultLayout";
import { ApprovalChain } from "../approval/ApprovalChain";
import { ApprovedFinancing } from "../approval/ApprovedFinancing";
import { useApproval } from "../approval/api";

interface ApprovalPanelProps {
  applicationId: string;
  /** Tenor disetujui sudah terisi, termasuk auto approval yang tidak punya baris rantai (api-specs 12 §12.9). */
  approved: boolean;
}

/** Tab "Approval": rantai approver, lalu struktur kredit setelah disetujui (api-specs 16 §16.5, §16.7). */
export function ApprovalPanel({ applicationId, approved }: ApprovalPanelProps) {
  const { data, error } = useApproval(applicationId);
  return (
    <div className="flex flex-col gap-6">
      <ResultState data={data?.data} error={error}>
        {(approval) => <ApprovalChain chain={approval.chain} />}
      </ResultState>
      <ApprovedFinancing applicationId={applicationId} approved={approved} />
    </div>
  );
}
