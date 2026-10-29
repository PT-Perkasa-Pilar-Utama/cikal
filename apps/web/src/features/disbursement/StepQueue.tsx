import type { QueueCode, TaskItem } from "@cikal/contracts";
import { useRouterState } from "@tanstack/react-router";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { TaskQueue } from "../task-queue/TaskQueue";

interface StepQueueProps {
  title: string;
  queueCode: QueueCode;
  proceedLabel: string;
  onProceed: (task: TaskItem) => void;
}

/**
 * Halaman antrean langkah pencairan dengan komponen antrean generik (api-specs 14 §14.2). Pesan hasil dari layar kerja
 * dibawa lewat history state.
 */
export function StepQueue({ title, queueCode, proceedLabel, onProceed }: StepQueueProps) {
  const notice = useRouterState({ select: (state) => state.location.state.notice });
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-primary">{title}</h1>
      {notice && <FeedbackMessage type="success">{notice}</FeedbackMessage>}
      <TaskQueue queueCode={queueCode} proceedLabel={proceedLabel} onProceed={onProceed} />
    </section>
  );
}
