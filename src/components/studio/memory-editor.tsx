"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PhotoPlaceholder } from "@/components/experience/photo-placeholder";
import { FadeIn } from "@/components/motion/fade-in";
import { DeleteMemoryButton } from "@/components/studio/delete-memory-button";
import { buttonVariants } from "@/components/ui/button";
import { CHAPTER_IDS, type ChapterId } from "@/config/chapters";
import type { EditorMemoryPayload, EditorPhoto } from "@/features/memories/get-editor-memory";
import { memoryTemplates, MemoryLayoutRenderer } from "@/features/templates/registry";
import { cn } from "@/lib/utils";
import { buildPublishSlug } from "@/lib/utils/slug";

type MemoryEditorProps = {
  initial: EditorMemoryPayload;
};

type MobileTab = "content" | "photos" | "design" | "preview";

export function MemoryEditor({ initial }: MemoryEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.memory.title);
  const [savedTitle, setSavedTitle] = useState(initial.memory.title);
  const [oneLine, setOneLine] = useState(initial.memory.oneLine);
  const [diaryBody, setDiaryBody] = useState(initial.memory.diaryBody);
  const [userNote, setUserNote] = useState(initial.memory.userNote);
  const [eventDate, setEventDate] = useState(initial.memory.eventDate);
  const [placeName, setPlaceName] = useState(initial.memory.placeName ?? "");
  const [templateId, setTemplateId] = useState(initial.memory.templateId);
  const [chapter, setChapter] = useState(initial.memory.chapter ?? "ordinary_days");
  const [photos, setPhotos] = useState<EditorPhoto[]>(initial.photos);
  const [siblings] = useState(initial.siblingDrafts);
  const [mergeSourceId, setMergeSourceId] = useState(initial.siblingDrafts[0]?.id ?? "");
  const [selectedForSplit, setSelectedForSplit] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState("已加载");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("content");
  const skipFirstAutosave = useRef(true);
  const [tone, setTone] = useState("温柔日记");
  const [excludedDetails, setExcludedDetails] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [inferredFacts, setInferredFacts] = useState<string[]>([]);
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [versions, setVersions] = useState(initial.diaryVersions);
  const [status, setStatus] = useState(initial.memory.status);
  const [slug, setSlug] = useState(initial.memory.slug);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [removeBusyId, setRemoveBusyId] = useState<string | null>(null);

  const memory = useMemo(
    () => ({
      ...initial.memory,
      title,
      oneLine,
      diaryBody,
      templateId,
      eventDate,
      placeName: placeName || null,
      chapter,
    }),
    [chapter, diaryBody, eventDate, initial.memory, oneLine, placeName, templateId, title],
  );

  async function persist(message = "已自动保存", options?: { throwOnError?: boolean }) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/memories/${initial.memory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          oneLine: oneLine || null,
          diaryBody: diaryBody || null,
          userNote: userNote || null,
          eventDate,
          placeName: placeName || null,
          templateId,
          chapter,
          photoOrder: photos.map((photo, index) => ({
            photoId: photo.photoId,
            role: index === 0 ? "cover" : photo.role,
          })),
        }),
      });
      const json = (await response.json()) as { ok?: boolean; message?: string; savedAt?: string };
      if (!response.ok || !json.ok) {
        throw new Error(json.message ?? "Save failed");
      }
      setSavedAt(
        `${message} · ${new Date(json.savedAt ?? Date.now()).toLocaleTimeString("zh-CN")}`,
      );
      setSavedTitle(title);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      if (options?.throwOnError) throw err;
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (skipFirstAutosave.current) {
      skipFirstAutosave.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void persist();
    }, 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, oneLine, diaryBody, userNote, eventDate, placeName, templateId, chapter, photos]);

  function movePhoto(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setPhotos(next);
  }

  function setCover(index: number) {
    if (index === 0) return;
    const next = [...photos];
    const [item] = next.splice(index, 1);
    next.unshift({ ...item, role: "cover" });
    setPhotos(next);
  }

  function toggleSplitPhoto(photoId: string) {
    setSelectedForSplit((current) =>
      current.includes(photoId)
        ? current.filter((id) => id !== photoId)
        : [...current, photoId],
    );
  }

  async function handleMerge() {
    if (!mergeSourceId) return;
    setError(null);
    const response = await fetch("/api/memories/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetId: initial.memory.id,
        sourceId: mergeSourceId,
      }),
    });
    const json = (await response.json()) as { ok?: boolean; message?: string };
    if (!response.ok || !json.ok) {
      setError(json.message ?? "Merge failed");
      return;
    }
    router.refresh();
    window.location.reload();
  }

  async function handleSplit() {
    if (selectedForSplit.length === 0) return;
    setError(null);
    const response = await fetch(`/api/memories/${initial.memory.id}/split`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoIdsForNewEvent: selectedForSplit }),
    });
    const json = (await response.json()) as {
      ok?: boolean;
      message?: string;
      newEventId?: string;
    };
    if (!response.ok || !json.ok || !json.newEventId) {
      setError(json.message ?? "Split failed");
      return;
    }
    router.push(`/studio/memories/${json.newEventId}/edit`);
  }

  async function loadVersions() {
    const response = await fetch(`/api/memories/${initial.memory.id}/versions`);
    const json = (await response.json()) as {
      ok?: boolean;
      versions?: typeof versions;
    };
    if (response.ok && json.ok && json.versions) {
      setVersions(json.versions);
    }
  }

  async function runAI() {
    setAiBusy(true);
    setError(null);
    try {
      await persist("生成前已保存", { throwOnError: true });
      const response = await fetch("/api/ai/analyze-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memoryId: initial.memory.id,
          tone,
          excludedDetails,
          language: "zh-CN",
        }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        message?: string;
        provider?: string;
        analysis?: {
          title: string;
          oneLine: string;
          diaryBody: string;
          templateSuggestion: string;
          chapterSuggestion?: string;
          placeSuggestion: string | null;
          questionsToConfirm: string[];
          inferredFacts: string[];
        };
      };
      if (!response.ok || !json.ok || !json.analysis) {
        throw new Error(json.message ?? "AI generation failed");
      }

      setTitle(json.analysis.title);
      setOneLine(json.analysis.oneLine);
      setDiaryBody(json.analysis.diaryBody);
      setTemplateId(json.analysis.templateSuggestion);
      if (
        json.analysis.chapterSuggestion &&
        (CHAPTER_IDS as readonly string[]).includes(json.analysis.chapterSuggestion)
      ) {
        setChapter(json.analysis.chapterSuggestion as ChapterId);
      }
      if (json.analysis.placeSuggestion) {
        setPlaceName(json.analysis.placeSuggestion);
      }
      setQuestions(json.analysis.questionsToConfirm ?? []);
      setInferredFacts(json.analysis.inferredFacts ?? []);
      setAiProvider(json.provider ?? null);
      setSavedAt(`AI 草稿已写入 · ${new Date().toLocaleTimeString("zh-CN")}`);
      await loadVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setAiBusy(false);
    }
  }

  async function restoreVersion(versionId: string) {
    setError(null);
    const response = await fetch(`/api/memories/${initial.memory.id}/versions/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId }),
    });
    const json = (await response.json()) as { ok?: boolean; message?: string };
    if (!response.ok || !json.ok) {
      setError(json.message ?? "Restore failed");
      return;
    }
    window.location.reload();
  }

  async function runPublish() {
    setPublishBusy(true);
    setError(null);
    try {
      await persist("发布前已保存", { throwOnError: true });
      const response = await fetch(`/api/memories/${initial.memory.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const json = (await response.json()) as { ok?: boolean; message?: string; slug?: string };
      if (!response.ok || !json.ok) {
        throw new Error(json.message ?? "Publish failed");
      }
      setStatus("published");
      if (json.slug) setSlug(json.slug);
      setPublishOpen(false);
      setSavedAt(`已发布 · ${new Date().toLocaleTimeString("zh-CN")}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishBusy(false);
    }
  }

  async function runUnpublish() {
    setPublishBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/memories/${initial.memory.id}/unpublish`, {
        method: "POST",
      });
      const json = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !json.ok) {
        throw new Error(json.message ?? "Unpublish failed");
      }
      setStatus("draft");
      setSavedAt(`已取消发布 · ${new Date().toLocaleTimeString("zh-CN")}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unpublish failed");
    } finally {
      setPublishBusy(false);
    }
  }

  async function removePhoto(photoId: string) {
    if (photos.length <= 1) return;
    setRemoveBusyId(photoId);
    setError(null);
    try {
      const response = await fetch(`/api/memories/${initial.memory.id}/photos/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: [photoId] }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        message?: string;
        remainingPhotoIds?: string[];
      };
      if (!response.ok || !json.ok || !json.remainingPhotoIds) {
        throw new Error(json.message ?? "Remove failed");
      }
      const remaining = new Set(json.remainingPhotoIds);
      setPhotos((current) => {
        const next = current.filter((photo) => remaining.has(photo.photoId));
        if (next.length === 0) return next;
        return next.map((photo, index) => ({
          ...photo,
          role: index === 0 ? "cover" : photo.role === "cover" ? "detail" : photo.role,
        }));
      });
      setSelectedForSplit((current) => current.filter((id) => id !== photoId));
      setSavedAt(`已移除照片 · ${new Date().toLocaleTimeString("zh-CN")}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setRemoveBusyId(null);
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <FadeIn className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-gold uppercase">Editor</p>
          <h1 className="mt-2 font-serif text-3xl text-ink">编辑回忆</h1>
          <p className="mt-1 text-xs text-muted-ours">
            {saving ? "保存中…" : savedAt}
            {status === "published" ? " · 已发布" : " · 草稿"}
          </p>
          {error ? <p className="mt-1 text-xs text-accent-ours">{error}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void persist("草稿已保存")}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            保存草稿
          </button>
          {status === "published" ? (
            <>
              <Link
                href={`/memory/${slug}`}
                className={cn(buttonVariants({ variant: "outline" }))}
                target="_blank"
              >
                查看已发布页
              </Link>
              <button
                type="button"
                disabled={publishBusy}
                onClick={() => void runUnpublish()}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                {publishBusy ? "处理中…" : "取消发布"}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={publishBusy}
              onClick={() => {
                setSlug(buildPublishSlug(eventDate, title));
                setPublishOpen(true);
              }}
              className={cn(buttonVariants())}
            >
              发布
            </button>
          )}
          <DeleteMemoryButton
            memoryId={initial.memory.id}
            title={status === "published" ? savedTitle : title}
            status={status}
            onDeleted={() => router.push("/studio/drafts")}
          />
        </div>
      </FadeIn>

      {publishOpen ? (
        <div className="mt-4 rounded-xl border border-line bg-paper p-4">
          <p className="text-sm font-medium text-ink">确认发布</p>
          <p className="mt-1 text-xs text-muted-ours">
            {title} · {eventDate}
            {placeName ? ` · ${placeName}` : ""}
          </p>
          <label className="mt-3 block text-xs text-muted-ours" htmlFor="publish-slug">
            链接 slug（仅英文、数字、连字符）
          </label>
          <input
            id="publish-slug"
            value={slug}
            onChange={(event) =>
              setSlug(
                event.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "-")
                  .replace(/-{2,}/g, "-"),
              )
            }
            className="mt-1 w-full max-w-md rounded-lg border border-line bg-background px-3 py-2 text-sm"
          />
          <p className="mt-1 text-[11px] text-muted-ours">
            中文标题会默认成日期 + memory，可改成更有意义的英文，例如{" "}
            <button
              type="button"
              className="underline"
              onClick={() => setSlug(buildPublishSlug(eventDate, "fuzhou-trip"))}
            >
              {buildPublishSlug(eventDate, "fuzhou-trip")}
            </button>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={publishBusy}
              onClick={() => void runPublish()}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              {publishBusy ? "发布中…" : "确认发布"}
            </button>
            <button
              type="button"
              disabled={publishBusy}
              onClick={() => setPublishOpen(false)}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              取消
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex gap-2 overflow-x-auto lg:hidden" role="tablist" aria-label="编辑分区">
        {(
          [
            ["content", "内容"],
            ["photos", "照片"],
            ["design", "设计"],
            ["preview", "预览"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mobileTab === id}
            onClick={() => setMobileTab(id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs",
              mobileTab === id ? "border-ink bg-ink text-paper" : "border-line text-muted-ours",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr_300px]">
        <aside
          className={cn(
            "space-y-4 rounded-2xl border border-line bg-paper p-4",
            mobileTab === "photos" ? "block" : "hidden lg:block",
          )}
        >
          <h2 className="text-sm font-medium text-ink">照片排序 / 封面</h2>
          <ul className="space-y-3">
            {photos.map((photo, index) => (
              <li key={photo.photoId} className="rounded-xl border border-line p-2">
                <PhotoPlaceholder
                  photo={photo}
                  imageUrl={photo.thumbnailUrl}
                  className="aspect-video rounded-md"
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="rounded border border-line px-2 py-0.5 text-[10px]"
                    onClick={() => movePhoto(index, -1)}
                  >
                    上移
                  </button>
                  <button
                    type="button"
                    className="rounded border border-line px-2 py-0.5 text-[10px]"
                    onClick={() => movePhoto(index, 1)}
                  >
                    下移
                  </button>
                  <button
                    type="button"
                    className="rounded border border-line px-2 py-0.5 text-[10px]"
                    onClick={() => setCover(index)}
                  >
                    设封面
                  </button>
                  <button
                    type="button"
                    disabled={photos.length <= 1 || removeBusyId === photo.photoId}
                    title={photos.length <= 1 ? "至少保留一张；要删整条请用删除回忆" : "移除照片"}
                    className="rounded border border-line px-2 py-0.5 text-[10px] text-accent-ours disabled:opacity-40"
                    onClick={() => void removePhoto(photo.photoId)}
                  >
                    {removeBusyId === photo.photoId ? "移除中…" : "移除"}
                  </button>
                  <label className="ml-auto flex items-center gap-1 text-[10px] text-muted-ours">
                    <input
                      type="checkbox"
                      checked={selectedForSplit.includes(photo.photoId)}
                      onChange={() => toggleSplitPhoto(photo.photoId)}
                    />
                    拆出
                  </label>
                </div>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-dashed border-line p-3">
            <p className="text-xs font-medium text-ink">拆分事件</p>
            <p className="mt-1 text-[11px] text-muted-ours">勾选照片后拆到新草稿。</p>
            <button
              type="button"
              disabled={selectedForSplit.length === 0}
              onClick={() => void handleSplit()}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2")}
            >
              拆分所选
            </button>
          </div>

          <div className="rounded-xl border border-dashed border-line p-3">
            <p className="text-xs font-medium text-ink">合并其他草稿</p>
            <select
              value={mergeSourceId}
              onChange={(event) => setMergeSourceId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-line bg-background px-2 py-1.5 text-xs"
            >
              <option value="">选择草稿…</option>
              {siblings.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.eventDate} · {item.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!mergeSourceId}
              onClick={() => void handleMerge()}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2")}
            >
              合并到当前
            </button>
          </div>
        </aside>

        <div
          className={cn(
            "rounded-2xl border border-line bg-background p-4 md:p-6",
            mobileTab === "preview" ? "block" : "hidden lg:block",
          )}
        >
          <MemoryLayoutRenderer
            memory={memory}
            photos={photos.map((photo) => ({
              ...photo,
              // Layout still uses gradients unless we extend layouts; thumbnails show in sidebar.
            }))}
            mode="preview"
          />
        </div>

        <aside
          className={cn(
            "space-y-4 rounded-2xl border border-line bg-paper p-4",
            mobileTab === "content" || mobileTab === "design" ? "block" : "hidden lg:block",
          )}
        >
          <div className={cn(mobileTab === "design" && "hidden lg:block")}>
            <label className="text-xs text-muted-ours" htmlFor="title">
              标题
            </label>
            <input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />

            <label className="mt-4 block text-xs text-muted-ours" htmlFor="event-date">
              日期
            </label>
            <input
              id="event-date"
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />

            <label className="mt-4 block text-xs text-muted-ours" htmlFor="place">
              地点
            </label>
            <input
              id="place"
              value={placeName}
              onChange={(event) => setPlaceName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />

            <label className="mt-4 block text-xs text-muted-ours" htmlFor="chapter">
              故事章节
            </label>
            <select
              id="chapter"
              value={chapter}
              onChange={(event) => setChapter(event.target.value as ChapterId)}
              className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {CHAPTER_IDS.map((id) => (
                <option key={id} value={id}>
                  {initial.chapterLabels[id]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-ours">
              显示名称可在 Studio → 设置 里自定义
            </p>

            <label className="mt-4 block text-xs text-muted-ours" htmlFor="one-line">
              一句话
            </label>
            <input
              id="one-line"
              value={oneLine}
              onChange={(event) => setOneLine(event.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />

            <label className="mt-4 block text-xs text-muted-ours" htmlFor="user-note">
              真实记忆备注（给 AI，不自动公开）
            </label>
            <textarea
              id="user-note"
              value={userNote}
              onChange={(event) => setUserNote(event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />

            <label className="mt-4 block text-xs text-muted-ours" htmlFor="diary">
              日记正文
            </label>
            <textarea
              id="diary"
              value={diaryBody}
              onChange={(event) => setDiaryBody(event.target.value)}
              rows={8}
              className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />

            <div className="mt-5 rounded-xl border border-line bg-background p-3">
              <p className="text-xs font-medium text-ink">AI 日记草稿</p>
              <p className="mt-1 text-[11px] text-muted-ours">
                基于备注、时间地点与照片元数据生成草稿；失败不会删照片。
              </p>
              <label className="mt-3 block text-xs text-muted-ours" htmlFor="tone">
                语气
              </label>
              <select
                id="tone"
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-paper px-2 py-1.5 text-xs"
              >
                {["温柔日记", "电影旁白", "轻松幽默", "简短记录", "旅行杂志", "写给未来"].map(
                  (item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ),
                )}
              </select>
              <label className="mt-3 block text-xs text-muted-ours" htmlFor="exclude">
                不要写进日记
              </label>
              <input
                id="exclude"
                value={excludedDetails}
                onChange={(event) => setExcludedDetails(event.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-paper px-2 py-1.5 text-xs"
                placeholder="可选"
              />
              <button
                type="button"
                disabled={aiBusy}
                onClick={() => void runAI()}
                className={cn(buttonVariants({ size: "sm" }), "mt-3 w-full")}
              >
                {aiBusy ? "生成中…" : "生成 / 重新生成日记"}
              </button>
              {error ? (
                <p className="mt-2 text-[11px] leading-relaxed text-accent-ours" role="alert">
                  {error}
                </p>
              ) : null}
              {aiBusy ? (
                <p className="mt-2 text-[11px] text-muted-ours">正在调用模型，通常需要几秒…</p>
              ) : null}
              {aiProvider ? (
                <p className="mt-2 text-[11px] text-muted-ours">Provider: {aiProvider}</p>
              ) : null}
              {questions.length > 0 ? (
                <div className="mt-3">
                  <p className="text-[11px] font-medium text-ink">待确认</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-muted-ours">
                    {questions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {inferredFacts.length > 0 ? (
                <div className="mt-3">
                  <p className="text-[11px] font-medium text-ink">推断（需复核）</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-muted-ours">
                    {inferredFacts.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {versions.length > 0 ? (
                <div className="mt-3">
                  <p className="text-[11px] font-medium text-ink">历史版本</p>
                  <ul className="mt-1 space-y-1">
                    {versions.slice(0, 5).map((version) => (
                      <li
                        key={version.id}
                        className="flex items-center justify-between gap-2 text-[11px] text-muted-ours"
                      >
                        <span className="truncate">
                          {version.source} · {version.title}
                        </span>
                        <button
                          type="button"
                          className="shrink-0 underline"
                          onClick={() => void restoreVersion(version.id)}
                        >
                          恢复
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

            <div className={cn(mobileTab === "content" && "hidden lg:block")}>
            <p className="text-xs text-muted-ours">模板</p>
            <div className="mt-2 flex flex-col gap-2">
              {memoryTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setTemplateId(template.id)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-xs",
                    templateId === template.id
                      ? "border-ink bg-ink text-paper"
                      : "border-line text-muted-ours",
                  )}
                >
                  <span className="block font-medium">{template.name}</span>
                  <span className="opacity-80">{template.description}</span>
                </button>
              ))}
            </div>
          </div>

          <Link
            href="/studio/drafts"
            className="inline-block text-xs text-accent-ours underline-offset-4 hover:underline"
          >
            返回草稿列表
          </Link>
        </aside>
      </div>
    </section>
  );
}
