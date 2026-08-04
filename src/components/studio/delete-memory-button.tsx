"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DeleteMemoryButtonProps = {
  memoryId: string;
  title: string;
  status: "draft" | "published" | "archived";
  onDeleted?: () => void;
  className?: string;
  size?: "sm" | "default";
};

export function DeleteMemoryButton({
  memoryId,
  title,
  status,
  onDeleted,
  className,
  size = "sm",
}: DeleteMemoryButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsTitle = status === "published";
  const canSubmit = !needsTitle || confirmTitle === title;

  async function runDelete() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/memories/${memoryId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(needsTitle ? { confirmTitle } : {}),
      });
      const json = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !json.ok) {
        throw new Error(json.message ?? "Delete failed");
      }
      setOpen(false);
      router.refresh();
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        className={cn(buttonVariants({ variant: "outline", size }), "text-accent-ours")}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
          setConfirmTitle("");
          setError(null);
        }}
      >
        删除
      </button>

      {open ? (
        <div
          className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-line bg-paper p-3 shadow-sm"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <p className="text-xs text-ink">
            {needsTitle
              ? "删除已发布回忆不可恢复。请输入完整标题确认："
              : `确定删除「${title}」？不可恢复。`}
          </p>
          {needsTitle ? (
            <input
              value={confirmTitle}
              onChange={(event) => setConfirmTitle(event.target.value)}
              placeholder={title}
              className="mt-2 w-full rounded-lg border border-line bg-background px-2 py-1.5 text-xs"
              autoFocus
            />
          ) : null}
          {error ? <p className="mt-2 text-[11px] text-accent-ours">{error}</p> : null}
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              取消
            </button>
            <button
              type="button"
              className={cn(buttonVariants({ size: "sm" }), "bg-accent-ours text-white")}
              disabled={busy || !canSubmit}
              onClick={() => void runDelete()}
            >
              {busy ? "删除中…" : "确认删除"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
