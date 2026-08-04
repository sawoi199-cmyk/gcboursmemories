import { TimelineView } from "@/components/experience/timeline-view";
import { getPublishedMemories } from "@/features/memories/published";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const memories = await getPublishedMemories();
  return <TimelineView memories={memories} />;
}
