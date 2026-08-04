# Delete Draft / Remove Photos Design

**Date:** 2026-08-04  
**Status:** Approved by user（规格 OK；已实现）  
**Scope:** 删除回忆（草稿 + 已发布）、编辑器移除照片、上传页清理失败/取消项；零引用硬清理（DB + 缩略图 + Drive）。

## Goal

管理员能安全地删掉不要的回忆，以及从事件里拿掉错误/不想要的照片；上传失败的队列项也能清掉。释放不再被引用的 Drive 原图与 Supabase 缩略图，避免垃圾堆积。

## Decisions (locked)

| Topic | Choice |
| --- | --- |
| Approach | 统一清理服务 + 列表 / 编辑器 / 上传三个入口 |
| Storage | 硬清理：照片零引用时删 `photos` + 缩略图 + Drive（`setTrashed`） |
| Who can delete | 草稿与已发布均可删 |
| Published confirm | 二次确认：须输入完整标题 |
| Draft confirm | 普通确认对话框即可 |
| Min photos in editor | 移除后事件至少保留 1 张 |
| Drive delete | GAS 新增 `deleteFile` → `setTrashed(true)`（进回收站） |
| Undo / trash UI | 不做应用内回收站 |

## Out of scope

- 批量删除多条回忆
- 应用内撤销 / 回收站浏览
- 改发布 / 取消发布流程
- 自动扫描历史孤儿文件（本轮只清「本次操作」产生的零引用）

---

## 1. APIs

鉴权一律 `requireSiteSession`；归属一律 `SITE_OWNER_ID`（`owner_id`）。外部输入 Zod。

### `DELETE /api/memories/[id]`

Body（JSON，可选但已发布时必填）:

```ts
{ confirmTitle?: string }
```

规则：

- 找不到或不属于 owner → 404
- `status === "published"`：`confirmTitle` 必须与当前 `title` **完全相等**，否则 400
- `status === "draft"`：可不传 `confirmTitle`；若传则忽略或同样校验（实现时选「忽略」即可）
- 成功：`{ ok: true }`
- 副作用：见 §3；`revalidatePath` 回忆列表、相关前台路径

### `POST /api/memories/[id]/photos/remove`

Body:

```ts
{ photoIds: string[] } // min 1
```

规则：

- 事件必须属于 owner
- 请求中的 `photoIds` 必须全部挂在该事件上，否则 400
- 移除后该事件剩余照片数 ≥ 1，否则 400（文案：至少保留一张）
- 若移除的是封面：把剩余第一张（按 `sort_order`）设为 cover / `cover_photo_id`
- 成功：`{ ok: true, remainingPhotoIds: string[] }`
- 对变为零引用的照片执行硬清理

### `DELETE /api/photos/[id]`

用于上传向导里**已成功上传但尚未入组**（或仅存在于 `photos`、无 `event_photos`）的「取消」。

规则：

- photo 属于 owner
- 若仍被任一 `event_photos` 引用 → 400（应走 remove API）
- 否则硬清理该照片
- 成功：`{ ok: true }`

---

## 2. Feature layer

建议文件（名称可微调，逻辑勿散落在页面里）：

- `src/features/memories/delete-memory.ts` — `deleteMemoryEvent`
- `src/features/memories/remove-photos.ts` — `removePhotosFromEvent`
- `src/features/photos/delete-orphan-photo.ts` — `deleteOrphanPhoto` / 共享 `hardDeletePhotos`
- `src/lib/google-drive/gas-client.ts` — `deleteDriveFile(fileId)`
- `gas/OursDriveGateway.gs` — `action: "deleteFile"`

### Shared hard delete

```text
hardDeletePhotos(photoIds[]):
  for each photo (owner-scoped):
    1. GAS deleteFile(drive_file_id) — 文件已不存在视为成功
    2. Storage remove thumbnail_path（若有）
    3. DELETE FROM photos WHERE id = …
```

调用方须先保证这些 id **已无** `event_photos` 引用（或即将由 FK cascade 处理前已确认零引用）。

注意现有 FK：

