"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { FadeIn } from "@/components/motion/fade-in";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, title: "上传照片" },
  { id: 2, title: "确认事件" },
] as const;

const CONCURRENCY = 3;

type UploadItem = {
  localId: string;
  file: File;
  previewUrl: string;
  status: "queued" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  photoId?: string;
  takenAt?: string | null;
  takenAtSource?: string;
  needsDateConfirm?: boolean;
};

type DraftEvent = {
  id: string;
  slug: string;
  title: string;
  eventDate: string;
  photoIds: string[];
  confidence: number;
};

async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
) {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function run() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => run()),
  );
  return results;
}

export function UploadWizard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [events, setEvents] = useState<DraftEvent[]>([]);
  const [groupingError, setGroupingError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const donePhotos = useMemo(
    () => items.filter((item) => item.status === "done" && item.photoId),
    [items],
  );

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const next = Array.from(fileList).map((file) => ({
      localId: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "queued" as const,
      progress: 0,
    }));
    setItems((current) => [...current, ...next]);
  }, []);

  async function uploadQueued() {
    setBusy(true);
    const queued = items.filter((item) => item.status === "queued" || item.status === "error");

    await mapPool(queued, CONCURRENCY, async (item) => {
      setItems((current) =>
        current.map((row) =>
          row.localId === item.localId
            ? { ...row, status: "uploading", progress: 20, error: undefined }
            : row,
        ),
      );

      try {
        const body = new FormData();
        body.append("file", item.file);
        const response = await fetch("/api/uploads", {
          method: "POST",
          body,
        });
        const json = (await response.json()) as {
          ok: boolean;
          message?: string;
          photo?: {
            id: string;
            takenAt: string | null;
            takenAtSource: string;
            needsDateConfirm: boolean;
          };
        };

        if (!response.ok || !json.ok || !json.photo) {
          throw new Error(json.message ?? "Upload failed");
        }

        setItems((current) =>
          current.map((row) =>
            row.localId === item.localId
              ? {
                  ...row,
                  status: "done",
                  progress: 100,
                  photoId: json.photo?.id,
                  takenAt: json.photo?.takenAt,
                  takenAtSource: json.photo?.takenAtSource,
                  needsDateConfirm: json.photo?.needsDateConfirm,
                }
              : row,
          ),
        );
      } catch (error) {
        setItems((current) =>
          current.map((row) =>
            row.localId === item.localId
              ? {
                  ...row,
                  status: "error",
                  progress: 0,
                  error: error instanceof Error ? error.message : "Upload failed",
                }
              : row,
          ),
        );
      }
    });

    setBusy(false);
  }

  async function createGroups() {
    setBusy(true);
    setGroupingError(null);
    try {
      const photoIds = donePhotos
        .map((item) => item.photoId)
        .filter((id): id is string => Boolean(id));

      const response = await fetch("/api/uploads/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds }),
      });
      const json = (await response.json()) as {
        ok: boolean;
        message?: string;
        events?: DraftEvent[];
      };
      if (!response.ok || !json.ok || !json.events) {
        throw new Error(json.message ?? "Grouping failed");
      }
      setEvents(json.events);
      setStep(2);
    } catch (error) {
      setGroupingError(error instanceof Error ? error.message : "Grouping failed");
    } finally {
      setBusy(false);
    }
  }

  function mergeFirstTwo() {
    setEvents((current) => {
      if (current.length < 2) return current;
      const [a, b, ...rest] = current;
      return [
        {
          ...a,
          photoIds: [...a.photoIds, ...b.photoIds],
          title: `${a.title} +`,
        },
        ...rest,
      ];
    });
  }

  function splitFirst() {
    setEvents((current) => {
      const first = current[0];
      if (!first || first.photoIds.length < 2) return current;
      const mid = Math.ceil(first.photoIds.length / 2);
      return [
        { ...first, photoIds: first.photoIds.slice(0, mid) },
        {
          ...first,
          id: crypto.randomUUID(),
          slug: `${first.slug}-split`,
          title: `${first.title} · 拆分`,
          photoIds: first.photoIds.slice(mid),
        },
        ...current.slice(1),
      ];
    });
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-12">
      <FadeIn>
        <p className="text-xs tracking-[0.2em] text-gold uppercase">Upload</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">上传回忆</h1>
        <p className="mt-2 text-sm text-muted-ours">
          上传并确认事件后进入编辑器，在那里补充真实记忆并生成日记草稿。
        </p>
      </FadeIn>

      <ol className="mt-8 grid gap-2 sm:grid-cols-2">
        {steps.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setStep(item.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                step === item.id
                  ? "border-ink bg-ink text-paper"
                  : "border-line bg-paper text-muted-ours hover:border-ink/30",
              )}
            >
              <span className="flex size-6 items-center justify-center rounded-full border border-current text-xs">
                {item.id}
              </span>
              {item.title}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-2xl border border-line bg-paper p-6">
        {step === 1 ? (
          <div className="space-y-4">
            <h2 className="font-serif text-xl text-ink">选择照片</h2>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files?.length) {
                  addFiles(event.target.files);
                  event.target.value = "";
                }
              }}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  inputRef.current?.click();
                }
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (event.dataTransfer.files?.length) {
                  addFiles(event.dataTransfer.files);
                }
              }}
              className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted-ours"
            >
              拖放或点击选择照片（并发 {CONCURRENCY}）
            </div>

            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.localId}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-3 py-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="size-14 rounded-md object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{item.file.name}</p>
                    <p className="text-xs text-muted-ours">
                      {item.status}
                      {item.needsDateConfirm ? " · 日期需确认" : ""}
                      {item.error ? ` · ${item.error}` : ""}
                    </p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full bg-ink transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-muted-ours underline"
                    onClick={() =>
                      setItems((current) =>
                        current.filter((row) => row.localId !== item.localId),
                      )
                    }
                  >
                    取消
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || items.length === 0}
                onClick={uploadQueued}
                className={cn(buttonVariants())}
              >
                {busy ? "上传中…" : "开始上传"}
              </button>
              <button
                type="button"
                disabled={busy || donePhotos.length === 0}
                onClick={createGroups}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                生成事件分组
              </button>
            </div>
            {groupingError ? (
              <p className="text-sm text-accent-ours">{groupingError}</p>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <h2 className="font-serif text-xl text-ink">确认事件分组</h2>
            <p className="text-sm text-muted-ours">
              已按日期/时间/GPS 规则生成候选。可先合并或拆分；补充记忆与 AI
              生成在编辑器完成。
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                onClick={mergeFirstTwo}
              >
                合并前两组
              </button>
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                onClick={splitFirst}
              >
                拆分第一组
              </button>
            </div>
            <ul className="space-y-3">
              {events.map((event) => (
                <li key={event.id} className="rounded-xl border border-line px-4 py-3">
                  <p className="font-serif text-lg text-ink">{event.title}</p>
                  <p className="text-xs text-muted-ours">
                    {event.eventDate} · {event.photoIds.length} 张 · 置信度{" "}
                    {event.confidence.toFixed(2)}
                  </p>
                </li>
              ))}
              {events.length === 0 ? (
                <p className="text-sm text-muted-ours">还没有事件。请先在步骤 1 上传并分组。</p>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={step === 1}
          onClick={() => setStep(1)}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          上一步
        </button>
        {step === 1 ? (
          <button
            type="button"
            disabled={events.length === 0}
            onClick={() => setStep(2)}
            className={cn(buttonVariants())}
          >
            下一步
          </button>
        ) : events[0] ? (
          <Link
            href={`/studio/memories/${events[0].id}/edit`}
            className={cn(buttonVariants())}
          >
            进入编辑器
          </Link>
        ) : (
          <button type="button" disabled className={cn(buttonVariants(), "opacity-60")}>
            先完成分组
          </button>
        )}
      </div>
    </section>
  );
}
