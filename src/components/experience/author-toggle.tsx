"use client";

import { useState, useSyncExternalStore } from "react";
import type { CoupleNames } from "@/features/relationship-profile/couple-names";
import type { WishAuthor } from "@/features/wishes/wish-schema";
import { cn } from "@/lib/utils";

const AUTHOR_STORAGE_KEY = "ours.author";

const subscribeNever = () => () => {};

/** False during SSR/hydration, true afterwards — for viewer-timezone dates. */
export function useIsClient() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

function readStoredAuthor(): WishAuthor | null {
  try {
    const value = window.localStorage.getItem(AUTHOR_STORAGE_KEY);
    return value === "owner" || value === "partner" ? value : null;
  } catch {
    return null;
  }
}

function storeAuthor(author: WishAuthor) {
  try {
    window.localStorage.setItem(AUTHOR_STORAGE_KEY, author);
  } catch {
    // Remembering the author is a convenience only.
  }
}

/** "我是 乖宝/臭宝" choice, remembered per browser; defaults to partner. */
export function useRememberedAuthor() {
  const storedAuthor = useSyncExternalStore(subscribeNever, readStoredAuthor, () => null);
  const [chosenAuthor, setChosenAuthor] = useState<WishAuthor | null>(null);
  const author = chosenAuthor ?? storedAuthor ?? "partner";

  function chooseAuthor(next: WishAuthor) {
    setChosenAuthor(next);
    storeAuthor(next);
  }

  return [author, chooseAuthor] as const;
}

export function authorName(author: WishAuthor, names: CoupleNames) {
  return author === "owner" ? names.owner : names.partner;
}

export function AuthorToggle({
  author,
  names,
  onChange,
}: {
  author: WishAuthor;
  names: CoupleNames;
  onChange: (author: WishAuthor) => void;
}) {
  const options: { value: WishAuthor; label: string }[] = [
    { value: "partner", label: names.partner },
    { value: "owner", label: names.owner },
  ];

  return (
    <div role="radiogroup" aria-label="我是" className="flex items-center gap-1.5 text-xs">
      <span className="mr-1 text-muted-ours">我是</span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={author === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full border px-3 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
            author === option.value
              ? "border-gold bg-gold/15 text-ink"
              : "border-line text-muted-ours hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
