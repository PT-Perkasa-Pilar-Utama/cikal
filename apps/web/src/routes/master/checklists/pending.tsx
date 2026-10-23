import { createFileRoute } from "@tanstack/react-router";
import { PendingList } from "../../../features/change-request/PendingList";
import { CHECKLIST_PRESENTATION } from "../../../features/document-checklist/labels";
import { MenuGuard } from "../../../features/session/MenuGuard";

export const Route = createFileRoute("/master/checklists/pending")({
  component: () => (
    <MenuGuard menuCode="MST-CHECKLIST">
      <PendingList
        title="Pending Document Checklist"
        entityTypes={["DOCUMENT_CHECKLIST"]}
        presentation={CHECKLIST_PRESENTATION}
      />
    </MenuGuard>
  ),
});
