"use client";

import { useState } from "react";
import { FadeIn } from "@/components/motion/fade-in";
import { PhotoPlaceholder } from "@/components/experience/photo-placeholder";
import { memoryTemplates, MemoryLayoutRenderer } from "@/features/templates/registry";
import { cn } from "@/lib/utils";
import type { EventPhoto, MemoryEvent } from "@/types/memory";

type SampleMemory = MemoryEvent & { photos: EventPhoto[] };

export function TemplatesGallery({ sample }: { sample: SampleMemory }) {
  const [selectedId, setSelectedId] = useState(sample.templateId);
  const selected = memoryTemplates.find((t) => t.id === selectedId) ?? memoryTemplates[0];
  const previewMemory = { ...sample, templateId: selected.id };

  return (
    <>
      <FadeIn>
        <p className="text-xs tracking-[0.2em] text-gold uppercase">Templates</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">版式模板</h1>
        <p className="mt-2 text-sm text-muted-ours">
          AI 只能推荐这些预设，不能自由生成 HTML/CSS。点击卡片可切换预览。
        </p>
      </FadeIn>

      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {memoryTemplates.map((template) => {
          const active = selectedId === template.id;
          return (
            <li key={template.id}>
              <button
                type="button"
                onClick={() => setSelectedId(template.id)}
                aria-pressed={active}
                className={cn(
                  "w-full rounded-2xl border bg-paper p-4 text-left transition-colors",
                  active
                    ? "border-ink ring-1 ring-ink"
                    : "border-line hover:border-ink/40",
                )}
              >
                <div className="grid grid-cols-3 gap-1">
                  {sample.photos.slice(0, 3).map((photo) => (
                    <PhotoPlaceholder
                      key={`${template.id}-${photo.id}`}
                      photo={photo}
                      className="aspect-square rounded-sm"
                    />
                  ))}
                </div>
                <h2 className="mt-4 font-serif text-xl text-ink">{template.name}</h2>
                <p className="mt-1 text-xs text-muted-ours">{template.description}</p>
                <p className="mt-2 text-[10px] tracking-wide text-muted-ours uppercase">
                  {template.id} · {template.minPhotos}–{template.maxPhotos} photos
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-14 rounded-2xl border border-line bg-background p-6">
        <h2 className="font-serif text-2xl text-ink">
          预览 · {sample.title}
          <span className="ml-2 text-base font-sans text-muted-ours">
            （{selected.name}）
          </span>
        </h2>
        <div className="mt-6">
          <MemoryLayoutRenderer
            memory={previewMemory}
            photos={sample.photos}
            mode="preview"
          />
        </div>
      </div>
    </>
  );
}
