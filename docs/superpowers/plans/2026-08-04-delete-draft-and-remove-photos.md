# Delete Draft / Remove Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the site owner delete memories (draft + published), remove photos from an event (keep ≥1), and clear failed/cancelled upload items, hard-deleting unreferenced Drive originals + Supabase thumbnails.

**Architecture:** Shared `hardDeletePhotos` cleans GAS + Storage + `photos` rows only when zero `event_photos` refs remain. Feature functions `deleteMemoryEvent` / `removePhotosFromEvent` / `deleteOrphanPhoto` sit behind Studio APIs gated by `requireSiteSession`. UI on drafts list, memory editor, and upload wizard.

**Tech Stack:** Next.js App Router, Supabase service client, GAS Web App, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-04-delete-draft-and-remove-photos-design.md`

## Global Constraints

- Service Role Key / `GAS_*` never reach the client
- Always scope by `owner_id = SITE_OWNER_ID`
- Zod on all external API bodies
- No `any` without reason
- Prefer small diffs; business logic in `src/features/**`, not page components
- Update `TASKS.md` + `DECISIONS.md` when done
- Run `npm run validate` before claiming complete
- Commits only when the user explicitly asks (skip commit steps unless requested)
- After code lands, remind user to redeploy GAS Web App with `deleteFile`

---

## File map

| File | Role |
| --- | --- |
| `gas/OursDriveGateway.gs` | Add `deleteFile` → `setTrashed(true)` |
| `src/lib/google-drive/gas-client.ts` | `deleteDriveFile(fileId)` |
| `src/features/photos/hard-delete-photos.ts` | Shared hard cleanup + orphan check |
| `src/features/memories/delete-memory.ts` | `deleteMemoryEvent` + Zod body schema |
| `src/features/memories/remove-photos.ts` | `removePhotosFromEvent` + Zod schema |
| `src/features/photos/delete-orphan-photo.ts` | `deleteOrphanPhoto` for upload cancel |
| `src/app/api/memories/[id]/route.ts` | Add `DELETE` |
| `src/app/api/memories/[id]/photos/remove/route.ts` | `POST` remove |
| `src/app/api/photos/[id]/route.ts` | `DELETE` orphan |
| `src/components/studio/delete-memory-button.tsx` | Confirm UI (draft vs published title) |
| `src/app/(studio)/studio/drafts/page.tsx` | Wire delete control |
| `src/components/studio/memory-editor.tsx` | Delete memory + remove photo |
| `src/components/studio/upload-wizard.tsx` | Clear failed + API cancel for done |
| `src/features/memories/delete-memory.test.ts` | Schema + pure confirm helpers |
| `src/features/memories/remove-photos.test.ts` | Schema + min-one validation helpers |
| `src/features/photos/hard-delete-photos.test.ts` | Unreferenced filter helper |
| `docs/deploy.md` / `docs/phase-2-setup.md` | Redeploy note |
| `DECISIONS.md` / `TASKS.md` | Decision 014+ / notes |

---

### Task 1: GAS `deleteFile` + client wrapper

**Files:**
- Modify: `gas/OursDriveGateway.gs`
- Modify: `src/lib/google-drive/gas-client.ts`
- Test: extend `src/lib/google-drive/gas-client.test.ts` only if adding a pure export; otherwise smoke via hard-delete unit tests later

**Interfaces:**
- Produces: `deleteDriveFile(fileId: string): Promise<GasResponse>`

- [ ] **Step 1: Add GAS action** before the unknown-action throw in `doPost`:

```javascript
    if (action === "deleteFile") {
      if (!body.fileId) {
        throw new Error("fileId is required.");
      }
      try {
        DriveApp.getFileById(body.fileId).setTrashed(true);
      } catch (err) {
        var msg = String(err && err.message ? err.message : err);
        // Already gone / not found → success for idempotent cleanup
        if (msg.indexOf("not found") === -1 && msg.indexOf("No item") === -1) {
          throw err;
        }
      }
      return json_({
        ok: true,
        action: "deleteFile",
        fileId: body.fileId,
      });
    }
```

- [ ] **Step 2: Add client helper** after `fetchDriveFile`:

```ts
/** Move a Drive file to trash via GAS (idempotent if already gone). */
export async function deleteDriveFile(fileId: string) {
  return callGas("deleteFile", { fileId });
}
```

- [ ] **Step 3: Manual note** — user must redeploy Web App after merge; document in Task 6.

---

### Task 2: `hardDeletePhotos` + orphan helpers

**Files:**
- Create: `src/features/photos/hard-delete-photos.ts`
- Create: `src/features/photos/hard-delete-photos.test.ts`

**Interfaces:**
- Consumes: `deleteDriveFile`, `createServiceClient`
- Produces:
  - `findUnreferencedPhotoIds(supabase, photoIds: string[]): Promise<string[]>`
  - `hardDeletePhotos(ownerId: string, photoIds: string[]): Promise<{ deleted: string[]; warnings: string[] }>`

- [ ] **Step 1: Write failing tests** for pure filter used by findUnreferenced (or test `partitionReferenced`):

```ts
import { describe, expect, it } from "vitest";
import { partitionUnreferencedPhotoIds } from "@/features/photos/hard-delete-photos";

