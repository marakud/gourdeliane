import { connection } from "next/server";
import { requireUserId } from "@/lib/current-user";
import { getScheduleForUser } from "@/data/schedule";
import { listMemoryPoints } from "@/data/memory-point";
import { formatLastReviewedAt, type MemoryPointView, type MemoryStatus } from "@/domain/memory-point";
import { MemoryPointManager } from "@/components/memory/memory-point-manager";

export default async function MemoirePage() {
  await connection();
  const userId = await requireUserId();
  const [{ subjects }, points] = await Promise.all([
    getScheduleForUser(userId),
    listMemoryPoints(userId),
  ]);

  const view: MemoryPointView[] = points.map((point) => ({
    id: point.id,
    content: point.content,
    note: point.note,
    status: point.status as MemoryStatus,
    reviewCount: point.reviewCount,
    lastReviewedLabel: formatLastReviewedAt(point.lastReviewedAt),
    subject: {
      id: point.subject.id,
      name: point.subject.name,
      colorIndex: point.subject.colorIndex,
    },
  }));

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Mémoire de Hugo</h1>
        <p className="text-base text-muted-foreground">Les notions et erreurs importantes à revoir régulièrement, matière par matière.</p>
      </div>
      <MemoryPointManager
        points={view}
        subjects={subjects.map((subject) => ({ id: subject.id, name: subject.name, colorIndex: subject.colorIndex }))}
      />
    </div>
  );
}