- `event_photos.event_id` → `memory_events` ON DELETE CASCADE
- `event_photos.photo_id` → `photos` ON DELETE CASCADE
- `diary_versions.event_id` → CASCADE
- `memory_events.cover_photo_id` → `photos` ON DELETE SET NULL

删事件时子表会 cascade；**不要**在仍被其他事件引用时删 `photos`。

---

## 3. Delete memory algorithm

```text
1. Load memory_events by id + owner_id
2. If published: require confirmTitle === title
3. Collect photo_ids from event_photos for this event
4. DELETE memory_events WHERE id（cascade: event_photos, diary_versions, event_tags…）
5. For each collected photo_id:
     if NOT EXISTS event_photos for photo_id → hardDeletePhotos([id])
6. revalidatePath: /studio/drafts, /studio, published surfaces as today
```

存储步骤失败：尽量继续后续 id；API 可返回 `{ ok: true, warnings: string[] }` 或记日志后仍 200（以「回忆已从产品消失」为成功标准）。实现计划阶段选定一种并写测试。

---

## 4. Remove photos algorithm

```text
1. Load event + current event_photos (ordered)
2. Validate photoIds ⊂ current set
3. remaining = current − photoIds; assert remaining.length >= 1
4. DELETE event_photos for (event_id, photoIds)
5. Update cover_photo_id / roles if needed（第一张 cover）
6. hardDeletePhotos(photoIds that are now unreferenced)
7. revalidate as needed
```

---

## 5. GAS `deleteFile`

`OursDriveGateway.gs` 增加：

```javascript
if (action === "deleteFile") {
  if (!body.fileId) throw new Error("fileId is required.");
  try {
    DriveApp.getFileById(body.fileId).setTrashed(true);
  } catch (err) {
    // 已不存在：视为成功（实现时按错误信息判断）
  }
  return json_({ ok: true, action: "deleteFile", fileId: body.fileId });
}
```

`gas-client.ts` 增加 `deleteDriveFile(fileId: string)`。

**运维：** 合并代码后须在 Google Apps Script 编辑器重新部署 Web App，否则生产仍无 `deleteFile`。

---

## 6. UI

### `/studio/drafts`（回忆列表）

- 每条旁「删除」按钮（阻止 Link 冒泡）
- 草稿：`window.confirm` 或轻量确认面板：「确定删除「{title}」？不可恢复。」
- 已发布：面板要求输入标题；不匹配则不可提交
- 成功后刷新列表（`router.refresh()`）

### 编辑器 `/studio/memories/[id]/edit`

- 「删除此回忆」：同上确认规则（读当前 status / title）
- 照片列表每张「移除」；当 `photos.length === 1` 时禁用并提示「至少保留一张；要删整条请用删除回忆」
- 移除成功后更新本地 `photos` state；必要时同步 cover

### 上传向导

- 每项：queued / error → 本地移除（revokeObjectURL）
- 每项：done → 调 `DELETE /api/photos/[id]`，成功后再本地移除
- 「清除全部失败」：一次清掉所有 `status === "error"`
- 「开始上传」继续重试 queued + error（现有行为保留）

---

## 7. Tests

- `deleteMemoryEvent`：draft 可删；published 无标题 / 错标题失败；对标题成功；共享照片不被误删
- `removePhotosFromEvent`：不能删到 0 张；封面迁移；零引用触发硬清理（mock GAS + storage）
- `deleteOrphanPhoto`：仍被引用时 400
- 可选：API 路由薄测或 feature 单测为主

验证命令：`npm run validate`（lint / typecheck / test / build）。

---

## 8. Docs / TASKS

- 完成后更新 `TASKS.md` Notes
- `DECISIONS.md` 追加一条（硬清理 + GAS deleteFile + 已发布标题确认）
- `docs/deploy.md` 或 GAS 相关说明补一句「删除功能需重新部署含 deleteFile 的 Web App」

---

## Spec self-review

- [x] 无 TBD / 占位符未决项（存储失败返回形态在实现计划里二选一即可）
- [x] 与 locked decisions 一致（硬清理、可删已发布、最少 1 张）
- [x] 范围清晰；批量删 / 回收站明确不做
- [x] 与现有 FK / cascade 行为对齐