describe("partitionUnreferencedPhotoIds", () => {
  it("returns only ids not in the referenced set", () => {
    expect(
      partitionUnreferencedPhotoIds(
        ["a", "b", "c"],
        new Set(["b"]),
      ),
    ).toEqual(["a", "c"]);
  });

  it("returns empty when all still referenced", () => {
    expect(partitionUnreferencedPhotoIds(["a"], new Set(["a"]))).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement** `src/features/photos/hard-delete-photos.ts`:

```ts
import { deleteDriveFile } from "@/lib/google-drive/gas-client";
import { createServiceClient } from "@/lib/supabase/admin";

export function partitionUnreferencedPhotoIds(
  candidateIds: string[],
  referencedIds: Set<string>,
): string[] {
  return candidateIds.filter((id) => !referencedIds.has(id));
}

export async function findUnreferencedPhotoIds(photoIds: string[]): Promise<string[]> {
  if (photoIds.length === 0) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("event_photos")
    .select("photo_id")
    .in("photo_id", photoIds);
  if (error) throw new Error(error.message);
  const referenced = new Set((data ?? []).map((row) => row.photo_id));
  return partitionUnreferencedPhotoIds(photoIds, referenced);
}

export async function hardDeletePhotos(
  ownerId: string,
  photoIds: string[],
): Promise<{ deleted: string[]; warnings: string[] }> {
  const unique = [...new Set(photoIds)];
  if (unique.length === 0) return { deleted: [], warnings: [] };

  const supabase = createServiceClient();
  const { data: rows, error } = await supabase
    .from("photos")
    .select("id, drive_file_id, thumbnail_path")
    .eq("owner_id", ownerId)
    .in("id", unique);
  if (error) throw new Error(error.message);

  const deleted: string[] = [];
  const warnings: string[] = [];

  for (const row of rows ?? []) {
    try {
      await deleteDriveFile(row.drive_file_id);
    } catch (err) {
      warnings.push(
        `Drive ${row.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (row.thumbnail_path) {
      const { error: storageError } = await supabase.storage
        .from("memory-thumbnails")
        .remove([row.thumbnail_path]);
      if (storageError) {
        warnings.push(`Thumbnail ${row.id}: ${storageError.message}`);
      }
    }
    const { error: deleteError } = await supabase
      .from("photos")
      .delete()
      .eq("id", row.id)
      .eq("owner_id", ownerId);
    if (deleteError) {
      warnings.push(`DB ${row.id}: ${deleteError.message}`);
      continue;
    }
    deleted.push(row.id);
  }

  return { deleted, warnings };
}
```

- [ ] **Step 3: Run** `npx vitest run src/features/photos/hard-delete-photos.test.ts` — expect PASS.

---

### Task 3: `deleteMemoryEvent` + DELETE API

**Files:**
- Create: `src/features/memories/delete-memory.ts`
- Create: `src/features/memories/delete-memory.test.ts`
- Modify: `src/app/api/memories/[id]/route.ts`

**Interfaces:**
- Consumes: `findUnreferencedPhotoIds`, `hardDeletePhotos`, `revalidatePublishedArchive`
- Produces: `DeleteMemoryBodySchema`, `assertPublishedDeleteConfirm(title, confirmTitle, status)`, `deleteMemoryEvent({ ownerId, memoryId, confirmTitle? })`

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  DeleteMemoryBodySchema,
  assertPublishedDeleteConfirm,
} from "@/features/memories/delete-memory";

describe("DeleteMemoryBodySchema", () => {
  it("allows empty body", () => {
    expect(DeleteMemoryBodySchema.safeParse({}).success).toBe(true);
  });
  it("accepts confirmTitle", () => {
    expect(DeleteMemoryBodySchema.safeParse({ confirmTitle: "福州之行" }).success).toBe(true);
  });
});

describe("assertPublishedDeleteConfirm", () => {
  it("allows draft without title", () => {
    expect(() => assertPublishedDeleteConfirm("t", undefined, "draft")).not.toThrow();
  });
  it("rejects published without matching title", () => {
    expect(() => assertPublishedDeleteConfirm("福州之行", undefined, "published")).toThrow(
      /confirmTitle/,
    );
    expect(() => assertPublishedDeleteConfirm("福州之行", "错", "published")).toThrow(
      /confirmTitle/,
    );
  });
  it("allows published with exact title", () => {
    expect(() =>
      assertPublishedDeleteConfirm("福州之行", "福州之行", "published"),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Implement** `delete-memory.ts`:

```ts
import { z } from "zod";
import {
  findUnreferencedPhotoIds,
  hardDeletePhotos,
} from "@/features/photos/hard-delete-photos";
import { revalidatePublishedArchive } from "@/features/memories/published";
import { createServiceClient } from "@/lib/supabase/admin";

export const DeleteMemoryBodySchema = z.object({
  confirmTitle: z.string().optional(),
});

export function assertPublishedDeleteConfirm(
  title: string,
  confirmTitle: string | undefined,
  status: "draft" | "published" | "archived",
) {
  if (status !== "published") return;
  if (confirmTitle !== title) {
    throw new Error("confirmTitle must exactly match the memory title to delete a published memory.");
  }
}

export async function deleteMemoryEvent(input: {
  ownerId: string;
  memoryId: string;
  confirmTitle?: string;
}) {
  const supabase = createServiceClient();
  const { data: event, error } = await supabase
    .from("memory_events")
    .select("id, title, status")
    .eq("id", input.memoryId)
    .eq("owner_id", input.ownerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!event) throw new Error("Not found");

  assertPublishedDeleteConfirm(event.title, input.confirmTitle, event.status);

  const { data: links, error: linksError } = await supabase
    .from("event_photos")
    .select("photo_id")
    .eq("event_id", input.memoryId);
  if (linksError) throw new Error(linksError.message);
  const photoIds = (links ?? []).map((row) => row.photo_id);

  const { error: deleteError } = await supabase
    .from("memory_events")
    .delete()
    .eq("id", input.memoryId)
    .eq("owner_id", input.ownerId);
  if (deleteError) throw new Error(deleteError.message);

  const orphans = await findUnreferencedPhotoIds(photoIds);
  const cleanup = await hardDeletePhotos(input.ownerId, orphans);

  revalidatePublishedArchive();
  return { ok: true as const, warnings: cleanup.warnings };
}
```

- [ ] **Step 3: Add DELETE handler** to `src/app/api/memories/[id]/route.ts` mirroring PATCH auth pattern; parse body with `DeleteMemoryBodySchema` (empty object if no body); map `"Not found"` → 404, confirmTitle errors → 400.

- [ ] **Step 4: Run** `npx vitest run src/features/memories/delete-memory.test.ts`

---

### Task 4: `removePhotosFromEvent` + orphan photo delete + APIs

**Files:**
- Create: `src/features/memories/remove-photos.ts`
- Create: `src/features/memories/remove-photos.test.ts`
- Create: `src/features/photos/delete-orphan-photo.ts`
- Create: `src/app/api/memories/[id]/photos/remove/route.ts`
- Create: `src/app/api/photos/[id]/route.ts`

**Interfaces:**
- Produces:
  - `RemovePhotosBodySchema` (`photoIds: z.array(z.string().uuid()).min(1)`)
  - `assertKeepsAtLeastOnePhoto(currentCount, removeCount)`
  - `removePhotosFromEvent({ ownerId, memoryId, photoIds })`
  - `deleteOrphanPhoto({ ownerId, photoId })`

- [ ] **Step 1: Tests**

```ts
import { describe, expect, it } from "vitest";
import {
  RemovePhotosBodySchema,
  assertKeepsAtLeastOnePhoto,
} from "@/features/memories/remove-photos";

describe("RemovePhotosBodySchema", () => {
  it("requires at least one uuid", () => {
    expect(RemovePhotosBodySchema.safeParse({ photoIds: [] }).success).toBe(false);
    expect(
      RemovePhotosBodySchema.safeParse({
        photoIds: ["00000000-0000-4000-8000-000000000001"],
      }).success,
    ).toBe(true);
  });
});

describe("assertKeepsAtLeastOnePhoto", () => {
  it("throws when removal would leave zero", () => {
    expect(() => assertKeepsAtLeastOnePhoto(1, 1)).toThrow(/至少保留一张/);
  });
  it("allows leaving one or more", () => {
    expect(() => assertKeepsAtLeastOnePhoto(3, 2)).not.toThrow();
  });
});
```

- [ ] **Step 2: Implement remove-photos** — load links ordered by `sort_order`; validate all `photoIds` belong to event; `assertKeepsAtLeastOnePhoto`; delete matching `event_photos`; if cover removed, set `cover_photo_id` to first remaining and set that link `role=cover` (others keep roles or demote old cover); `findUnreferencedPhotoIds` + `hardDeletePhotos`; `revalidatePublishedArchive`; return `{ ok: true, remainingPhotoIds, warnings }`.

- [ ] **Step 3: Implement deleteOrphanPhoto** — if any `event_photos` for id → throw `"Photo is still linked to an event"`; else `hardDeletePhotos`.

- [ ] **Step 4: Wire POST `/api/memories/[id]/photos/remove` and DELETE `/api/photos/[id]`** with `requireSiteSession`.

- [ ] **Step 5: Run** related vitest files.

---

### Task 5: UI — drafts list, editor, upload wizard

**Files:**
- Create: `src/components/studio/delete-memory-button.tsx` (client)
- Modify: `src/app/(studio)/studio/drafts/page.tsx`
- Modify: `src/components/studio/memory-editor.tsx`
- Modify: `src/components/studio/upload-wizard.tsx`

**Interfaces:**
- Consumes: DELETE `/api/memories/[id]`, POST remove, DELETE `/api/photos/[id]`

- [ ] **Step 1: `DeleteMemoryButton`** props: `{ memoryId, title, status, onDeleted?: () => void, className? }`. Draft: confirm string. Published: input must match `title`. Calls DELETE with JSON body; on success `router.refresh()` + optional `onDeleted` (editor: `router.push("/studio/drafts")`).

- [ ] **Step 2: Drafts list** — each row: flex with Link + `DeleteMemoryButton` (stopPropagation on button container).

- [ ] **Step 3: Editor** — toolbar add `DeleteMemoryButton`; each photo card add「移除」calling POST remove; disable when `photos.length === 1` with title hint「至少保留一张」; on success update local `photos` state from response or filter locally; if cover removed, first remaining becomes cover in UI.

- [ ] **Step 4: Upload wizard** — rename/clarify cancel: for `error`/`queued` local-only + `URL.revokeObjectURL`; for `done` with `photoId` call DELETE `/api/photos/[id]` then remove; add「清除全部失败」button.

- [ ] **Step 5: Mobile check** — buttons wrap with existing `flex-wrap`; no horizontal overflow on drafts cards.

---

### Task 6: Docs + decisions + validate

**Files:**
- Modify: `DECISIONS.md` (Decision 014 or next number — check existing 013/014)
- Modify: `TASKS.md` Notes
- Modify: `docs/deploy.md` § GAS — redeploy for `deleteFile`
- Modify: `docs/phase-2-setup.md` — list `deleteFile` among actions

- [ ] **Step 1: Append Decision** — hard cleanup on zero refs; published delete requires exact title; GAS `deleteFile` trash; min one photo per event on remove.

- [ ] **Step 2: TASKS note** — delete draft / remove photos shipped; remind GAS redeploy.

- [ ] **Step 3: Run** `npm run validate` — fix any failures.

---

## Spec coverage checklist

| Spec item | Task |
| --- | --- |
| DELETE memory + published title confirm | 3, 5 |
| POST remove photos, keep ≥1, cover migrate | 4, 5 |
| DELETE orphan photo for upload cancel | 4, 5 |
| hardDelete Drive + thumbnail + photos row | 1, 2 |
| GAS deleteFile | 1, 6 |
| Upload clear failed | 5 |
| Tests for confirm / min-one / unreferenced | 2, 3, 4 |
| Docs / DECISIONS / TASKS | 6 |
| warnings on storage fail, memory still deleted | 3 (`warnings` returned) |

## Placeholder / consistency self-review

- No TBD left; commit steps skipped per user git rule
- Function names consistent: `hardDeletePhotos`, `findUnreferencedPhotoIds`, `deleteMemoryEvent`, `removePhotosFromEvent`, `deleteOrphanPhoto`, `deleteDriveFile`
- Decision number: verify against current `DECISIONS.md` at implementation time (013/014 already used for cache/pagination — use next free id)
