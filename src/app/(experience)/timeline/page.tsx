import { TimelineView } from "@/components/experience/timeline-view";
import {
  getPublishedCalendarDays,
  getPublishedTimelinePage,
} from "@/features/memories/published";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const [initial, calendarDays] = await Promise.all([
    getPublishedTimelinePage(),
    getPublishedCalendarDays(),
  ]);

  return (
    <TimelineView
      initial={initial}
      calendarDays={calendarDays}
      archiveEmpty={calendarDays.length === 0}
    />
  );
}
