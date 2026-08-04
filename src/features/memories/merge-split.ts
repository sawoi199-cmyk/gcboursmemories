import { randomUUID } from "node:crypto";
import { buildDraftSlug } from "@/lib/utils/slug";
import { createServiceClient } from "@/lib/supabase/admin";

export async function mergeMemoryEvents(input: {
  ownerId: string;
  targetId: string;
  sourceId: string;
}) {
  if (input.targetId === input.sourceId) {
    throw new Error("Cannot merge an event with itself.");
  }

  const supabase = createServiceClient();

  const { data: events, error } = await supabase
    .from("memory_events")
    .select("id, title, event_date")
    .eq("owner_id", input.ownerId)
    .in("id", [input.targetId, input.sourceId]);

  if (error) throw new Error(error.message);
  if (!events || events.length !== 2) {
    throw new Error("Both events must exist and belong to you.");
  }

  const { data: sourceLinks, error: sourceLinksError } = await supabase
    .from("event_photos")
    .select("photo_id, role")
    .eq("event_id", input.sourceId)
    .order("sort_order", { ascending: true });

  if (sourceLinksError) throw new Error(sourceLinksError.message);

  const { data: targetLinks, error: targetLinksError } = await supabase
    .from("event_photos")
    .select("photo_id")
    .eq("event_id", input.targetId);

  if (targetLinksError) throw new Error(targetLinksError.message);

  const existing = new Set((targetLinks ?? []).map((item) => item.photo_id));
  const startOrder = existing.size;

  const toInsert = (sourceLinks ?? [])
    .filter((item) => !existing.has(item.photo_id))
    .map((item, index) => ({
      event_id: input.targetId,
      photo_id: item.photo_id,
      sort_order: startOrder + index,
      role: item.role === "cover" ? "detail" : item.role,
    }));

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("event_photos").insert(toInsert);
    if (insertError) throw new Error(insertError.message);
  }

  const { error: deleteLinksError } = await supabase
    .from("event_photos")
    .delete()
    .eq("event_id", input.sourceId);
  if (deleteLinksError) throw new Error(deleteLinksError.message);

  const { error: deleteEventError } = await supabase
    .from("memory_events")
    .delete()
    .eq("id", input.sourceId)
    .eq("owner_id", input.ownerId);
  if (deleteEventError) throw new Error(deleteEventError.message);

  return { ok: true as const, targetId: input.targetId };
}

export async function splitMemoryEvent(input: {
  ownerId: string;
  memoryId: string;
  photoIdsForNewEvent: string[];
}) {
  if (input.photoIdsForNewEvent.length === 0) {
    throw new Error("Select at least one photo to split out.");
  }

  const supabase = createServiceClient();

  const { data: event, error } = await supabase
    .from("memory_events")
    .select("id, title, event_date, template_id, place_name")
    .eq("id", input.memoryId)
    .eq("owner_id", input.ownerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!event) throw new Error("Event not found.");

  const { data: links, error: linksError } = await supabase
    .from("event_photos")
    .select("photo_id, sort_order, role")
    .eq("event_id", input.memoryId)
    .order("sort_order", { ascending: true });

  if (linksError) throw new Error(linksError.message);

  const moveSet = new Set(input.photoIdsForNewEvent);
  const remaining = (links ?? []).filter((item) => !moveSet.has(item.photo_id));
  const moving = (links ?? []).filter((item) => moveSet.has(item.photo_id));

  if (moving.length === 0) {
    throw new Error("None of the selected photos belong to this event.");
  }
  if (remaining.length === 0) {
    throw new Error("Cannot move all photos out of the event.");
  }

  const newEventId = randomUUID();
  const slug = buildDraftSlug(event.event_date, `${event.title}-split`);

  const { error: createError } = await supabase.from("memory_events").insert({
    id: newEventId,
    owner_id: input.ownerId,
    slug,
    title: `${event.title} · 拆分`,
    event_date: event.event_date,
    place_name: event.place_name,
    template_id: event.template_id,
    cover_photo_id: moving[0]?.photo_id ?? null,
    status: "draft",
  });
  if (createError) throw new Error(createError.message);

  const { error: deleteMovingError } = await supabase
    .from("event_photos")
    .delete()
    .eq("event_id", input.memoryId)
    .in(
      "photo_id",
      moving.map((item) => item.photo_id),
    );
  if (deleteMovingError) throw new Error(deleteMovingError.message);

  const newLinks = moving.map((item, index) => ({
    event_id: newEventId,
    photo_id: item.photo_id,
    sort_order: index,
    role: index === 0 ? "cover" : "detail",
  }));

  const { error: insertNewError } = await supabase.from("event_photos").insert(newLinks);
  if (insertNewError) throw new Error(insertNewError.message);

  // Re-number remaining photos and ensure first is cover
  const { error: clearRemainingError } = await supabase
    .from("event_photos")
    .delete()
    .eq("event_id", input.memoryId);
  if (clearRemainingError) throw new Error(clearRemainingError.message);

  const remainingRows = remaining.map((item, index) => ({
    event_id: input.memoryId,
    photo_id: item.photo_id,
    sort_order: index,
    role: index === 0 ? "cover" : item.role === "cover" ? "detail" : item.role,
  }));

  const { error: reinsertError } = await supabase.from("event_photos").insert(remainingRows);
  if (reinsertError) throw new Error(reinsertError.message);

  await supabase
    .from("memory_events")
    .update({ cover_photo_id: remainingRows[0]?.photo_id ?? null })
    .eq("id", input.memoryId)
    .eq("owner_id", input.ownerId);

  return { ok: true as const, newEventId, slug };
}
