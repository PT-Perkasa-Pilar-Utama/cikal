import { createFileRoute } from "@tanstack/react-router";
import { PendingList } from "../../../features/change-request/PendingList";
import { NUMBER_FORMAT_PRESENTATION } from "../../../features/document-numbering/labels";
import { MenuGuard } from "../../../features/session/MenuGuard";

export const Route = createFileRoute("/master/numbering/pending")({
  component: () => (
    <MenuGuard menuCode="MST-NUMBERING">
      <PendingList
        title="Pending Document Numbering"
        entityTypes={["DOCUMENT_NUMBER_FORMAT"]}
        presentation={NUMBER_FORMAT_PRESENTATION}
      />
    </MenuGuard>
  ),
});
